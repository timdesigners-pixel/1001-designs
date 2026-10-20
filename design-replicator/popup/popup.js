import { initTheme } from '../lib/theme.js';
const PIN_RE = /^https?:\/\/([a-z0-9-]+\.)?pinterest\.[a-z.]+\/pin\//i;
(async () => {
  initTheme(document.getElementById('theme-btn'));
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const usable = /^(https?|file):/.test(url);
  const isPin = PIN_RE.test(url);
  let host = url;
  try { host = new URL(url).host || url; } catch { /* boş */ }
  document.getElementById('where').textContent = usable ? `${tab.title || host}` : 'Bu sekme dönüştürülemez (chrome:// vb.) — görselden devam edebilirsiniz';

  document.querySelectorAll('.card').forEach((b) => {
    const mode = b.dataset.mode;
    if (mode !== 'image' && !usable) b.disabled = true;
    if (mode === 'pin' && isPin) b.classList.add('hot');
    b.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'start', mode, tabId: usable ? tab.id : null });
      window.close();
    });
  });
  document.getElementById('opts').addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
})();
