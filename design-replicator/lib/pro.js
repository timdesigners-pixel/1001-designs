import { DEFAULT_PRO_SERVICE } from './service-default.js';
// Paid access is always checked online. A local flag never grants a subscription.
export async function serviceConfig() {
  const { proService = '' } = await chrome.storage.local.get('proService');
  const u = new URL(proService || DEFAULT_PRO_SERVICE || 'http://localhost:8787');
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))) throw new Error('Üyelik hizmeti HTTPS kullanmalı.');
  if (u.username || u.password || u.search || u.hash) throw new Error('Geçersiz hizmet adresi.');
  return u.origin;
}
export async function proRequest(path, data, { signal } = {}) {
  const base = await serviceConfig();
  const { proSession } = await chrome.storage.local.get('proSession');
  const token = proSession?.origin === base ? proSession.token : '';
  const response = await fetch(base + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: signal || AbortSignal.timeout(120000), cache: 'no-store', credentials: 'omit', redirect: 'error'
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Üyelik hizmetine ulaşılamadı.');
  return result;
}
export async function requirePro() {
  const state = await proRequest('/v1/me');
  if (!state.pro) throw new Error('Bu özellik için aktif Pro üyeliği gerekli. Pro alanından satın alabilirsiniz.');
  return state;
}
export const openPro = () => chrome.tabs.create({ url: chrome.runtime.getURL('pro/pro.html') });
