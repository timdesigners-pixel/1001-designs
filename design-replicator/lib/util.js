export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const slugify = (s, fallback = 'design') =>
  (String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)) || fallback;

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

const EXT_TO_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon', bmp: 'image/bmp',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf',
};
const MIME_TO_EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
  'image/avif': 'avif', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'image/bmp': 'bmp',
  'font/woff2': 'woff2', 'font/woff': 'woff', 'font/ttf': 'ttf', 'font/otf': 'otf',
  'application/font-woff2': 'woff2', 'application/font-woff': 'woff', 'application/x-font-ttf': 'ttf',
  'application/x-font-woff': 'woff', 'application/vnd.ms-fontobject': 'eot',
};

const urlExt = (url) => {
  try {
    const m = new URL(url, 'http://x/').pathname.match(/\.([a-z0-9]{2,5})$/i);
    return m ? m[1].toLowerCase() : '';
  } catch { return ''; }
};

export function extFromMime(mime, url = '') {
  return MIME_TO_EXT[(mime || '').split(';')[0]] || urlExt(url) || 'bin';
}

/** Sunucu yanlış/boş MIME döndürdüyse uzantıdan düzeltir (data: URI'nin doğru çalışması için). */
export function fixBlobType(blob, url = '') {
  const t = (blob.type || '').split(';')[0];
  if (t && t !== 'application/octet-stream' && t !== 'text/plain' && t !== 'binary/octet-stream') return blob;
  const m = EXT_TO_MIME[urlExt(url)];
  return m ? new Blob([blob], { type: m }) : blob;
}

export async function fetchBlob(url, { maxBytes = 5e6, timeout = 20000 } = {}) {
  for (const credentials of ['omit', 'include']) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeout);
    try {
      const r = await fetch(url, { credentials, signal: ac.signal });
      if (!r.ok) continue;
      const len = +r.headers.get('content-length') || 0;
      if (len > maxBytes) return { skipped: 'size', size: len };
      const b = await r.blob();
      if (b.size > maxBytes) return { skipped: 'size', size: b.size };
      return { blob: fixBlobType(b, url) };
    } catch { /* bir sonraki credentials modunu dene */ } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export async function pool(items, n, fn) {
  let i = 0;
  const out = new Array(items.length);
  const worker = async () => {
    while (i < items.length) {
      const k = i++;
      try { out[k] = await fn(items[k], k); } catch { out[k] = null; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

export function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

export const URL_RE = /url\(\s*(['"]?)([^'")]+?)\1\s*\)/gi;

/** CSS içindeki göreli url()'leri base'e göre mutlak yapar. */
export function resolveCssUrls(css, base) {
  return css.replace(URL_RE, (m, _q, u) => {
    u = u.trim();
    if (!u || /^(data:|#|about:|blob:|var\()/i.test(u)) return m;
    try { return `url("${new URL(u, base).href}")`; } catch { return m; }
  });
}

export const withMedia = (css, media) => (media && media !== 'all' ? `@media ${media} {\n${css}\n}` : css);

export const fmtBytes = (n) =>
  n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : n > 1e3 ? Math.round(n / 1e3) + ' KB' : n + ' B';
