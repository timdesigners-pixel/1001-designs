import { $, $$, escapeHtml, slugify, blobToDataURL, fetchBlob, pool, downloadBlob, extFromMime, resolveCssUrls, withMedia, fmtBytes } from '../lib/util.js';
import { makeZip } from '../lib/zip.js';
import { extractPalette } from '../lib/palette.js';
import { SYSTEM_PROMPT, prepareImage, buildTabPrompt, buildImagePrompt, pullHtml, streamModel, listModels, PROVIDERS } from '../lib/ai.js';
import { loadSettings, saveSettings, providerConfig } from '../lib/settings.js';
import { createEditor } from '../lib/editor.js';
import { initTheme, resolvedTheme } from '../lib/theme.js';
import { loadLibrary, selectRefs, formatRefs, entryDocument, addUserRef } from '../lib/refs.js';
import { initLibrary } from './library.js';
import { requirePro, openPro } from '../lib/pro.js';
import { initAdapt } from './adapt.js';
import { attachEditorTools } from './editor-tools.js';
let editorTools;

const S = { parts: { html: '', css: '', js: '' }, assetData: new Map(), editor: null, editorP: null, settingParts: false, previewReady: false, job: null, settings: null, mode: null, image: null, result: null, abort: null, busy: false, view: 'preview' };
const PIN_PAGE = /^https?:\/\/([a-z0-9-]+\.)?pinterest\.[a-z.]+\/pin\//i;

/* ------------------------------------------------------------------ */
/* günlük                                                              */
/* ------------------------------------------------------------------ */
function log(msg, cls = '') {
  const li = document.createElement('li');
  if (cls) li.className = cls;
  li.textContent = `${new Date().toLocaleTimeString('tr-TR')}  ${msg}`;
  $('#log').appendChild(li);
  li.scrollIntoView({ block: 'end' });
}

/* ------------------------------------------------------------------ */
/* varlık kayıt defteri                                                */
/* ------------------------------------------------------------------ */
class Assets {
  constructor(maxBytes, maxTotal = 80e6) {
    this.items = [];
    this.byUrl = new Map();
    this.maxBytes = maxBytes;
    this.maxTotal = maxTotal;
    this.total = 0;
    this.skipped = 0;
  }
  addBlob(blob, hint = '') {
    const id = this.items.length + 1;
    const ext = extFromMime(blob.type, hint);
    const it = { id, blob, ext, name: `a${id}.${ext}`, url: hint, marker: `dc-asset://${id}` };
    this.items.push(it);
    this.total += blob.size;
    return it;
  }
  async addUrl(url) {
    if (this.byUrl.has(url)) return this.byUrl.get(url);
    let it = null;
    if (this.total < this.maxTotal) {
      const r = await fetchBlob(url, { maxBytes: this.maxBytes });
      if (r && r.blob) it = this.addBlob(r.blob, url);
      else this.skipped++;
    } else this.skipped++;
    this.byUrl.set(url, it);
    return it;
  }
}

