// Sandbox sayfa: üretilen HTML'i kendi (gevşek CSP'li) belgesine yazar; satır içi script'ler çalışır.
// Not: document.open() belge VE window üzerindeki tüm dinleyicileri siler; bu yüzden
// dinleyiciler her render'dan sonra yeniden kurulur.
function onMessage(e) {
  if (e.source !== parent || !e.data) return;
  if (e.data.type === 'css') {
    // Yalnızca CSS değiştiyse sayfayı yeniden yazmadan stili güncelle (JS durumu korunur)
    const el = document.getElementById('dr-css');
    if (el) el.textContent = e.data.css; else parent.postMessage({ type: 'css-miss' }, '*');
    return;
  }
  if (e.data.type !== 'render') return;

  document.open();
  try { document.write(e.data.html); } catch (err) { console.warn('preview write', err); }
  document.close();
  install();
}

function onClick(ev) {
  // Dış bağlantılar iframe'i değil yeni sekmeyi açsın
  const a = ev.target.closest && ev.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href') || '';
  if (/^https?:/i.test(href)) { ev.preventDefault(); window.open(href, '_blank', 'noopener'); }
}

function install() {
  window.addEventListener('message', onMessage);
  document.addEventListener('click', onClick, true);
}

install();
parent.postMessage({ type: 'ready' }, '*');
