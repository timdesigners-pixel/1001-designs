(() => {
  'use strict';
  const DATA = JSON.parse(document.getElementById('pin-data').textContent);
  const L = /^tr/i.test(DATA.lang || '') ? 'tr' : 'en';

  const I18N = {
    en: { home: 'Home', explore: 'Explore', create: 'Create', search: 'Search', updates: 'Updates', messages: 'Messages', save: 'Save', saved: 'Saved', saveTo: 'Save to board', boardName: 'Board name', allPins: 'All pins', savedTo: 'Saved to', change: 'Change', undo: 'Undo', removed: 'Removed from', share: 'Share', copyLink: 'Copy link', linkCopied: 'Link copied', more: 'More', download: 'Download image', hide: 'Hide Pin', report: 'Report Pin', hidden: 'Pin hidden', visit: 'Visit site', follow: 'Follow', following: 'Following', followers: 'followers', comments: 'Comments', noComments: 'No comments yet! Add one to start the conversation.', addComment: 'Add a comment', send: 'Send', like: 'Like', moreToExplore: 'More to explore', end: "You've reached the end", colors: 'Colors', copied: 'Copied', back: 'Back', zoom: 'Zoom', close: 'Close', darkMode: 'Dark mode', yourSaved: 'Your saved Pins', reset: 'Reset saved data', you: 'You', now: 'now', results: 'results', noResults: 'No Pins found', more_: 'more', less: 'less', title: 'Title', desc: 'Description', image: 'Image', pickImage: 'Click to choose an image', cancel: 'Cancel', publish: 'Publish', created: 'Pin created', reportTitle: 'Report this Pin', reasons: ['Spam', 'Nudity or pornography', 'Self-harm', 'Misinformation', 'Hateful activities', 'Something else'], reportThanks: 'Thanks for reporting. We will take a look.', email: 'Email', empty: 'Nothing here yet', noUpdates: "You're all caught up", noMsgs: 'No messages yet', pins: 'Pins', createdBoard: 'Board created', boards: 'Boards' },
    tr: { home: 'Ana sayfa', explore: 'Keşfet', create: 'Oluştur', search: 'Ara', updates: 'Güncellemeler', messages: 'Mesajlar', save: 'Kaydet', saved: 'Kaydedildi', saveTo: 'Panoya kaydet', boardName: 'Pano adı', allPins: 'Tüm pinler', savedTo: 'Kaydedildi:', change: 'Değiştir', undo: 'Geri al', removed: 'Kaldırıldı:', share: 'Paylaş', copyLink: 'Bağlantıyı kopyala', linkCopied: 'Bağlantı kopyalandı', more: 'Daha fazla', download: 'Görseli indir', hide: 'Pini gizle', report: 'Pini bildir', hidden: 'Pin gizlendi', visit: 'Siteyi ziyaret et', follow: 'Takip et', following: 'Takip ediliyor', followers: 'takipçi', comments: 'Yorumlar', noComments: 'Henüz yorum yok! Sohbeti başlatmak için bir yorum ekle.', addComment: 'Yorum ekle', send: 'Gönder', like: 'Beğen', moreToExplore: 'Keşfetmeye devam et', end: 'Sona ulaştın', colors: 'Renkler', copied: 'Kopyalandı', back: 'Geri', zoom: 'Büyüt', close: 'Kapat', darkMode: 'Koyu mod', yourSaved: 'Kaydettiğin pinler', reset: 'Kayıtlı verileri sıfırla', you: 'Sen', now: 'şimdi', results: 'sonuç', noResults: 'Pin bulunamadı', more_: 'daha fazla', less: 'daha az', title: 'Başlık', desc: 'Açıklama', image: 'Görsel', pickImage: 'Görsel seçmek için tıkla', cancel: 'Vazgeç', publish: 'Yayınla', created: 'Pin oluşturuldu', reportTitle: 'Bu pini bildir', reasons: ['Spam', 'Çıplaklık veya pornografi', 'Kendine zarar verme', 'Yanlış bilgi', 'Nefret içerikli faaliyetler', 'Başka bir şey'], reportThanks: 'Bildirdiğin için teşekkürler. İnceleyeceğiz.', email: 'E-posta', empty: 'Henüz bir şey yok', noUpdates: 'Her şeyi gördün', noMsgs: 'Henüz mesaj yok', pins: 'Pin', createdBoard: 'Pano oluşturuldu', boards: 'Panolar' },
  }[L];
  const t = (k) => I18N[k] ?? k;

  /* ---------- yardımcılar ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const el = (html) => { const tp = document.createElement('template'); tp.innerHTML = html.trim(); return tp.content.firstElementChild; };
  const uid = () => Math.random().toString(36).slice(2, 9);
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n));
  const ago = (ts) => {
    const s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return t('now');
    const u = s < 3600 ? [Math.floor(s / 60), L === 'tr' ? 'dk' : 'm'] : s < 86400 ? [Math.floor(s / 3600), L === 'tr' ? 'sa' : 'h'] : s < 2592000 ? [Math.floor(s / 86400), L === 'tr' ? 'g' : 'd'] : [Math.floor(s / 2592000), L === 'tr' ? 'ay' : 'mo'];
    return u[0] + u[1];
  };

  const ICONS = {
    heart: '<path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.8 4.5 6.5 4.5c2 0 3.5 1.1 4.3 2.5.7-1.4 2.2-2.5 4.2-2.5 3.7 0 5.6 3.9 4.1 7.3C19.5 16.4 12 21 12 21z"/>',
    comment: '<path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 20a2 2 0 0 1-3.4 0"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.2A8 8 0 1 1 21 12z"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    ext: '<path d="M14 3h7v7M10 14L21 3M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9.5h.01M15 9.5h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    down: '<path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.5 7.7C4 9.4 2.5 12 2.5 12S6 18 12 18c1.5 0 2.8-.4 4-.9"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  };
  const icon = (n, s = 24) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

  /* ---------- kalıcı durum (sandbox'ta localStorage yoksa bellek) ---------- */
  const mem = {};
  const store = {
    get(k) { try { const v = localStorage.getItem(k); if (v != null) return v; } catch { /* sandbox */ } return mem[k] ?? null; },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch { /* kota / sandbox */ } },
  };
  const KEY = 'drpin:' + (DATA.pin.id || 'x');
  const parse = (s) => { try { return JSON.parse(s) || {}; } catch { return {}; } };
  const S = Object.assign({ boards: [{ id: 'b0', name: t('allPins'), pins: [] }], liked: {}, followed: {}, comments: {}, hidden: {}, theme: null, lastBoard: 'b0', created: [] }, parse(store.get(KEY)));
  const persist = () => store.set(KEY, JSON.stringify(S));

  /* ---------- pin kayıtları ---------- */
  const PINS = new Map();
  const mainPin = { ...DATA.pin, image: DATA.pin.image?.url || DATA.pin.image, w: DATA.pin.image?.w || DATA.pin.w, h: DATA.pin.image?.h || DATA.pin.h, main: true };
  PINS.set(String(mainPin.id), mainPin);
  (DATA.related || []).forEach((p) => PINS.set(String(p.id), p));
  S.created.forEach((p) => PINS.set(String(p.id), p));
  const pinById = (id) => PINS.get(String(id));
  const boardsOf = (id) => S.boards.filter((b) => b.pins.includes(String(id)));
  const isSaved = (id) => boardsOf(id).length > 0;

  /* ---------- durum: görünüm ---------- */
  const view = { type: 'pin', id: String(mainPin.id), q: '' };
  let shown = 0;
  let history = 0;
  const BATCH = 20;

  function readHash() {
    const h = location.hash.replace(/^#/, '');
    const m = h.match(/^pin=(.+)$/);
    if (h === 'saved') { view.type = 'saved'; }
    else if (m && pinById(decodeURIComponent(m[1]))) { view.type = 'pin'; view.id = String(decodeURIComponent(m[1])); }
    else { view.type = 'pin'; view.id = String(mainPin.id); }
  }
  function go(hash) { history++; if (location.hash === hash) render(); else location.hash = hash; }

  /* ---------- toast / popover ---------- */
  function toast(msg, action) {
    const box = $('#toasts');
    const n = el(`<div class="toast" role="status"><span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}</div>`);
    if (action) n.querySelector('button').addEventListener('click', () => { n.remove(); action.fn(); });
    box.appendChild(n);
    setTimeout(() => n.remove(), 5000);
  }

  let pop = null;
  function closePopover() { if (pop) { pop.node.remove(); document.removeEventListener('mousedown', pop.out, true); pop = null; } }
  function openPopover(anchor, content) {
    closePopover();
    const node = el('<div class="popover" role="dialog"></div>');
    node.appendChild(content);
    document.body.appendChild(node);
    const r = anchor.getBoundingClientRect();
    const w = node.offsetWidth, h = node.offsetHeight;
    let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    let top = r.bottom + 8;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 8);
    node.style.left = left + 'px';
    node.style.top = top + 'px';
    const out = (e) => { if (!node.contains(e.target) && !anchor.contains(e.target)) closePopover(); };
    setTimeout(() => document.addEventListener('mousedown', out, true));
    pop = { node, out };
    return node;
  }
  addEventListener('scroll', () => closePopover(), { passive: true });
  addEventListener('resize', closePopover);

  /* ---------- kaydet / panolar ---------- */
  function savePin(id, boardId) {
    id = String(id);
    const b = S.boards.find((x) => x.id === boardId) || S.boards[0];
    if (!b.pins.includes(id)) b.pins.unshift(id);
    S.lastBoard = b.id; persist();
    return b;
  }
  function unsavePin(id, boardId) {
    const b = S.boards.find((x) => x.id === boardId);
    if (b) b.pins = b.pins.filter((p) => p !== String(id));
    persist();
  }
  function quickSave(anchor, id) {
    if (isSaved(id)) return saveMenu(anchor, id);
    const b = savePin(id, S.lastBoard);
    toast(`${t('savedTo')} ${b.name}`, { label: t('change'), fn: () => saveMenu(anchor, id) });
    refreshSaveButtons(id);
  }
  function refreshSaveButtons(id) {
    $$(`[data-act="save"][data-id="${CSS.escape(String(id))}"]`).forEach((b) => {
      const s = isSaved(id);
      b.textContent = s ? t('saved') : t('save');
      b.classList.toggle('btn-dark', s);
      b.classList.toggle('btn-red', !s);
    });
    $$(`[data-act="boards"][data-id="${CSS.escape(String(id))}"] span`).forEach((sp) => { sp.textContent = (boardsOf(id)[0] || S.boards.find((x) => x.id === S.lastBoard) || S.boards[0]).name; });
    if (view.type === 'pin' && view.id === String(id)) { const bb = $('.board-btn span'); if (bb) bb.textContent = (boardsOf(id)[0] || S.boards.find((x) => x.id === S.lastBoard) || S.boards[0]).name; }
  }
  function saveMenu(anchor, id) {
    const box = el(`<div class="menu"><h3>${esc(t('saveTo'))}</h3><div class="list"></div><form class="new-board"><input maxlength="50" placeholder="${esc(t('boardName'))}" aria-label="${esc(t('boardName'))}"><button class="btn btn-red sm" disabled>${esc(t('create'))}</button></form></div>`);
    const list = $('.list', box);
    const draw = () => {
      list.replaceChildren(...S.boards.map((b) => {
        const on = b.pins.includes(String(id));
        const row = el(`<button type="button" class="menu-item"><span class="grow">${esc(b.name)}<small>${b.pins.length} ${esc(t('pins'))}</small></span>${on ? `<span class="tick">${icon('check', 20)}</span>` : ''}</button>`);
        row.addEventListener('click', () => {
          if (on) { unsavePin(id, b.id); toast(`${t('removed')} ${b.name}`); } else { savePin(id, b.id); toast(`${t('savedTo')} ${b.name}`); }
          refreshSaveButtons(id); draw();
        });
        return row;
      }));
    };
    draw();
    const form = $('form', box), input = $('input', form), btn = $('button', form);
    input.addEventListener('input', () => { btn.disabled = !input.value.trim(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = input.value.trim(); if (!name) return;
      const b = { id: 'b' + uid(), name, pins: [] };
      S.boards.push(b); savePin(id, b.id); input.value = ''; btn.disabled = true;
      toast(`${t('createdBoard')}: ${name}`); refreshSaveButtons(id); draw();
    });
    openPopover(anchor, box);
    input.focus();
  }

  /* ---------- paylaş / daha fazla / bildir ---------- */
  const pinLink = (p) => p.url || (p.main ? location.href.split('#')[0] : `${location.href.split('#')[0]}#pin=${encodeURIComponent(p.id)}`);
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* yok */ } ta.remove();
    }
  }
  function shareMenu(anchor, p) {
    const link = pinLink(p), text = p.title || '';
    const q = encodeURIComponent;
    const box = el(`<div class="menu"><h3>${esc(t('share'))}</h3>
      <div class="share-row">
        <a href="https://wa.me/?text=${q(text + ' ' + link)}" target="_blank" rel="noopener"><span class="dot" style="background:#25d366">W</span>WhatsApp</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${q(link)}" target="_blank" rel="noopener"><span class="dot" style="background:#1877f2">f</span>Facebook</a>
        <a href="https://twitter.com/intent/tweet?url=${q(link)}&text=${q(text)}" target="_blank" rel="noopener"><span class="dot" style="background:#111">X</span>X</a>
        <a href="mailto:?subject=${q(text)}&body=${q(link)}"><span class="dot" style="background:#767676">@</span>${esc(t('email'))}</a>
      </div>
      <button type="button" class="menu-item" data-k="copy">${icon('ext', 20)}<span class="grow">${esc(t('copyLink'))}</span></button>
      ${navigator.share ? `<button type="button" class="menu-item" data-k="native">${icon('share', 20)}<span class="grow">${esc(t('share'))}…</span></button>` : ''}</div>`);
    $('[data-k=copy]', box).addEventListener('click', async () => { await copy(link); closePopover(); toast(t('linkCopied')); });
    const nb = $('[data-k=native]', box);
    if (nb) nb.addEventListener('click', () => { closePopover(); navigator.share({ title: text, url: link }).catch(() => {}); });
    openPopover(anchor, box);
  }
  function download(p) {
    const a = document.createElement('a');
    a.href = p.image; a.download = `pin-${p.id}.jpg`; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function moreMenu(anchor, p) {
    const box = el(`<div class="menu">
      <button type="button" class="menu-item" data-k="dl">${icon('down', 20)}<span class="grow">${esc(t('download'))}</span></button>
      <button type="button" class="menu-item" data-k="hide">${icon('eyeoff', 20)}<span class="grow">${esc(t('hide'))}</span></button>
      <button type="button" class="menu-item" data-k="report">${icon('flag', 20)}<span class="grow">${esc(t('report'))}</span></button></div>`);
    $('[data-k=dl]', box).addEventListener('click', () => { closePopover(); download(p); });
    $('[data-k=hide]', box).addEventListener('click', () => {
      closePopover(); S.hidden[p.id] = 1; persist();
      toast(t('hidden'), { label: t('undo'), fn: () => { delete S.hidden[p.id]; persist(); render(); } });
      if (view.type === 'pin' && view.id === String(p.id)) go('#'); else $$(`.pin[data-id="${CSS.escape(String(p.id))}"]`).forEach((n) => n.remove());
    });
    $('[data-k=report]', box).addEventListener('click', () => { closePopover(); reportModal(p); });
    openPopover(anchor, box);
  }

  function modal(html) {
    const bg = el(`<div class="modal-bg" role="dialog" aria-modal="true"><div class="modal">${html}</div></div>`);
    const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(bg);
    return { node: $('.modal', bg), close };
  }
  function reportModal() {
    const m = modal(`<h2>${esc(t('reportTitle'))}</h2><form>${I18N.reasons.map((r, i) => `<label class="radio"><input type="radio" name="r" value="${i}" ${i ? '' : 'checked'}> ${esc(r)}</label>`).join('')}<div class="row"><button type="button" class="btn btn-gray" data-x>${esc(t('cancel'))}</button><button class="btn btn-red">${esc(t('report'))}</button></div></form>`);
    $('[data-x]', m.node).addEventListener('click', m.close);
    $('form', m.node).addEventListener('submit', (e) => { e.preventDefault(); m.close(); toast(t('reportThanks')); });
  }
  function createModal() {
    let img = '';
    const m = modal(`<h2>${esc(t('create'))}</h2><form>
      <label>${esc(t('image'))}<div class="drop" tabindex="0">${esc(t('pickImage'))}</div><input type="file" accept="image/*" hidden></label>
      <label>${esc(t('title'))}<input type="text" name="title" maxlength="100"></label>
      <label>${esc(t('desc'))}<textarea name="desc" rows="3" maxlength="500"></textarea></label>
      <div class="row"><button type="button" class="btn btn-gray" data-x>${esc(t('cancel'))}</button><button class="btn btn-red" disabled>${esc(t('publish'))}</button></div></form>`);
    const drop = $('.drop', m.node), file = $('input[type=file]', m.node), go_ = $('.btn-red', m.node);
    const pick = () => file.click();
    drop.addEventListener('click', pick);
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    file.addEventListener('change', () => {
      const f = file.files[0]; if (!f) return;
      const fr = new FileReader();
      fr.onload = () => {
        img = fr.result; drop.innerHTML = `<img src="${img}" alt="">`; go_.disabled = false;
      };
      fr.readAsDataURL(f);
    });
    $('[data-x]', m.node).addEventListener('click', m.close);
    $('form', m.node).addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const probe = new Image();
      probe.onload = () => {
        const p = { id: 'u' + uid(), title: f.title.value.trim(), description: f.desc.value.trim(), image: img, w: probe.naturalWidth, h: probe.naturalHeight, mine: true };
        S.created.unshift(p); PINS.set(p.id, p); persist(); m.close(); toast(t('created')); go('#pin=' + p.id);
      };
      probe.src = img;
    });
  }

  function lightbox(p) {
    const lb = el(`<div class="lightbox" role="dialog" aria-modal="true"><img src="${esc(p.image)}" alt="${esc(p.title || '')}"><button type="button" class="x" aria-label="${esc(t('close'))}">${icon('close')}</button></div>`);
    const img = $('img', lb);
    const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    img.addEventListener('click', (e) => { e.stopPropagation(); lb.classList.toggle('is-zoom'); });
    lb.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(lb);
  }

  /* ---------- üst bar ---------- */
  function renderNav() {
    $('#nav').innerHTML = `
      <button class="logo" data-act="home" aria-label="Pinterest"><svg viewBox="0 0 48 48" width="32" height="32"><circle cx="24" cy="24" r="24" fill="#e60023"/><text x="24" y="34" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="30" font-weight="700" fill="#fff">P</text></svg></button>
      <nav class="nav-links"><button class="pill is-active" data-act="home">${esc(t('home'))}</button><button class="pill" data-act="explore">${esc(t('explore'))}</button><button class="pill" data-act="create">${esc(t('create'))}</button></nav>
      <label class="search">${icon('search', 20)}<input id="q" type="search" placeholder="${esc(t('search'))}" autocomplete="off" aria-label="${esc(t('search'))}"></label>
      <div class="nav-right"><button class="ib" data-act="bell" aria-label="${esc(t('updates'))}">${icon('bell')}</button><button class="ib" data-act="chat" aria-label="${esc(t('messages'))}">${icon('chat')}</button><button class="ib" data-act="profile" aria-label="Profile"><span class="avatar me">${esc(t('you')[0])}</span></button></div>`;
    $('#q').addEventListener('input', (e) => { view.q = e.target.value.trim(); render(); });
  }

  /* ---------- pin kapanış ---------- */
  function commentsOf(p) {
    const base = p.main ? (DATA.comments || []) : [];
    return [...base, ...(S.comments[p.id] || [])].sort((a, b) => a.ts - b.ts);
  }
  const likeCount = (p) => (p.likes || 0) + (S.liked[p.id] ? 1 : 0);
  const avatarHtml = (u, size = '') => (u && u.avatar ? `<span class="avatar ${size}"><img src="${esc(u.avatar)}" alt=""></span>` : `<span class="avatar ${size}">${esc(((u && u.name) || '?')[0].toUpperCase())}</span>`);

  function commentHtml(c) {
    return `<li class="c-item" data-cid="${esc(c.id)}">${avatarHtml({ name: c.user, avatar: c.avatar }, 'md')}<div class="c-main"><div class="c-text"><b>${esc(c.user)}</b>${esc(c.text)}</div><div class="c-meta"><span>${esc(ago(c.ts))}</span><button type="button" data-act="clike" class="${c.liked ? 'is-on' : ''}">${icon('heart', 14)}<span>${fmt((c.likes || 0) + (c.liked ? 1 : 0))}</span></button>${c.mine ? `<button type="button" data-act="cdel">${icon('trash', 14)}</button>` : ''}</div></div></li>`;
  }

  function renderCloseup(p) {
    const sec = el(`<section class="closeup" data-pin="${esc(p.id)}">
      <div class="cu-media" style="background:${esc(p.color || '#efefef')}">
        ${history ? `<button class="cu-back" data-act="back" aria-label="${esc(t('back'))}">${icon('back')}</button>` : ''}
        <img src="${esc(p.image)}" alt="${esc(p.alt || p.title || '')}" data-act="zoom" ${p.w && p.h ? `width="${p.w}" height="${p.h}"` : ''}>
        <button class="cu-zoom" data-act="zoom" aria-label="${esc(t('zoom'))}">${icon('expand', 20)}</button>
        ${p.link ? `<a class="cu-visit" href="${esc(p.link)}" target="_blank" rel="noopener">${icon('ext', 16)}${esc(p.domain || t('visit'))}</a>` : ''}
      </div>
      <div class="cu-body">
        <div class="cu-actions">
          <div class="cu-left">
            <button class="ib has-count ${S.liked[p.id] ? 'is-on' : ''}" data-act="like" aria-pressed="${!!S.liked[p.id]}" aria-label="${esc(t('like'))}">${icon('heart')}<span class="count">${likeCount(p) ? fmt(likeCount(p)) : ''}</span></button>
            <button class="ib" data-act="gocomments" aria-label="${esc(t('comments'))}">${icon('comment')}</button>
            <button class="ib" data-act="share" aria-label="${esc(t('share'))}">${icon('share')}</button>
            <button class="ib" data-act="more" aria-label="${esc(t('more'))}">${icon('more')}</button>
          </div>
          <div class="cu-right">
            <button class="board-btn" data-act="boards" data-id="${esc(p.id)}"><span>${esc((boardsOf(p.id)[0] || S.boards.find((b) => b.id === S.lastBoard) || S.boards[0]).name)}</span>${icon('chevron', 16)}</button>
            <button class="btn ${isSaved(p.id) ? 'btn-dark' : 'btn-red'}" data-act="save" data-id="${esc(p.id)}">${esc(isSaved(p.id) ? t('saved') : t('save'))}</button>
          </div>
        </div>
        <div class="cu-scroll">
          ${p.link ? `<a class="cu-link" href="${esc(p.link)}" target="_blank" rel="noopener">${icon('ext', 14)}${esc(p.domain || p.link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</a>` : ''}
          ${p.title ? `<h1 class="cu-title">${esc(p.title)}</h1>` : ''}
          ${p.description ? `<p class="cu-desc ${p.description.length > 160 ? 'is-clamped' : ''}">${esc(p.description)}</p>${p.description.length > 160 ? `<button class="link-btn" data-act="desc">${esc(t('more_'))}</button>` : ''}` : ''}
          ${p.author && p.author.name ? `<div class="cu-author">${avatarHtml(p.author, 'lg')}<div class="meta"><div class="name">${esc(p.author.name)}</div>${p.author.followers ? `<div class="sub">${fmt(p.author.followers + (S.followed[p.author.username || p.author.name] ? 1 : 0))} ${esc(t('followers'))}</div>` : ''}</div><button class="btn btn-gray" data-act="follow" data-key="${esc(p.author.username || p.author.name)}">${esc(S.followed[p.author.username || p.author.name] ? t('following') : t('follow'))}</button></div>` : ''}
          ${p.main && DATA.palette && DATA.palette.length ? `<div class="palette"><h3>${esc(t('colors'))}</h3>${DATA.palette.map((c) => `<button class="chip-color" data-act="color" data-hex="${esc(c.hex)}" style="background:${esc(c.hex)};color:${esc(c.text || '#fff')}">${esc(c.hex)}</button>`).join('')}</div>` : ''}
          <div class="comments" id="comments"><h2><span>${esc(t('comments'))} <span class="c-count"></span></span><button class="toggle" data-act="ctoggle" aria-label="${esc(t('comments'))}">${icon('chevron', 20)}</button></h2><p class="c-empty"></p><ul class="c-list" style="list-style:none;padding:0;margin:0"></ul></div>
        </div>
        <form class="cu-compose" autocomplete="off"><span class="avatar md me">${esc(t('you')[0])}</span><div class="field"><input name="c" placeholder="${esc(t('addComment'))}" maxlength="300" aria-label="${esc(t('addComment'))}"><button type="button" class="ib sm" data-act="emoji" aria-label="emoji">${icon('smile', 20)}</button></div><button class="ib send" disabled aria-label="${esc(t('send'))}">${icon('send')}</button></form>
      </div></section>`);

    const img = $('.cu-media img', sec);
    const loaded = () => img.classList.add('is-loaded');
    img.complete ? loaded() : img.addEventListener('load', loaded);

    const drawComments = () => {
      const list = commentsOf(p);
      $('.c-count', sec).textContent = list.length ? `· ${list.length}` : '';
      $('.c-empty', sec).textContent = list.length ? '' : t('noComments');
      $('.c-list', sec).innerHTML = list.map(commentHtml).join('');
    };
    drawComments();

    const form = $('.cu-compose', sec), input = $('input', form), send = $('.send', form);
    input.addEventListener('input', () => { send.disabled = !input.value.trim(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim(); if (!text) return;
      (S.comments[p.id] ||= []).push({ id: 'c' + uid(), user: t('you'), text, ts: Date.now(), mine: true, likes: 0 });
      persist(); input.value = ''; send.disabled = true; drawComments();
      $('.comments', sec).classList.remove('is-collapsed');
    });
    $('[data-act=emoji]', form).addEventListener('click', (e) => {
      const box = el('<div class="menu" style="display:grid;grid-template-columns:repeat(6,1fr);gap:2px;min-width:0"></div>');
      '😀😂😍🥰😎🤩👍🙏🔥✨🎉💡😮😢👏💯❤️🤝🌈🍀'.match(/\p{Extended_Pictographic}️?/gu).forEach((em) => {
        const b = el(`<button type="button" class="menu-item" style="justify-content:center;padding:6px;min-height:40px;font-size:20px">${em}</button>`);
        b.addEventListener('click', () => { input.value += em; input.dispatchEvent(new Event('input')); input.focus(); closePopover(); });
        box.appendChild(b);
      });
      openPopover(e.currentTarget, box);
    });
    $('.comments', sec).addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const item = btn.closest('.c-item');
      if (btn.dataset.act === 'ctoggle') $('.comments', sec).classList.toggle('is-collapsed');
      if (!item) return;
      const arr = S.comments[p.id] || [];
      const c = arr.find((x) => x.id === item.dataset.cid) || (DATA.comments || []).find((x) => String(x.id) === item.dataset.cid);
      if (!c) return;
      if (btn.dataset.act === 'clike') { c.liked = !c.liked; persist(); drawComments(); }
      if (btn.dataset.act === 'cdel') { S.comments[p.id] = arr.filter((x) => x !== c); persist(); drawComments(); }
    });
    return sec;
  }

  /* ---------- ızgara ---------- */
  function cardEl(p) {
    const ratio = p.w && p.h ? (p.h / p.w) * 100 : 133;
    const sv = isSaved(p.id);
    const bn = (boardsOf(p.id)[0] || S.boards.find((b) => b.id === S.lastBoard) || S.boards[0]).name;
    const node = el(`<div class="pin" tabindex="0" role="link" data-id="${esc(p.id)}" aria-label="${esc(p.title || 'Pin')}">
      <div class="pin-media" style="padding-top:${ratio}%;background:${esc(p.color || '#efefef')}"><img src="${esc(p.image)}" alt="${esc(p.title || '')}" loading="lazy" decoding="async">
        <div class="pin-ov"><div class="pin-top"><button type="button" class="pin-board" data-act="boards" data-id="${esc(p.id)}"><span>${esc(bn)}</span>${icon('chevron', 14)}</button><button type="button" class="btn sm ${sv ? 'btn-dark' : 'btn-red'}" data-act="save" data-id="${esc(p.id)}">${esc(sv ? t('saved') : t('save'))}</button></div>
        <div class="pin-bot">${p.link ? `<a class="chip" href="${esc(p.link)}" target="_blank" rel="noopener">${icon('ext', 12)}<span>${esc(p.domain || t('visit'))}</span></a>` : ''}<span class="sp"></span><button type="button" class="ib sm" data-act="share" aria-label="${esc(t('share'))}">${icon('share', 16)}</button><button type="button" class="ib sm" data-act="more" aria-label="${esc(t('more'))}">${icon('more', 16)}</button></div></div></div>
      ${p.title ? `<div class="pin-cap">${esc(p.title)}</div>` : ''}</div>`);
    const im = $('img', node);
    im.complete && im.naturalWidth ? im.classList.add('is-loaded') : im.addEventListener('load', () => im.classList.add('is-loaded'));
    return node;
  }

  let observer = null;
  function pool() {
    const q = view.q.toLowerCase();
    const all = [...S.created, mainPin, ...(DATA.related || [])].filter((p, i, a) => a.findIndex((x) => String(x.id) === String(p.id)) === i);
    return all.filter((p) => !S.hidden[p.id] && (view.type === 'search' || String(p.id) !== view.id) && (!q || ((p.title || '') + ' ' + (p.alt || '') + ' ' + (p.description || '')).toLowerCase().includes(q)));
  }
  function renderGrid(host, items) {
    const grid = el('<div class="grid"></div>');
    const sentinel = el('<div class="sentinel"></div>');
    host.append(grid, sentinel);
    shown = 0;
    const more = () => {
      const next = items.slice(shown, shown + BATCH);
      next.forEach((p) => grid.appendChild(cardEl(p)));
      shown += next.length;
      if (shown >= items.length) {
        if (observer) observer.disconnect();
        if (items.length) host.appendChild(el(`<p class="end">${esc(t('end'))}</p>`));
        sentinel.remove();
      }
    };
    more();
    if (observer) observer.disconnect();
    if (shown < items.length && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) more(); }, { rootMargin: '600px' });
      observer.observe(sentinel);
    } else while (shown < items.length) more();
  }

  /* ---------- ana render ---------- */
  function render() {
    closePopover();
    const app = $('#app');
    app.replaceChildren();
    $$('.pill').forEach((b) => b.classList.toggle('is-active', b.dataset.act === 'home' && view.type !== 'saved'));
    if (view.q) {
      view.type = 'search';
      const items = pool();
      app.appendChild(el(`<div class="grid-head">${items.length} ${esc(t('results'))}<small>“${esc(view.q)}”</small></div>`));
      if (!items.length) app.appendChild(el(`<p class="empty">${esc(t('noResults'))}</p>`)); else renderGrid(app, items);
      return;
    }
    if (view.type === 'search') view.type = 'pin';
    if (view.type === 'saved') {
      const wrap = el(`<div class="saved-view"><h1>${esc(t('yourSaved'))}</h1></div>`);
      const have = S.boards.filter((b) => b.pins.length);
      if (!have.length) wrap.appendChild(el(`<p class="empty">${esc(t('empty'))}</p>`));
      have.forEach((b) => {
        const sec = el(`<section class="board"><h2>${esc(b.name)} · ${b.pins.length}</h2></section>`);
        renderGrid(sec, b.pins.map(pinById).filter(Boolean));
        wrap.appendChild(sec);
      });
      app.appendChild(wrap);
      return;
    }
    const p = pinById(view.id) || mainPin;
    app.appendChild(renderCloseup(p));
    const items = pool();
    if (items.length) {
      const sec = el(`<section id="more"><div class="grid-head">${esc(t('moreToExplore'))}</div></section>`);
      renderGrid(sec, items);
      app.appendChild(sec);
    }
    document.title = (p.title ? p.title + ' · ' : '') + (DATA.siteName || 'Pinterest');
  }

  /* ---------- olaylar ---------- */
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.pin');
    const btn = e.target.closest('[data-act]');
    const anchor = e.target.closest('a[href]');
    if (anchor && !btn) return;
    if (!btn) { if (card) go('#pin=' + encodeURIComponent(card.dataset.id)); return; }
    e.preventDefault(); e.stopPropagation();
    const a = btn.dataset.act;
    const id = btn.dataset.id || (card && card.dataset.id) || view.id;
    const p = pinById(id) || mainPin;
    switch (a) {
      case 'home': $('#q').value = ''; view.q = ''; go('#'); scrollTo({ top: 0 }); break;
      case 'explore': $('#q').value = ''; view.q = ''; if (view.type !== 'pin') { go('#'); } setTimeout(() => ($('#more') || document.body).scrollIntoView({ behavior: 'smooth' }), 30); break;
      case 'create': createModal(); break;
      case 'back': history = Math.max(0, history - 1); window.history.length > 1 && history ? window.history.back() : go('#'); break;
      case 'save': quickSave(btn, id); break;
      case 'boards': saveMenu(btn, id); break;
      case 'share': shareMenu(btn, p); break;
      case 'more': moreMenu(btn, p); break;
      case 'like': { S.liked[p.id] = !S.liked[p.id]; persist(); btn.classList.toggle('is-on', !!S.liked[p.id]); btn.setAttribute('aria-pressed', !!S.liked[p.id]); $('.count', btn).textContent = likeCount(p) ? fmt(likeCount(p)) : ''; break; }
      case 'gocomments': $('#comments')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); $('.cu-compose input')?.focus(); break;
      case 'zoom': lightbox(p); break;
      case 'desc': { const d = $('.cu-desc'); const c = d.classList.toggle('is-clamped'); btn.textContent = c ? t('more_') : t('less'); break; }
      case 'follow': { const k = btn.dataset.key; S.followed[k] = !S.followed[k]; persist(); render(); break; }
      case 'color': copy(btn.dataset.hex); toast(`${t('copied')}: ${btn.dataset.hex}`); break;
      case 'bell': case 'chat': { const box = el(`<div class="menu"><h3>${esc(t(a === 'bell' ? 'updates' : 'messages'))}</h3><p class="empty" style="padding:24px 16px">${esc(t(a === 'bell' ? 'noUpdates' : 'noMsgs'))}</p></div>`); openPopover(btn, box); break; }
      case 'profile': {
        const dark = document.documentElement.dataset.theme === 'dark';
        const box = el(`<div class="menu"><button type="button" class="menu-item" data-k="saved">${icon('heart', 20)}<span class="grow">${esc(t('yourSaved'))}</span></button><button type="button" class="menu-item" data-k="theme">${icon('moon', 20)}<span class="grow">${esc(t('darkMode'))}</span><span class="tick">${dark ? icon('check', 20) : ''}</span></button><button type="button" class="menu-item" data-k="reset">${icon('trash', 20)}<span class="grow">${esc(t('reset'))}</span></button></div>`);
        $('[data-k=saved]', box).addEventListener('click', () => { closePopover(); $('#q').value = ''; view.q = ''; go('#saved'); });
        $('[data-k=theme]', box).addEventListener('click', () => { closePopover(); setTheme(dark ? 'light' : 'dark'); });
        $('[data-k=reset]', box).addEventListener('click', () => { closePopover(); store.set(KEY, '{}'); location.reload(); });
        openPopover(btn, box); break;
      }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopover();
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); $('#q').focus(); }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement.classList.contains('pin')) { e.preventDefault(); go('#pin=' + encodeURIComponent(document.activeElement.dataset.id)); }
  });
  addEventListener('hashchange', () => { readHash(); render(); scrollTo({ top: 0 }); });

  function setTheme(th) { document.documentElement.dataset.theme = th; S.theme = th; persist(); }
  setTheme(S.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  renderNav();
  readHash();
  render();
})();
