/*
 * Design Replicator — sayfa içi çıkarıcı (isolated world).
 * window.__DR.extractPage(opts)  -> sayfanın bağımsız HTML + CSS anlık görüntüsü
 * window.__DR.summarize()        -> AI için tasarım token'ları + yapısal özet
 * window.__DR.extractPin(opts)   -> Pinterest pin verisi
 */
(() => {
  if (window.__DR) return;
  const DR = (window.__DR = {});

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const abs = (u, base = document.baseURI) => { try { return new URL(u, base).href; } catch { return u; } };
  const KEEP_RAW = /^\s*(#|javascript:|mailto:|tel:|data:|blob:|about:|sms:)/i;
  const absAttr = (v) => (KEEP_RAW.test(v) ? v : abs(v.trim()));
  const URL_RE = /url\(\s*(['"]?)([^'")]+?)\1\s*\)/gi;

  function resolveCss(css, base, onUrl) {
    return css.replace(URL_RE, (m, _q, u) => {
      u = u.trim();
      if (!u || /^(data:|#|about:|blob:|var\()/i.test(u)) return m;
      const a = abs(u, base);
      if (onUrl) onUrl(a);
      return `url("${a}")`;
    });
  }

  async function autoScroll(maxMs) {
    const startY = window.scrollY;
    const step = Math.max(300, window.innerHeight * 0.8);
    const t0 = performance.now();
    const H = () => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
    let y = 0;
    let n = 0;
    while (y < H() && performance.now() - t0 < maxMs && n++ < 60) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await sleep(130);
      y += step;
    }
    window.scrollTo({ top: startY, behavior: 'instant' });
    await sleep(250);
  }

  /* ------------------------------------------------------------------ */
  /* CSS toplama                                                         */
  /* ------------------------------------------------------------------ */
  const mediaText = (s) => {
    const m = s.media && s.media.mediaText;
    return m && m !== 'all' ? m : '';
  };
  const wrapMedia = (css, m) => (m ? `@media ${m} {\n${css}\n}` : css);

  /** Bir stylesheet'i sıralı parçalara çevirir: {css} veya (okunamayan) {ext, media[]}. */
  function sheetItems(sheet, depth = 0) {
    const items = [];
    if (!sheet || sheet.disabled || depth > 8) return items;
    const base = sheet.href || document.baseURI;
    let rules;
    try { rules = sheet.cssRules; } catch {
      if (sheet.href) items.push({ ext: sheet.href, media: mediaText(sheet) ? [mediaText(sheet)] : [] });
      return items;
    }
    let buf = '';
    const flush = () => { if (buf) { items.push({ css: buf }); buf = ''; } };
    for (const r of rules) {
      if (r.type === 3) { // @import
        flush();
        const im = r.media && r.media.mediaText && r.media.mediaText !== 'all' ? r.media.mediaText : '';
        let sub;
        if (r.styleSheet) sub = sheetItems(r.styleSheet, depth + 1);
        else sub = [{ ext: r.href, media: [] }];
        for (const it of sub) {
          if (!im) continue;
          if (it.css !== undefined) it.css = wrapMedia(it.css, im);
          else it.media.push(im);
        }
        items.push(...sub);
      } else {
        buf += resolveCss(r.cssText, base) + '\n';
      }
    }
    flush();
    const m = mediaText(sheet);
    if (m) {
      for (const it of items) {
        if (it.css !== undefined) it.css = wrapMedia(it.css, m);
        else it.media.push(m);
      }
    }
    return items;
  }

  const sheetCssText = (sheet) => sheetItems(sheet).map((i) => i.css || (i.ext ? `@import url("${i.ext}");` : '')).join('\n');

  /* ------------------------------------------------------------------ */
  /* Sayfa klonu                                                         */
  /* ------------------------------------------------------------------ */
  DR.extractPage = async function (opts = {}) {
    const o = { scripts: 'strip', autoScroll: true, cleanOverlays: false, ...opts };
    const keepScripts = o.scripts === 'keep';
    const t0 = performance.now();
    if (o.autoScroll) await autoScroll(7000);

    const doc = document.implementation.createHTMLDocument('');
    const assets = new Set();
    const warnings = [];
    let nodeCount = 0;
    const reg = (u) => { if (/^https?:/i.test(u)) assets.add(u); return u; };
    const OVERLAY_RE = /cookie|consent|gdpr|onetrust|didomi|usercentrics|cc-window|cookiebot|çerez|cerez/i;

    function shouldDrop(el, tag, inShadow) {
      if (tag === 'base') return true;
      if (tag === 'script' || tag === 'noscript' || tag === 'template') return !keepScripts;
      if (tag === 'style') return !inShadow;
      if (tag === 'link') {
        const rel = (el.getAttribute('rel') || '').toLowerCase();
        if (/(^|\s)(icon|shortcut|apple-touch-icon)(\s|$)/.test(rel)) return false;
        if (inShadow && /stylesheet/.test(rel)) return false;
        return true;
      }
      if (tag === 'meta') {
        const he = (el.getAttribute('http-equiv') || '').toLowerCase();
        return he === 'refresh' || he === 'content-security-policy' || he === 'x-frame-options';
      }
      if (/^(grammarly-|chrome-|lastpass|bitwarden)/.test(tag)) return true;
      if (el.hasAttribute('data-dr-ignore')) return true;
      if (o.cleanOverlays && el !== document.body && el !== document.documentElement) {
        const cn = typeof el.className === 'string' ? el.className : '';
        if (OVERLAY_RE.test(el.id || '') || OVERLAY_RE.test(cn)) {
          const pos = getComputedStyle(el).position;
          if (pos === 'fixed' || pos === 'sticky' || pos === 'absolute') return true;
        }
      }
      return false;
    }

    function drawToDataUrl(srcEl, w, h) {
      try {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(srcEl, 0, 0, w, h);
        return c.toDataURL('image/png');
      } catch { return null; }
    }

    function copyPresentation(from, to) {
      for (const a of Array.from(from.attributes)) {
        if (/^(id|class|style|title|role|aria-.*|data-.*)$/i.test(a.name)) to.setAttribute(a.name, a.value);
      }
      const st = to.getAttribute('style');
      if (st) to.setAttribute('style', resolveCss(st, document.baseURI, reg));
    }

    function cloneCanvas(src) {
      const img = doc.createElement('img');
      copyPresentation(src, img);
      let url = null;
      try { url = src.toDataURL('image/png'); } catch { /* tainted */ }
      if (!url) {
        warnings.push('Bir <canvas> dışa aktarılamadı (cross-origin).');
        return doc.importNode(src, false);
      }
      img.setAttribute('src', url);
      if (src.width) img.setAttribute('width', src.width);
      if (src.height) img.setAttribute('height', src.height);
      return img;
    }

    function cloneVideo(src) {
      const cur = src.currentSrc || src.getAttribute('src') || '';
      if (cur.startsWith('blob:') || !cur) {
        const frame = src.videoWidth ? drawToDataUrl(src, src.videoWidth, src.videoHeight) : null;
        const poster = src.poster ? abs(src.poster) : '';
        const img = doc.createElement('img');
        copyPresentation(src, img);
        if (frame) img.setAttribute('src', frame);
        else if (poster) { img.setAttribute('src', poster); reg(poster); }
        else return null;
        warnings.push('Bir <video> (blob/akış) tek kareye dönüştürüldü.');
        return img;
      }
      return null; // normal yoldan klonla
    }

    function fixAttrs(src, el, tag) {
      for (const a of Array.from(el.attributes)) {
        const n = a.name.toLowerCase();
        const v = a.value;
        if (n === 'integrity' || n === 'crossorigin' || n === 'nonce' || n === 'referrerpolicy' || n === 'fetchpriority') {
          el.removeAttribute(a.name);
        } else if (!keepScripts && n.startsWith('on')) {
          el.removeAttribute(a.name);
        } else if (n === 'style') {
          el.setAttribute('style', resolveCss(v, document.baseURI, reg));
        } else if ((n === 'srcset' || n === 'sizes') && (tag === 'img' || tag === 'source')) {
          el.removeAttribute(a.name);
        } else if (['src', 'href', 'poster', 'action', 'formaction', 'data', 'background', 'xlink:href'].includes(n)) {
          const nv = absAttr(v);
          el.setAttribute(a.name, nv);
          const isIcon = tag === 'link';
          if (n === 'poster' || (n === 'src' && (tag === 'img' || tag === 'input')) || (isIcon && n === 'href') || (tag === 'image' && (n === 'href' || n === 'xlink:href'))) reg(nv);
        }
      }
      if (tag === 'img') el.removeAttribute('loading');
    }

    const LAZY_ATTRS = ['data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'data-url'];
    function lazyImgSrc(src) {
      for (const k of LAZY_ATTRS) {
        const v = src.getAttribute(k);
        if (v && !/^\s*$/.test(v)) return v;
      }
      const ss = src.getAttribute('data-srcset') || src.getAttribute('data-lazy-srcset');
      if (ss) {
        const parts = ss.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
        if (parts.length) return parts[parts.length - 1];
      }
      return '';
    }

    function fixImg(src, el) {
      let u = src.currentSrc || src.getAttribute('src') || '';
      const lazy = lazyImgSrc(src);
      const looksPlaceholder = !u || (u.startsWith('data:') && u.length < 400) || (src.complete && src.naturalWidth <= 1);
      if (lazy && looksPlaceholder) u = lazy;
      if (u.startsWith('blob:')) {
        const d = src.naturalWidth ? drawToDataUrl(src, src.naturalWidth, src.naturalHeight) : null;
        u = d || '';
      } else if (u && !u.startsWith('data:')) {
        u = abs(u);
        reg(u);
      }
      if (u) el.setAttribute('src', u);
    }

    function addShadow(src, el) {
      const root = src.shadowRoot;
      if (!root || root.mode !== 'open') return;
      const tpl = doc.createElement('template');
      tpl.setAttribute('shadowrootmode', 'open');
      for (const sheet of root.adoptedStyleSheets || []) {
        const st = doc.createElement('style');
        st.textContent = sheetCssText(sheet);
        tpl.content.appendChild(st);
      }
      for (let n = root.firstChild; n; n = n.nextSibling) {
        const c = cloneNode(n, true);
        if (c) tpl.content.appendChild(c);
      }
      el.insertBefore(tpl, el.firstChild);
    }

    function cloneNode(src, inShadow) {
      if (src.nodeType === 3) return doc.createTextNode(src.nodeValue);
      if (src.nodeType !== 1) return null;
      const tag = src.localName;

      // Shadow DOM içindeki <link rel=stylesheet> -> satır içi <style>
      if (inShadow && tag === 'link' && /stylesheet/i.test(src.getAttribute('rel') || '') && src.sheet) {
        const st = doc.createElement('style');
        st.textContent = sheetCssText(src.sheet);
        return st;
      }
      if (shouldDrop(src, tag, inShadow)) return null;
      nodeCount++;

      if (tag === 'canvas') return cloneCanvas(src);
      if (tag === 'video') { const r = cloneVideo(src); if (r) return r; }

      const el = doc.importNode(src, false);
      fixAttrs(src, el, tag);

      if (tag === 'img') fixImg(src, el);
      else if (tag === 'input') {
        const t = (src.type || '').toLowerCase();
        if (t === 'checkbox' || t === 'radio') {
          if (src.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked');
        } else if (t !== 'password' && t !== 'file') {
          el.setAttribute('value', src.value);
        }
      } else if (tag === 'option') {
        if (src.selected) el.setAttribute('selected', ''); else el.removeAttribute('selected');
      } else if (tag === 'textarea') {
        el.textContent = src.value;
        addShadow(src, el);
        return el;
      } else if (tag === 'style' && inShadow) {
        el.textContent = resolveCss(src.textContent || '', document.baseURI);
        return el;
      } else if (tag === 'template') {
        for (let n = src.content.firstChild; n; n = n.nextSibling) {
          const c = cloneNode(n, inShadow);
          if (c) el.content.appendChild(c);
        }
        return el;
      }

      if (tag !== 'iframe') {
        for (let n = src.firstChild; n; n = n.nextSibling) {
          if (tag === 'picture' && n.localName === 'source') continue;
          const c = cloneNode(n, inShadow);
          if (c) el.appendChild(c);
        }
      }
      addShadow(src, el);
      return el;
    }

    // --- DOM'u klonla
    const htmlEl = cloneNode(document.documentElement, false);
    const head = htmlEl.querySelector('head');
    const body = htmlEl.querySelector('body');
    if (head) {
      if (!head.querySelector('meta[charset]')) {
        const m = doc.createElement('meta');
        m.setAttribute('charset', 'utf-8');
        head.insertBefore(m, head.firstChild);
      }
      head.appendChild(doc.createComment('DC:CSS'));
    }
    if (body) body.appendChild(doc.createComment('DC:JS'));
    const html = '<!DOCTYPE html>\n' + htmlEl.outerHTML;

    // --- CSS'i topla (belge + adopted stylesheets), sıra korunur
    const sheets = [];
    for (const s of document.styleSheets) sheets.push(...sheetItems(s));
    for (const s of document.adoptedStyleSheets || []) sheets.push(...sheetItems(s));

    const de = document.documentElement;
    return {
      ok: true,
      url: location.href,
      title: document.title,
      lang: de.lang || '',
      html,
      sheets,
      assets: [...assets],
      warnings,
      stats: { nodes: nodeCount, ms: Math.round(performance.now() - t0) },
      viewport: {
        w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio,
        scrollW: de.scrollWidth, scrollH: Math.max(de.scrollHeight, document.body ? document.body.scrollHeight : 0),
      },
    };
  };

  /* ------------------------------------------------------------------ */
  /* AI için özet: renk/font token'ları + yapısal anahat                  */
  /* ------------------------------------------------------------------ */
  function toHex(c) {
    const m = c.match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+%?))?\s*\)$/i);
    if (!m) return c;
    let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (a === 0) return null;
    const hx = [m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('');
    return '#' + hx + (a < 1 ? Math.round(a * 255).toString(16).padStart(2, '0') : '');
  }

  DR.summarize = function () {
    const vw = innerWidth, vh = innerHeight;
    const text = new Map(), bg = new Map(), border = new Map(), fonts = new Map();
    const bump = (m, k, w) => { if (k) m.set(k, (m.get(k) || 0) + w); };
    const visible = (el, cs, r) => r.width > 1 && r.height > 1 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';

    const all = Array.from(document.body.querySelectorAll('*')).slice(0, 6000);
    for (const el of all) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (!visible(el, cs, r)) continue;
      let own = '';
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      own = own.trim();
      if (own) {
        bump(text, toHex(cs.color), own.length);
        bump(fonts, `${cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()} / ${cs.fontSize} / ${cs.fontWeight}`, own.length);
      }
      bump(bg, toHex(cs.backgroundColor), Math.min(r.width * r.height, 4e6) / 1000);
      if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') bump(border, toHex(cs.borderTopColor), 5);
    }
    const top = (m, n) => [...m.entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);

    // Anahat (DFS), yalnızca ilk ~1.6 ekranlık bölge
    const lines = [];
    const images = [];
    let bytes = 0;
    const MAX_NODES = 520, MAX_BYTES = 62000;
    const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META', 'BR', 'PATH']);
    const px = (v) => Math.round(parseFloat(v) || 0);

    function walk(el, depth, parentCs) {
      if (lines.length >= MAX_NODES || bytes > MAX_BYTES || depth > 10 || SKIP.has(el.tagName)) return;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (!visible(el, cs, r)) return;
      const y = r.top + scrollY;
      if (y > vh * 1.6 || r.bottom + scrollY < 0) return;

      const tag = el.tagName.toLowerCase();
      let own = '';
      for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
      own = own.replace(/\s+/g, ' ').trim().slice(0, 70);

      const st = [];
      if (!parentCs || cs.color !== parentCs.color) st.push('c:' + toHex(cs.color));
      const bgc = toHex(cs.backgroundColor);
      if (bgc) st.push('bg:' + bgc);
      if (own && (!parentCs || cs.fontSize !== parentCs.fontSize || cs.fontWeight !== parentCs.fontWeight || cs.fontFamily !== parentCs.fontFamily)) {
        st.push(`f:${px(cs.fontSize)}/${cs.lineHeight === 'normal' ? 'n' : px(cs.lineHeight)} ${cs.fontWeight} ${cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()}`);
      }
      if (cs.borderTopLeftRadius !== '0px') st.push('r:' + cs.borderTopLeftRadius);
      if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') st.push(`b:${cs.borderTopWidth} ${toHex(cs.borderTopColor)}`);
      if (cs.boxShadow !== 'none') st.push('sh:' + cs.boxShadow.slice(0, 60));
      if (cs.display === 'flex' || cs.display === 'inline-flex') st.push(`flex ${cs.flexDirection}${cs.gap !== 'normal' ? ' g' + px(cs.gap) : ''} jc:${cs.justifyContent} ai:${cs.alignItems}`);
      else if (cs.display === 'grid') st.push(`grid ${cs.gridTemplateColumns.split(' ').length}col g${px(cs.gap)}`);
      if (cs.position !== 'static') st.push(cs.position);
      const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
      if (pad.some(Boolean)) st.push('p:' + pad.join(' '));

      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      const line = `${'  '.repeat(depth)}<${tag}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}> [${px(r.left + scrollX)},${px(y)},${px(r.width)},${px(r.height)}]${own ? ` "${own}"` : ''}${st.length ? ` {${st.join('; ')}}` : ''}`;
      lines.push(line);
      bytes += line.length;

      if (tag === 'img' && el.currentSrc && /^https?:/.test(el.currentSrc) && images.length < 40) {
        images.push({ url: el.currentSrc, r: [px(r.left + scrollX), px(y), px(r.width), px(r.height)] });
      }
      if (tag === 'svg') return;
      for (const c of el.children) walk(c, depth + 1, cs);
    }
    walk(document.body, 0, null);

    return {
      url: location.href,
      title: document.title,
      viewport: { w: vw, h: vh, dpr: devicePixelRatio, scrollH: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) },
      tokens: { text: top(text, 12), bg: top(bg, 12), border: top(border, 6), fonts: top(fonts, 8) },
      images,
      outline: lines.join('\n'),
    };
  };

  /* ------------------------------------------------------------------ */
  /* Pinterest pin çıkarıcı                                              */
  /* ------------------------------------------------------------------ */
  function readJsonBlobs() {
    const out = [];
    document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"], script#__PWS_DATA__, script#__PWS_INITIAL_PROPS__, script[data-relay-response]').forEach((s) => {
      const t = s.textContent;
      if (!t || t.length < 2) return;
      try { out.push(JSON.parse(t)); } catch { /* geçersiz JSON */ }
    });
    return out;
  }

  function deepFind(root, pred, limit = 250000) {
    const stack = [root];
    const seen = new Set();
    const found = [];
    let n = 0;
    while (stack.length && n++ < limit) {
      const o = stack.pop();
      if (!o || typeof o !== 'object' || seen.has(o)) continue;
      seen.add(o);
      if (!Array.isArray(o) && pred(o)) found.push(o);
      for (const k in o) { const v = o[k]; if (v && typeof v === 'object') stack.push(v); }
    }
    return found;
  }

  const PIN_IMG = /pinimg\.com/;
  const isAvatarUrl = (u) => /\/\d+x\d+(_RS)?\//.test(u) || /\/avatars?\//.test(u);
  const upgradeSize = (u, to) => u.replace(/pinimg\.com\/(?:\d+x(?:\d+)?(?:_RS)?|originals)\//, `pinimg.com/${to}/`);
  const bestFromSrcset = (ss) => {
    if (!ss) return '';
    const parts = ss.split(',').map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
    return parts[parts.length - 1] || '';
  };
  const textOf = (sel) => { const e = document.querySelector(sel); return e ? e.textContent.trim() : ''; };
  const meta = (p) => { const m = document.querySelector(`meta[property="${p}"], meta[name="${p}"]`); return m ? m.content : ''; };

  DR.extractPin = async function (opts = {}) {
    const url = location.href;
    const m = url.match(/\/pin\/(?:[^/]*--)?(\d+)/);
    const pinId = m ? m[1] : '';
    if (!pinId) return { ok: false, error: 'Bu sekme bir Pinterest pin sayfası değil (/pin/<id>).' };

    if (opts.autoScroll !== false) await autoScroll(4500);

    // 1) Gömülü JSON
    const blobs = readJsonBlobs();
    const isPinObj = (o) => o.images && typeof o.images === 'object' && o.id != null && (o.images.orig || o.images['736x'] || o.images['474x'] || o.images['236x']);
    let all = [];
    for (const b of blobs) all.push(...deepFind(b, isPinObj));
    const main = all.find((o) => String(o.id) === pinId) || null;

    const imgOf = (o, k) => (o.images[k] && o.images[k].url) || '';
    const mainCandidates = [];
    let w = 0, h = 0;
    if (main) {
      if (imgOf(main, 'orig')) { mainCandidates.push(imgOf(main, 'orig')); w = main.images.orig.width; h = main.images.orig.height; }
      for (const k of ['736x', '564x', '474x']) if (imgOf(main, k)) { mainCandidates.push(imgOf(main, k)); if (!w) { w = main.images[k].width; h = main.images[k].height; } }
    }

    // 2) DOM yedek
    const imgs = [...document.querySelectorAll('img')].filter((i) => PIN_IMG.test(i.currentSrc || i.src) && !isAvatarUrl(i.currentSrc || i.src));
    const closeup = document.querySelector('[data-test-id="closeup-image"] img, [data-test-id="pin-closeup-image"] img, [data-test-id="visual-content-container"] img');
    const domMain = closeup || imgs.sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight))[0];
    if (domMain) {
      const best = bestFromSrcset(domMain.srcset) || domMain.currentSrc || domMain.src;
      if (best) { mainCandidates.push(upgradeSize(best, 'originals'), upgradeSize(best, '736x'), best); }
      if (!w) { w = domMain.naturalWidth; h = domMain.naturalHeight; }
    }
    const ogImg = meta('og:image');
    if (ogImg) mainCandidates.push(ogImg);
    const cand = [...new Set(mainCandidates.filter(Boolean))];
    if (!cand.length) return { ok: false, error: 'Pin görseli bulunamadı. Sayfanın tamamen yüklendiğinden emin olun.' };

    const pinner = (main && (main.pinner || main.native_creator || main.origin_pinner)) || {};
    const board = (main && main.board) || {};
    const stats = (main && main.aggregated_pin_data && main.aggregated_pin_data.aggregated_stats) || {};
    const reactions = main && main.reaction_counts ? Object.values(main.reaction_counts).reduce((a, b) => a + (+b || 0), 0) : 0;

    const domTitle = textOf('h1') || meta('og:title');
    const domDesc = textOf('[data-test-id="truncated-description"]') || textOf('[data-test-id="description"]') || meta('og:description');
    const domAuthor = textOf('[data-test-id="creator-profile-name"]') || textOf('[data-test-id="pinner-name"]');
    const avatarImg = document.querySelector('[data-test-id="creator-avatar"] img, [data-test-id="pinner-avatar"] img');
    const outLink = document.querySelector('[data-test-id="pin-closeup-link"], a[data-test-id="link-handle"], [data-test-id="closeup-link"] a');

    const pin = {
      id: pinId,
      url: `https://www.pinterest.com/pin/${pinId}/`,
      title: (main && (main.title || main.grid_title || (main.rich_metadata && main.rich_metadata.title))) || domTitle || '',
      description: (main && (main.description || main.closeup_description || '')) || domDesc || '',
      alt: (main && (main.auto_alt_text || main.seo_alt_text || main.alt_text)) || (domMain && domMain.alt) || '',
      link: (main && main.link) || (outLink && outLink.href) || '',
      domain: (main && main.domain) || '',
      color: (main && main.dominant_color) || '',
      w, h,
      saves: +(stats.saves || (main && main.repin_count) || 0),
      likes: reactions,
      commentCount: (main && +main.comment_count) || 0,
      author: {
        name: pinner.full_name || domAuthor || '',
        username: pinner.username || '',
        avatar: pinner.image_medium_url || pinner.image_small_url || pinner.image_large_url || (avatarImg && avatarImg.src) || '',
        followers: +(pinner.follower_count || 0),
      },
      board: { name: board.name || '', url: board.url ? abs(board.url, 'https://www.pinterest.com') : '' },
    };

    // 3) Benzer pinler (JSON + görünen ızgara)
    const relMap = new Map();
    for (const o of all) {
      const id = String(o.id);
      if (id === pinId || relMap.has(id)) continue;
      const img = imgOf(o, '474x') || imgOf(o, '236x') || imgOf(o, '736x');
      if (!img) continue;
      const dim = o.images['474x'] || o.images['236x'] || o.images['736x'] || {};
      relMap.set(id, {
        id, title: o.grid_title || o.title || o.auto_alt_text || '', image: upgradeSize(img, '474x'),
        w: dim.width || 0, h: dim.height || 0, color: o.dominant_color || '', domain: o.domain || '', link: o.link || '',
      });
    }
    document.querySelectorAll('a[href*="/pin/"]').forEach((a) => {
      const mm = a.getAttribute('href').match(/\/pin\/(?:[^/]*--)?(\d+)/);
      if (!mm || mm[1] === pinId) return;
      const img = a.querySelector('img');
      if (!img) return;
      const src = bestFromSrcset(img.srcset) || img.currentSrc || img.src;
      if (!src || !PIN_IMG.test(src) || isAvatarUrl(src)) return;
      const prev = relMap.get(mm[1]);
      if (prev) { if (!prev.title) prev.title = img.alt || ''; return; }
      relMap.set(mm[1], {
        id: mm[1], title: img.alt || '', image: upgradeSize(src, '474x'),
        w: img.naturalWidth || 0, h: img.naturalHeight || 0, color: '', domain: '', link: '',
      });
    });
    const related = [...relMap.values()].slice(0, 60);

    return {
      ok: true,
      pin,
      candidates: cand,
      related,
      lang: document.documentElement.lang || navigator.language || 'en',
      sourceUrl: url,
      foundJson: !!main,
    };
  };
})();
