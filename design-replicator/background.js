const STUDIO_URL = chrome.runtime.getURL('studio/studio.html');
const PIN_RE = /^https?:\/\/([a-z0-9-]+\.)?pinterest\.[a-z.]+\/pin\//i;

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'dr-image', title: 'Bu görselden tasarım oluştur', contexts: ['image'] });
    chrome.contextMenus.create({ id: 'dr-page', title: 'Bu sayfayı HTML/CSS/JS tasarımına dönüştür', contexts: ['page'] });
  });

  // Yerel LLM sunucuları (Ollama/LM Studio) chrome-extension:// kaynağını reddedebilir;
  // yerel adreslere giden isteklerden Origin başlığını kaldırıyoruz.
  const hosts = ['localhost', '127.0.0.1'];
  const addRules = hosts.map((h, i) => ({
    id: 100 + i,
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders: [{ header: 'origin', operation: 'remove' }] },
    condition: { requestDomains: [h], resourceTypes: ['xmlhttprequest', 'other'] },
  }));
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: addRules.map((r) => r.id), addRules });
  } catch (e) {
    console.warn('DNR kuralı eklenemedi', e);
  }
});

async function startJob({ mode, tabId, srcUrl }) {
  const job = { mode, createdAt: Date.now() };
  if (tabId != null) {
    const tab = await chrome.tabs.get(tabId);
    Object.assign(job, { tabId, url: tab.url, title: tab.title });
    if (job.mode === 'auto') job.mode = PIN_RE.test(tab.url || '') ? 'pin' : 'tab';
    if (tab.active) {
      // Stüdyo sekmesi açılmadan ÖNCE çekilmeli; sonra aktif sekme stüdyo olur.
      try {
        job.screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 90 });
      } catch (e) {
        job.screenshotError = String(e.message || e);
      }
    }
  }
  if (srcUrl) job.srcUrl = srcUrl;

  const id = crypto.randomUUID();
  try {
    await chrome.storage.session.set({ ['job:' + id]: job });
  } catch {
    delete job.screenshot; // kota aşıldı
    await chrome.storage.session.set({ ['job:' + id]: job });
  }
  await chrome.tabs.create({ url: `${STUDIO_URL}?job=${id}` });
}

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg && msg.type === 'start') {
    startJob(msg).then(() => send({ ok: true }), (e) => send({ ok: false, error: String(e.message || e) }));
    return true;
  }
  return false;
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;
  if (info.menuItemId === 'dr-image') startJob({ mode: 'pin', tabId: tab.id, srcUrl: info.srcUrl });
  if (info.menuItemId === 'dr-page') startJob({ mode: 'auto', tabId: tab.id });
});

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'replicate-tab') return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab) startJob({ mode: 'auto', tabId: tab.id });
});