const URL_IN_TEXT = /https?:\/\/(?:(?!&quot;|&#39;)[^\s"'<>()\\])+/g;
/** Metindeki (HTML ya da CSS) mutlak URL'leri kayıtlı varlık işaretçileriyle değiştirir. */
function rewriteUrls(text, assets) {
  return text.replace(URL_IN_TEXT, (m) => {
    const it = assets.byUrl.get(m.replace(/&amp;/g, '&'));
    return it ? it.marker : m;
  });
}
const MARK = /dc-asset:\/\/(\d+)/g;
const toPaths = (text, assets) => text.replace(MARK, (m, id) => 'assets/' + (assets.items[id - 1]?.name || m));
async function toDataUris(text, assets) {
  const ids = new Set([...text.matchAll(MARK)].map((m) => +m[1]));
  const map = new Map();
  for (const id of ids) map.set(id, await blobToDataURL(assets.items[id - 1].blob));
  return text.replace(MARK, (m, id) => map.get(+id) || m);
}

/* ------------------------------------------------------------------ */
/* sayfaya erişim                                                      */
/* ------------------------------------------------------------------ */
async function inject(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content/page-extract.js'] });
  } catch (e) {
    throw new Error('Bu sekmeye erişilemiyor (chrome:// ve mağaza sayfaları desteklenmez, sekme kapanmış olabilir): ' + (e.message || e));
  }
}
async function callPage(tabId, fn, arg) {
  const res = await chrome.scripting.executeScript({ target: { tabId }, func: (f, a) => window.__DR[f](a), args: [fn, arg ?? null] });
  return res && res[0] ? res[0].result : null;
}

/* ------------------------------------------------------------------ */
/* şablonlar                                                           */
/* ------------------------------------------------------------------ */
const tplCache = {};
const tpl = async (f) => (tplCache[f] ||= await (await fetch('../templates/' + f)).text());
const safeJson = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

async function fillPin(data) {
  const [html, css, js] = await Promise.all([tpl('pin.html'), tpl('pin.css'), tpl('pin.js')]);
  const title = escapeHtml(data.pin.title || 'Pin');
  return html
    .replace(/\{\{LANG\}\}/g, () => (/^tr/i.test(data.lang || '') ? 'tr' : 'en'))
    .replace(/\{\{TITLE\}\}/g, () => title)
    .replace('{{CSS}}', () => css)
    .replace('{{JS}}', () => js.replace(/<\/script/gi, '<\\/script'))
    .replace('{{DATA}}', () => safeJson(data));
}

/* ------------------------------------------------------------------ */
/* modlar                                                              */
/* ------------------------------------------------------------------ */
function opts() {
  const s = S.settings;
  return {
    inline: $('#o-inline').checked,
    keep: $('#o-keep').checked,
    overlay: $('#o-overlay').checked,
    maxBytes: Math.max(0.5, s.maxAssetMB) * 1e6,
  };
}

const upgradePin = (u, to) => u.replace(/pinimg\.com\/(?:\d+x(?:\d+)?(?:_RS)?|originals)\//, `pinimg.com/${to}/`);

/** Aday URL'lerden ilk gerçek görseli indirir. */
async function firstImage(cands) {
  for (const u of cands) {
    const r = await fetchBlob(u, { maxBytes: 30e6 });
    if (r && r.blob && r.blob.type.startsWith('image/')) return { blob: r.blob, url: u };
  }
  return null;
}
const fileName = (u) => { try { return decodeURIComponent(new URL(u).pathname.split('/').filter(Boolean).pop() || 'gorsel'); } catch { return 'gorsel'; } };

/** Pinterest pin sayfası ya da doğrudan görsel URL'si -> { blob, name, meta } */
async function imageFromUrl(url) {
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Geçerli bir http(s) adresi girin.');
  log('Adres getiriliyor…');
  const r = await fetchBlob(url, { maxBytes: 30e6 });
  if (!r || !r.blob) throw new Error('Adres alınamadı (erişim engeli, zaman aşımı veya boyut sınırı).');
  if (r.blob.type.startsWith('image/')) return { blob: r.blob, name: fileName(url), meta: {} };

  const text = await r.blob.text();
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const meta = (n) => (doc.querySelector(`meta[property="${n}"], meta[name="${n}"]`) || {}).content || '';
  const cands = [];
  const og = meta('og:image') || meta('twitter:image') || meta('twitter:image:src');
  if (og) { if (/pinimg\.com/.test(og)) cands.push(upgradePin(og, 'originals'), upgradePin(og, '736x')); cands.push(og); }
  if (!cands.length) {
    for (const m of text.matchAll(/"orig"\s*:\s*\{[^}]*?"url"\s*:\s*"([^"]+)"/g)) cands.push(m[1].replace(/\u002F/gi, '/').replace(/\\//g, '/'));
    for (const m of text.matchAll(/https?:\/\/i\.pinimg\.com\/(?:originals|736x)\/[^"'\s\)]+/g)) cands.push(m[0]);
  }
  if (!cands.length) throw new Error('Bu sayfada görsel bulunamadı. Doğrudan görsel adresi deneyin.');
  const got = await firstImage([...new Set(cands)]);
  if (!got) throw new Error('Sayfadaki görsel indirilemedi.');
  log(`Görsel bulundu: ${got.url}`, 'ok');
  return { blob: got.blob, name: fileName(got.url), meta: { title: meta('og:title'), description: meta('og:description') } };
}

/** Açık Pinterest sekmesinden pin görseli + metin bilgisi */
async function imageFromPinTab() {
  const tabId = S.job.tabId;
  log('Pin sekmesi okunuyor…');
  await inject(tabId);
  const raw = await callPage(tabId, 'extractPin', { autoScroll: false });
  if (!raw || !raw.ok) throw new Error((raw && raw.error) || 'Pin okunamadı');
  const got = await firstImage(raw.candidates);
  if (!got) throw new Error('Pin görseli indirilemedi.');
  log(`Pin ${raw.pin.id} görseli alındı (${fmtBytes(got.blob.size)}).`, 'ok');
  return { blob: got.blob, name: 'pin-' + raw.pin.id, meta: { title: raw.pin.title, description: raw.pin.description } };
}

/** Pin / URL / yüklenen görsel -> görseldeki tasarımın HTML dökümü (AI) */
async function runPinDesign() {
  aiConfig(); // anahtar/model eksikse en baştan hata ver
  const typed = $('#img-url').value.trim();
  if (!S.image) {
    const onPin = S.job && S.job.tabId != null && PIN_PAGE.test(S.job.url || '');
    const src = typed ? await imageFromUrl(typed) : onPin ? await imageFromPinTab() : null;
    if (!src) throw new Error('Pinterest pin URL\'si veya görsel adresi girin (ya da görsel yükleyin).');
    setImage(src.blob, src.name, src.meta);
  }
  return runAI('image-ai');
}

async function runImagePin() {
  const o = opts();
  const blob = S.image.blob;
  log('Renk paleti çıkarılıyor…');
  const pal = await extractPalette(blob, 8);
  const A = new Assets(Math.max(o.maxBytes, blob.size + 1));
  const it = A.addBlob(blob, S.image.name);
  const title = (S.image.name || 'Tasarım').replace(/\.[a-z0-9]+$/i, '');
  const data = {
    lang: 'tr', siteName: 'Pinterest',
    pin: { id: 'img', title, description: '', image: { url: it.marker, w: pal.width, h: pal.height }, color: pal.dominant, author: { name: '', username: '' }, board: { name: '' } },
    comments: [], related: [], palette: pal.colors,
  };
  log(`Baskın renk ${pal.dominant}; ${pal.colors.length} renk çıkarıldı.`, 'ok');
  return { html: await fillPin(data), assets: A, name: slugify(title, 'pin'), keepScripts: false };
}

async function fetchSheetText(href, depth = 0) {
  const r = await fetchBlob(href, { maxBytes: 3e6 });
  if (!r || !r.blob) return `/* okunamadı: ${href} */`;
  let css = resolveCssUrls(await r.blob.text(), href);
  if (depth < 4) {
    const re = /@import\s+(?:url\(\s*["']?([^"')]+)["']?\s*\)|["']([^"']+)["'])\s*([^;]*);/gi;
    const parts = [];
    let last = 0, m;
    while ((m = re.exec(css))) {
      let sub = '';
      try { sub = await fetchSheetText(new URL(m[1] || m[2], href).href, depth + 1); } catch { /* geç */ }
      parts.push(css.slice(last, m.index), withMedia(sub, (m[3] || '').trim()));
      last = m.index + m[0].length;
    }
    parts.push(css.slice(last));
    css = parts.join('');
  }
  return css;
}

async function runClone() {
  const o = opts();
  const s = S.settings;
  const tabId = S.job.tabId;
  log('Sayfa yakalanıyor (kaydırma + DOM + CSSOM)…');
  await inject(tabId);
  const raw = await callPage(tabId, 'extractPage', { scripts: o.keep ? 'keep' : 'strip', autoScroll: s.autoScroll, cleanOverlays: o.overlay });
  if (!raw || !raw.ok) throw new Error('Sayfa okunamadı');
  log(`${raw.stats.nodes} düğüm, ${raw.sheets.length} stil parçası, ${raw.assets.length} görsel (${raw.stats.ms} ms).`, 'ok');
  raw.warnings.forEach((w) => log(w, 'warn'));

  let css = '';
  const ext = raw.sheets.filter((x) => x.ext);
  if (ext.length) log(`${ext.length} harici stil dosyası indiriliyor…`);
  for (const it of raw.sheets) {
    if (it.css !== undefined) css += it.css + '\n';
    else if (it.ext) {
      let text = await fetchSheetText(it.ext);
      for (const m of it.media || []) text = withMedia(text, m);
      css += text + '\n';
    }
  }

  const A = new Assets(o.maxBytes);
  let html = raw.html;
  if (o.inline) {
    const urls = new Set(raw.assets);
    for (const m of css.matchAll(/url\(\s*["']?(https?:\/\/[^"')\s]+)/gi)) urls.add(m[1]);
    log(`${urls.size} varlık (görsel/font) gömülüyor…`);
    await pool([...urls], 8, (u) => A.addUrl(u));
    css = rewriteUrls(css, A);
    html = rewriteUrls(html, A);
    log(`${A.items.length} varlık gömüldü (${fmtBytes(A.total)})${A.skipped ? `, ${A.skipped} atlandı` : ''}.`, A.skipped ? 'warn' : 'ok');
  }

  css = css.replace(/<\/style/gi, '<\\/style');
  html = html.replace('<!--DC:CSS-->', () => `<style id="dr-styles">\n${css}\n</style>`);
  const inter = o.keep ? '' : `<script id="dr-interactions">\n${await tpl('clone-interactions.js')}\n</script>`;
  html = html.replace('<!--DC:JS-->', () => inter);

  let host = '';
  try { host = new URL(raw.url).hostname; } catch { /* boş */ }
  return { html, assets: A, name: slugify(raw.title || host, 'sayfa'), keepScripts: o.keep };
}

/* ---------- yapay zekâ ---------- */
function aiConfig() {
  const cfg = providerConfig(S.settings);
  if (PROVIDERS[cfg.provider].needsKey && !cfg.apiKey) throw new Error(`${PROVIDERS[cfg.provider].label} için API anahtarı yok. Ayarlar sayfasından girin ya da başka bir sağlayıcı / yerel model seçin.`);
  if (!cfg.model && cfg.provider !== 'lmstudio') throw new Error('Bir model adı girin.');
  return cfg;
}

async function inlineExternal(html, A, maxBytes) {
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|poster)=["'](https?:\/\/[^"']+)["']|url\(\s*["']?(https?:\/\/[^"')\s]+)/gi)) urls.add(m[1] || m[2]);
  if (!urls.size) return html;
  log(`AI çıktısındaki ${urls.size} dış görsel gömülüyor…`);
  await pool([...urls], 8, (u) => A.addUrl(u));
  return rewriteUrls(html, A);
}

async function runAI(kind) {
  await requirePro();
  const cfg = aiConfig();
  const o = opts();
  const content = [];
  let prompt, name = 'tasarim';
  let refQuery = '';
  let refColors = [];

  if (kind === 'tab-ai') {
    const tabId = S.job.tabId;
    log('Sayfa özeti (renk/font token\'ları + yapı) çıkarılıyor…');
    await inject(tabId);
    const sum = await callPage(tabId, 'summarize');
    if (!sum) throw new Error('Sayfa özeti alınamadı');
    let hasImg = false;
    if (S.job.screenshot) {
      const blob = await (await fetch(S.job.screenshot)).blob();
      const p = await prepareImage(blob);
      content.push({ type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.base64 } });
      hasImg = true;
    } else log('Ekran görüntüsü yok; yalnızca yapısal özetten çalışılacak.', 'warn');
    prompt = buildTabPrompt(sum, hasImg);
    refQuery = `${sum.title} ${sum.outline.slice(0, 6000)}`;
    refColors = [...sum.tokens.bg, ...sum.tokens.text].filter((c) => /^#[0-9a-f]{6}$/i.test(c));
    try { name = slugify(new URL(sum.url).hostname, 'sayfa'); } catch { /* varsayılan */ }
  } else {
    const blob = S.image.blob;
    const p = await prepareImage(blob);
    const pal = await extractPalette(blob, 8).catch(() => null);
    content.push({ type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.base64 } });
    refQuery = [S.image.meta && S.image.meta.title, S.image.meta && S.image.meta.description, $('#note').value, S.image.name].filter(Boolean).join(' ');
    refColors = (pal && pal.colors ? pal.colors.map((c) => c.hex) : []);
    prompt = buildImagePrompt({ width: p.origin.width, height: p.origin.height, palette: pal && pal.colors, note: [S.image.meta && S.image.meta.title ? `Pin title: ${S.image.meta.title}` : '', S.image.meta && S.image.meta.description ? `Pin description: ${S.image.meta.description}` : '', $('#note').value.trim()].filter(Boolean).join(' | ') });
    name = slugify((S.image.name || '').replace(/\.[a-z0-9]+$/i, ''), 'tasarim');
  }
  if ($('#o-refs').checked) {
    try {
      const lib = await loadLibrary({ includeUser: S.settings.refs.includeUser });
      const sel = selectRefs(lib, { text: refQuery, colors: refColors, k: S.settings.refs.count, maxChars: S.settings.refs.maxChars, pinned: S.settings.refs.pinned });
      if (sel.length) { prompt += '\n\n' + formatRefs(sel); log(`Referans kütüphanesinden ${sel.length} örnek eklendi: ${sel.map((e) => e.category).join(', ')}`); }
    } catch (e) { log('Referans kütüphanesi yüklenemedi: ' + (e.message || e), 'warn'); }
  }
  content.push({ type: 'text', text: prompt });

  log(`${PROVIDERS[cfg.provider].label} · ${cfg.model || '(yüklü model)'} — üretim başladı…`);
  S.abort = new AbortController();
  const ed = await ensureEditor().catch((e) => { log('Editör yüklenemedi: ' + (e.message || e), 'warn'); return null; });
  setView('code');
  if (ed) { S.settingParts = true; ed.setParts({ html: '', css: '', js: '' }); ed.show('html'); ed.setReadOnly(true); S.settingParts = false; setFileTab('html'); }
  let last = 0;
  const res = await streamModel(cfg, {
    system: SYSTEM_PROMPT, content, signal: S.abort.signal,
    onText: (_c, total) => {
      const now = performance.now();
      if (ed && now - last > 250) { last = now; S.settingParts = true; ed.setStreamText(pullHtml(total)); S.settingParts = false; }
    },
  });
  if (res.usage && (res.usage.output_tokens || res.usage.input_tokens)) log(`Token: girdi ${res.usage.input_tokens ?? '?'} / çıktı ${res.usage.output_tokens ?? '?'}`);
  if (res.stopReason === 'max_tokens') log('Çıktı token sınırında kesildi; Ayarlar → "Maks. çıktı token" değerini artırın.', 'warn');

  let html = pullHtml(res.text);
  if (!/<html|<body|<div|<main/i.test(html)) throw new Error('Modelden geçerli bir HTML alınamadı. Yanıtın başı: ' + res.text.slice(0, 160));
  if (!/<meta[^>]+charset/i.test(html)) html = html.replace(/<head[^>]*>/i, (m) => m + '\n<meta charset="utf-8">');
  const A = new Assets(o.maxBytes);
  if (o.inline) html = await inlineExternal(html, A, o.maxBytes);
  return { html, assets: A, name, keepScripts: false, ai: true };
}

/* ------------------------------------------------------------------ */
/* sonuç: bölme / önizleme / indirme                                   */
/* ------------------------------------------------------------------ */
function splitParts(html, { splitJs = true } = {}) {
  const shadow = /shadowrootmode/i.test(html);
  const css = [];
  const js = [];
  let out = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (m, attrs, body) => {
    if (shadow && !/id=["']dr-styles["']/.test(attrs)) return m;
    css.push(body.trim());
    return css.length === 1 ? '<link rel="stylesheet" href="style.css">' : '';
  });
  const canSplitJs = splitJs && !shadow && !/<script\b[^>]*\bsrc=/i.test(out);
  if (canSplitJs) {
    out = out.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => {
      const tm = attrs.match(/type\s*=\s*["']?([^"'\s>]+)/i);
      if (tm && !/^(text|application)\/javascript$/i.test(tm[1])) return m;
      if (!body.trim()) return m;
      js.push(body.trim());
      return '';
    });
    if (js.length) out = /<\/body>/i.test(out) ? out.replace(/<\/body>/i, () => '<script src="script.js"></script>\n</body>') : out + '\n<script src="script.js"></script>';
  }
  return { html: out, css: css.join('\n\n'), js: js.join('\n\n;\n\n') };
}

const getParts = (r) => splitParts(toPaths(r.html, r.assets), { splitJs: !r.keepScripts });

/* ---- düzenlenebilir parçalardan tek dosya / ZIP ---- */
const LINK_RE = /<link\b[^>]*href=["']style\.css["'][^>]*>/i;
const SCRIPT_RE = /<script\b[^>]*src=["']script\.js["'][^>]*>\s*<\/script>/i;
const escCssEnd = (t) => t.replace(/<\/style/gi, '<\\/style');
const escJsEnd = (t) => t.replace(/<\/script/gi, '<\\/script');
const withData = (t) => t.replace(/assets\/(a\d+\.[a-z0-9]+)/gi, (m, n) => S.assetData.get(n) || m);

/** CSS/JS dolu ama HTML'de bağlantı etiketi yoksa ekler. */
function ensureRefs(p) {
  let html = p.html;
  if (p.css.trim() && !LINK_RE.test(html)) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => '<link rel="stylesheet" href="style.css">\n</head>') : '<link rel="stylesheet" href="style.css">\n' + html;
  if (p.js.trim() && !SCRIPT_RE.test(html)) html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => '<script src="script.js"></script>\n</body>') : html + '\n<script src="script.js"></script>';
  return html;
}
function composeSingle(p) {
  let html = ensureRefs(p);
  html = html.replace(LINK_RE, () => `<style id="dr-css">\n${escCssEnd(withData(p.css))}\n</style>`);
  html = html.replace(SCRIPT_RE, () => `<script>\n${escJsEnd(p.js)}\n</script>`);
  return withData(html);
}
const syncParts = () => { if (S.editor) S.parts = S.editor.getParts(); return S.parts; };

function preview() {
  const html = composeSingle(syncParts());
  $('#empty').hidden = true;
  $('#frame-wrap').hidden = false;
  pendingHtml = html;
  S.previewReady = false;
  $('#frame').src = '../sandbox/preview.html?' + Date.now();
  const note = $('#preview-note');
  note.hidden = !(S.result && S.result.keepScripts);
  note.textContent = "Önizlemede uzak script'ler engellenebilir; indirilen dosya normal tarayıcıda çalışır.";
}
/** Yalnızca CSS değiştiyse sayfayı yeniden yüklemeden (JS durumunu koruyarak) uygular. */
function hotCss() {
  if (!S.previewReady) return preview();
  $('#frame').contentWindow.postMessage({ type: 'css', css: withData(syncParts().css) }, '*');
}
let pendingHtml = null;
window.addEventListener('message', (e) => {
  if (e.source !== $('#frame').contentWindow || !e.data) return;
  if (e.data.type === 'ready' && pendingHtml != null) { e.source.postMessage({ type: 'render', html: pendingHtml }, '*'); S.previewReady = true; }
  if (e.data.type === 'css-miss') preview();
});

/* ---- editör ---- */
function ensureEditor() {
  if (S.editor) return Promise.resolve(S.editor);
  S.editorP ||= createEditor($('#editor'), { onChange, onApply, onMarkers, onCursor, onProblems: problems => editorTools?.setProblems(problems), onFile: setFileTab }, { dark: resolvedTheme() === 'dark' }).then(async (ed) => {
    S.editor = ed;
    editorTools = await attachEditorTools(ed, { log });
    const l = $('#ed-loading'); if (l) l.remove();
    return ed;
  });
  return S.editorP;
}
let applyTimer;
function onChange(file) {
  if (S.settingParts || !S.editor) return;
  S.parts[file] = S.editor.getPart(file);
  if (!$('#ed-auto').checked) return;
  clearTimeout(applyTimer);
  applyTimer = setTimeout(() => (file === 'css' ? hotCss() : preview()), 600);
}
function onApply() { clearTimeout(applyTimer); if (S.result) { preview(); log('Önizleme güncellendi.', 'ok'); } }
function onMarkers(counts, cur) {
  $$('#files button').forEach((b) => {
    const n = counts[b.dataset.f] || 0;
    const badge = b.querySelector('.badge');
    badge.hidden = !n;
    badge.textContent = n;
  });
  const n = counts[cur] || 0;
  const st = $('#st-err');
  st.textContent = `${n} hata`;
  st.classList.toggle('bad', n > 0);
}
function onCursor(p) { $('#st-pos').textContent = `Satır ${p.lineNumber}, Sütun ${p.column}`; }
function setFileTab(f) {
  $$('#files button').forEach((b) => b.classList.toggle('on', b.dataset.f === f));
  $('#st-lang').textContent = f === 'js' ? 'javascript' : f;
}

function renderAssets(r) {
  const box = $('#v-assets');
  box.replaceChildren();
  if (!r.assets.items.length) { box.textContent = 'Gömülü varlık yok.'; return; }
  for (const it of r.assets.items) {
    const d = document.createElement('div');
    d.className = 'asset';
    const th = document.createElement('div');
    th.className = 'thumb';
    if (it.blob.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(it.blob);
      th.appendChild(img);
    } else th.textContent = it.ext.toUpperCase();
    const cap = document.createElement('div');
    cap.textContent = `assets/${it.name} · ${fmtBytes(it.blob.size)}`;
    d.append(th, cap);
    box.appendChild(d);
  }
}

async function setResult(r) {
  S.result = r;
  S.parts = getParts(r);
  S.assetData = new Map();
  for (const it of r.assets.items) S.assetData.set(it.name, await blobToDataURL(it.blob));
  const ed = await ensureEditor().catch((e) => { log('Editör yüklenemedi: ' + (e.message || e), 'err'); return null; });
  if (ed) {
    S.settingParts = true;
    ed.setReadOnly(false);
    ed.setParts(S.parts);
    S.settingParts = false;
    ed.show('html');
    setFileTab('html');
  }
  renderAssets(r);
  ['copy', 'dl-html', 'dl-zip', 'save-ref'].forEach((id) => ($('#' + id).disabled = false));
  preview();
  setView(r.ai ? 'split' : 'preview');
  log(`Hazır — tek dosya ${fmtBytes(new Blob([composeSingle(S.parts)]).size)}, ${r.assets.items.length} varlık.`, 'ok');
}

function setView(v) {
  S.view = v;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
  $('#v-preview').hidden = !(v === 'preview' || v === 'split');
  $('#v-code').hidden = !(v === 'code' || v === 'split');
  $('#v-assets').hidden = v !== 'assets';
  $('#v-library').hidden = v !== 'library';
  if (v === 'library') openLibrary();
  if (!$('#v-code').hidden) ensureEditor().then((ed) => ed.layout()).catch(() => {});
}

function downloadHtml() {
  downloadBlob(new Blob([composeSingle(syncParts())], { type: 'text/html' }), `${S.result.name}.html`);
}
async function downloadZip() {
  try { await requirePro(); } catch(e) { log(e.message, 'warn'); openPro(); return; }
  const r = S.result;
  const enc = new TextEncoder();
  const p = syncParts();
  const files = [{ name: 'index.html', data: enc.encode(ensureRefs(p)) }];
  if (p.css.trim()) files.push({ name: 'style.css', data: enc.encode(p.css) });
  if (p.js.trim()) files.push({ name: 'script.js', data: enc.encode(p.js) });
  for (const it of r.assets.items) files.push({ name: 'assets/' + it.name, data: new Uint8Array(await it.blob.arrayBuffer()) });
  downloadBlob(makeZip(files), `${r.name}.zip`);
}

/* ---- referans kütüphanesi ---- */
let libP;
let adaptEntry;
function openLibrary() {
  libP ||= initLibrary({
    onAdapt: (entry) => adaptEntry(entry),
    onOpen: async (e) => {
      const html = entryDocument(e, { page: true });
      await setResult({ html, assets: new Assets(0), name: slugify(e.id + '-' + e.category), keepScripts: false, ai: false });
      setView('split');
      log(`Kütüphaneden açıldı: ${e.name}`, 'ok');
    },
    getPinned: () => S.settings.refs.pinned,
    togglePin: (id) => {
      const p = new Set(S.settings.refs.pinned);
      if (p.has(id)) p.delete(id); else p.add(id);
      S.settings.refs.pinned = [...p];
      saveSettings(S.settings);
      return S.settings.refs.pinned;
    },
    onCopy: async (e) => { await navigator.clipboard.writeText(entryDocument(e)); log('Bileşen panoya kopyalandı.', 'ok'); },
  }).then((r) => { log(`Kütüphane hazır: ${r.size} bileşen.`); return r; }).catch((e) => { libP = null; log('Kütüphane yüklenemedi: ' + (e.message || e), 'err'); });
  return libP;
}

/** Geçerli sonucu kullanıcı kütüphanesine referans olarak ekler. */
async function saveAsRef() {
  const p = syncParts();
  const cat = (prompt('Kategori (ör. hero, navbar, card, form):', 'custom') || '').trim();
  if (!cat) return;
  const name = (prompt('Bileşen adı:', S.result ? S.result.name : 'Özel bileşen') || '').trim();
  if (!name) return;
  const body = (p.html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, p.html])[1]
    .replace(/<link\b[^>]*href=["']style\.css["'][^>]*>/gi, '').replace(/<script\b[^>]*src=["']script\.js["'][^>]*>\s*<\/script>/gi, '').trim();
  try {
    const e = await addUserRef({ category: cat, name, html: body, css: p.css, js: p.js, description: `${name} (user-saved ${cat} component)`, tags: [cat, 'user'] });
    log(`Referansa eklendi: ${e.name} — AI isteklerinde ilgili olduğunda kullanılır.`, 'ok');
    if (libP) libP.then((r) => r && r.reload && r.reload()).catch(() => {});
  } catch (err) { log(err.message || String(err), 'err'); }
}

/* ------------------------------------------------------------------ */
/* çalıştırma                                                          */
/* ------------------------------------------------------------------ */
function setBusy(b) {
  S.busy = b;
  $('#run').disabled = b;
  $('#stop').hidden = !b;
  $('#run').textContent = b ? 'Üretiliyor…' : 'Oluştur';
}

async function run() {
  if (S.busy) return;
  setBusy(true);
  try {
    const m = S.mode;
    let r;
    if (m === 'pin') r = await runPinDesign();
    else if (m === 'tab') r = await runClone();
    else if (m === 'tab-ai') r = await runAI('tab-ai');
    else if (m === 'image') r = await runImagePin();
    
    await setResult(r);
  } catch (e) {
    if (e.name === 'AbortError') log('Durduruldu.', 'warn');
    else { log(e.message || String(e), 'err'); console.error(e); }
  } finally {
    S.abort = null;
    if (S.editor) S.editor.setReadOnly(false);
    setBusy(false);
  }
}

/* ------------------------------------------------------------------ */
/* arayüz                                                              */
/* ------------------------------------------------------------------ */
const AI_MODES = new Set(['tab-ai', 'pin']);
function applyModeUI() {
  const m = S.mode;
  const hasTab = S.job && S.job.tabId != null;
  const isPin = hasTab && PIN_PAGE.test(S.job.url || '');
  $$('#modes label').forEach((l) => {
    const k = l.dataset.m;
    const off = (k === 'tab' || k === 'tab-ai') && !hasTab;
    l.classList.toggle('off', off);
    l.querySelector('input').checked = k === m;
  });
  const imgMode = m === 'pin' || m === 'image';
  $('#img-section').hidden = !imgMode;
  $('#use-shot').hidden = !(S.job && S.job.screenshot);
  $('#note-wrap').hidden = m !== 'pin';
  $('#pin-hint').hidden = !(m === 'pin' && isPin);
  $('#o-scripts-wrap').hidden = m !== 'tab';
  $('#o-overlay-wrap').hidden = m !== 'tab';
  $('#o-model-wrap').hidden = !AI_MODES.has(m);
  $('#o-refs-wrap').hidden = !AI_MODES.has(m);
  $('#o-model-name-wrap').hidden = !AI_MODES.has(m);
  $('#run').disabled = S.busy || (m === 'image' && !S.image);
}

function setImage(blob, name = 'gorsel', meta = {}) {
  if (!blob || !blob.type.startsWith('image/')) { log('Bu bir görsel dosyası değil.', 'err'); return; }
  S.image = { blob, name, meta };
  const img = $('#drop-preview');
  if (img.src) URL.revokeObjectURL(img.src);
  img.src = URL.createObjectURL(blob);
  img.hidden = false;
  $('#drop-text').hidden = true;
  log(`Görsel hazır: ${name} (${fmtBytes(blob.size)})`, 'ok');
  applyModeUI();
}

async function refreshModels() {
  const p = $('#o-provider').value;
  const dl = $('#model-list');
  dl.replaceChildren();
  let names = [];
  try {
    if (p === 'claude') names = ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1', 'claude-haiku-5-5'];
    else if (p === 'openai' && !S.settings.openai.apiKey) names = ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini'];
    else if (p === 'gemini' && !S.settings.gemini.apiKey) names = ['gemini-2.5-pro', 'gemini-2.5-flash'];
    else names = await listModels(p, S.settings[p].baseUrl, S.settings[p].apiKey);
  } catch { log(`${PROVIDERS[p].label} sunucusuna ulaşılamadı (${S.settings[p].baseUrl}).`, 'warn'); }
  dl.replaceChildren(...names.map((n) => Object.assign(document.createElement('option'), { value: n })));
  if (!$('#o-model').value && names[0]) $('#o-model').value = names[0];
}

function syncProviderUI() {
  const p = S.settings.provider;
  $('#o-provider').value = p;
  $('#o-model').value = S.settings[p].model || '';
}

async function init() {
  await initTheme($('#theme-btn'), (t) => { if (S.editor) S.editor.setDark(t === 'dark'); });
  S.settings = await loadSettings();
  $('#open-pro').addEventListener('click', openPro);
  adaptEntry = initAdapt({
    getDocument: () => S.result ? composeSingle(syncParts()) : '',
    applyDocument: html => setResult({ html, assets: new Assets(0), name: S.result?.name || 'uyarlama', keepScripts: false, ai: false }),
    log, isBusy: () => S.busy
  });
  const id = new URLSearchParams(location.search).get('job');
  if (id) {
    const got = await chrome.storage.session.get('job:' + id).catch(() => ({}));
    S.job = got['job:' + id] || null;
    chrome.storage.session.remove('job:' + id).catch(() => {});
  }
  $('#o-inline').checked = S.settings.inlineAssets;
  $('#o-refs').checked = S.settings.refs.enabled;
  $('#o-refs').addEventListener('change', () => { S.settings.refs.enabled = $('#o-refs').checked; saveSettings(S.settings); });
  $('#save-ref').addEventListener('click', saveAsRef);
  $('#o-keep').checked = S.settings.scripts === 'keep';
  syncProviderUI();

  const j = S.job;
  $('#source').textContent = j && j.url ? `Kaynak: ${j.title || ''} — ${j.url}` : 'Kaynak: görsel';
  S.mode = (j && j.mode) || 'image';
  if (S.mode === 'auto') S.mode = 'tab';

  // olaylar
  $('#modes').addEventListener('change', (e) => { S.mode = e.target.value; applyModeUI(); });
  $('#run').addEventListener('click', run);
  $('#stop').addEventListener('click', () => S.abort && S.abort.abort());
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });
  $('#devices').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#devices button').forEach((x) => x.classList.toggle('on', x === b));
    $('#frame').style.width = +b.dataset.w ? b.dataset.w + 'px' : '100%';
  });
  $('#dl-html').addEventListener('click', downloadHtml);
  $('#dl-zip').addEventListener('click', downloadZip);
  $('#copy').addEventListener('click', async () => {
    const f = S.editor ? S.editor.current : 'html';
    const text = S.editor ? S.editor.getPart(f) : syncParts()[f];
    await navigator.clipboard.writeText(text);
    log(`${f.toUpperCase()} panoya kopyalandı.`, 'ok');
  });
  $('#files').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const ed = await ensureEditor();
    ed.show(b.dataset.f); setFileTab(b.dataset.f);
  });
  $('#ed-apply').addEventListener('click', onApply);
  $('#ed-format').addEventListener('click', async () => { const ed = await ensureEditor(); await ed.format(); });
  $('#ed-wrap').addEventListener('click', async () => { const ed = await ensureEditor(); log(ed.toggleWrap() ? 'Satır kaydırma açık.' : 'Satır kaydırma kapalı.'); });
  $('#ed-plus').addEventListener('click', async () => (await ensureEditor()).zoom(1));
  $('#ed-minus').addEventListener('click', async () => (await ensureEditor()).zoom(-1));
  $('#open-opts').addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

  $('#o-provider').addEventListener('change', async () => {
    S.settings.provider = $('#o-provider').value;
    syncProviderUI();
    await saveSettings(S.settings);
    refreshModels();
  });
  $('#o-model').addEventListener('change', async () => {
    S.settings[S.settings.provider].model = $('#o-model').value.trim();
    await saveSettings(S.settings);
  });
  refreshModels();

  // görsel kaynakları
  const drop = $('#drop');
  drop.addEventListener('click', () => $('#file').click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } });
  $('#file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) setImage(f, f.name); });
  ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setImage(f, f.name); });
  document.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) { setImage(f, f.name || 'yapistirilan'); if (!/^image/.test(S.mode)) { S.mode = 'image'; applyModeUI(); } }
  });
  $('#img-url-go').addEventListener('click', async () => {
    const u = $('#img-url').value.trim(); if (!u) return;
    try { const src = await imageFromUrl(u); setImage(src.blob, src.name, src.meta); } catch (e) { log(e.message, 'err'); }
  });
  $('#use-shot').addEventListener('click', async () => setImage(await (await fetch(j.screenshot)).blob(), 'ekran-goruntusu.jpg'));

  applyModeUI();

  // bağlam menüsünden gelen görsel
  if (j && j.srcUrl) {
    const r = await fetchBlob(j.srcUrl, { maxBytes: 30e6 });
    if (r && r.blob) setImage(r.blob, decodeURIComponent((j.srcUrl.split('?')[0].split('/').pop()) || 'gorsel'));
    else log('Görsel indirilemedi; elle yükleyin.', 'warn');
  }

  // otomatik başlat
  const aiReady = !PROVIDERS[S.settings.provider].needsKey || !!S.settings[S.settings.provider].apiKey;
  const onPinTab = j && j.tabId != null && PIN_PAGE.test(j.url || '');
  const auto = ['tab'].includes(S.mode)
    || (S.mode === 'tab-ai' && aiReady)
    || (S.mode === 'pin' && aiReady && (onPinTab || S.image))
    || (S.mode === 'image' && S.image);
  if (auto) run();
  else if (AI_MODES.has(S.mode) && !aiReady) log('AI modu için Ayarlar sayfasından API anahtarı girin ya da yerel model seçin; sonra "Oluştur"a basın.', 'warn');
  else if (S.mode === 'pin') log('Pinterest pin adresini ya da görsel URL ekleyip "Oluştur"a basın.');
}

init().catch((e) => { log('Başlatma hatası: ' + (e.message || e), 'err'); console.error(e); });
