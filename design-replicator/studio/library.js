// Stüdyo "Kütüphane" görünümü: 1001 referans bileşeni arama, kategoriye göre süzme,
// canlı küçük önizleme (sandbox iframe), editörde açma, referans olarak sabitleme.
import { loadLibrary, entryDocument } from '../lib/refs.js';

const PAGE = 24;
const $ = (s) => document.querySelector(s);
const NAT_W = 760;
const NAT_H = 440;

export async function initLibrary({ onOpen, onAdapt, getPinned, togglePin, onCopy }) {
  const q = $('#lib-q'), cat = $('#lib-cat'), grid = $('#lib-grid'), more = $('#lib-more'), cnt = $('#lib-count'), onlyPin = $('#lib-pinned');
  let lib = await loadLibrary();

  // kategori listesi
  const counts = new Map();
  for (const e of lib) counts.set(e.category, (counts.get(e.category) || 0) + 1);
  for (const [c, n] of [...counts].sort()) cat.appendChild(Object.assign(document.createElement('option'), { value: c, textContent: `${c} (${n})` }));

  // iframe -> bileşen eşlemesi: sandbox "ready" dediğinde ilgili belgeyi gönder
  const frames = new Map();
  window.addEventListener('message', (e) => {
    if (!e.data || e.data.type !== 'ready') return;
    const entry = frames.get(e.source);
    if (entry) e.source.postMessage({ type: 'render', html: entryDocument(entry, { page: true }) }, '*');
  });

  const io = new IntersectionObserver((items) => {
    for (const it of items) {
      if (!it.isIntersecting) continue;
      const wrap = it.target;
      io.unobserve(wrap);
      const iframe = wrap.querySelector('iframe');
      const s = wrap.clientWidth / NAT_W;
      iframe.style.transform = `scale(${s})`;
      iframe.src = '../sandbox/preview.html';
    }
  }, { rootMargin: '200px' });

  function card(e) {
    const pinned = new Set(getPinned()).has(e.id);
    const el = document.createElement('article');
    el.className = 'lib-card';
    el.innerHTML = `<div class="th-wrap"><iframe title="${e.name.replace(/"/g, '&quot;')}" tabindex="-1" style="width:${NAT_W}px;height:${NAT_H}px"></iframe></div>
      <div class="lib-meta"><b></b><small></small></div>
      <div class="lib-acts"><button class="btn sm adapt" type="button">Uyarla <span class="pro-badge">PRO</span></button><button class="btn sm go" type="button">Editörde aç</button><button class="btn sm pin" type="button" aria-pressed="${pinned}" title="Her AI isteğinde referans olarak kullan">${pinned ? '★ Sabit' : '☆ Sabitle'}</button><button class="btn sm cp" type="button">Kopyala</button></div>`;
    el.querySelector('b').textContent = e.name;
    el.querySelector('small').textContent = (e.user ? 'Kullanıcı · ' : '') + (e.interactive ? 'etkileşimli · ' : '') + e.category;
    const wrap = el.querySelector('.th-wrap');
    frames.set(wrap.querySelector('iframe').contentWindow, e);
    el.querySelector('.adapt').addEventListener('click', () => onAdapt(e));
    el.querySelector('.go').addEventListener('click', () => onOpen(e));
    el.querySelector('.cp').addEventListener('click', () => onCopy(e));
    el.querySelector('.pin').addEventListener('click', (ev) => {
      const list = togglePin(e.id);
      const on = list.includes(e.id);
      ev.currentTarget.setAttribute('aria-pressed', on);
      ev.currentTarget.textContent = on ? '★ Sabit' : '☆ Sabitle';
    });
    // contentWindow, öğe DOM'a eklenince geçerli olur
    queueMicrotask(() => { frames.set(wrap.querySelector('iframe').contentWindow, e); io.observe(wrap); });
    return el;
  }

  let list = [];
  let shown = 0;
  const next = () => {
    const part = list.slice(shown, shown + PAGE);
    part.forEach((e) => grid.appendChild(card(e)));
    shown += part.length;
    more.hidden = shown >= list.length;
    cnt.textContent = `${list.length} bileşen`;
  };
  const apply = () => {
    const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const pins = new Set(getPinned());
    list = lib.filter((e) => (!cat.value || e.category === cat.value)
      && (!onlyPin.checked || pins.has(e.id))
      && words.every((w) => `${e.name} ${(e.tags || []).join(' ')} ${e.category} ${e.tokens && e.tokens.palette}`.toLowerCase().includes(w)));
    shown = 0;
    grid.replaceChildren();
    frames.clear();
    next();
  };
  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 200); });
  cat.addEventListener('change', apply);
  onlyPin.addEventListener('change', apply);
  more.addEventListener('click', next);
  apply();
  return { reload: async () => { lib = await loadLibrary(); apply(); }, get size() { return lib.length; } };
}
