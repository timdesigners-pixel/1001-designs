import { proRequest, serviceConfig } from '../lib/pro.js';
const $ = s => document.querySelector(s);
try { const r=await fetch(chrome.runtime.getURL('pro/store-info.json')); if(r.ok){const info=await r.json();const u=new URL(info.privacy);if(u.protocol==='https:')document.querySelector('footer a').href=u.href;document.querySelector('footer').append(document.createTextNode(' · '+info.publisher+' · '+info.support));} } catch {}
let billingReady=false, signedIn=false, active=false;
const sync=()=>{ $('#buy').disabled=!billingReady || !signedIn || active; $('#portal').disabled=!signedIn; };
async function catalog(){
 try { const c=await proRequest('/v1/catalog'); billingReady=c.billing;
 const price=c.price ? new Intl.NumberFormat('tr-TR',{style:'currency',currency:c.price.currency.toUpperCase()}).format(c.price.amount / (10 ** new Intl.NumberFormat('en',{style:'currency',currency:c.price.currency.toUpperCase()}).resolvedOptions().maximumFractionDigits))+' / ay' : 'Satın alma henüz açılmadı';
 $('#plan').textContent=price+' · Ayda '+c.quota+' uyarlama'+(c.mode==='development'?' · Geliştirme ortamı':'');
 $('#provider-status').textContent='Pro Uyarla hizmeti: '+Object.entries(c.providers).map(([p,ready])=>(p==='openai'?'OpenAI':'Claude')+' '+(ready?'hazır':'yapılandırılmamış')).join(' · ');
 } catch {billingReady=false;$('#plan').textContent='Plan bilgisi alınamadı. Üyelik hizmeti bağlantısını kontrol edin.';} sync();
}
async function action(fn) {
  const buttons = [...document.querySelectorAll('button')];
  buttons.forEach(b => b.disabled = true);
  try { await fn(); } catch (e) { $('#status').textContent = e.message; }
  finally { buttons.forEach(b => b.disabled = false); sync(); }
}
async function refresh() {
  const state = await proRequest('/v1/me');
  $('#status').textContent = state.pro ? state.email + ' · Pro aktif' : (state.email ? state.email + ' · Ücretsiz hesap' : 'Satın almak için giriş yapın veya hesap oluşturun.');
  signedIn=!!state.email; active=!!state.pro; $('#auth').hidden = signedIn; sync();
}
async function authenticate(register) {
  if (!$('#auth').reportValidity()) return;
  await action(async () => {
    const result = await proRequest('/v1/auth/' + (register ? 'register' : 'login'), { email: $('#email').value.trim(), password: $('#password').value });
    await chrome.storage.local.set({ proSession: { origin: await serviceConfig(), token: result.token } });
    $('#password').value = '';
    await refresh();
  });
}
$('#auth').addEventListener('submit', e => { e.preventDefault(); authenticate(false); });
$('#register').onclick = () => authenticate(true);
$('#refresh').onclick = () => action(async()=>{await catalog();await refresh();});
$('#logout').onclick = () => action(async () => { try { await proRequest('/v1/auth/logout', {}); } finally { await chrome.storage.local.remove('proSession'); } await refresh(); });
$('#save-service').onclick = () => action(async () => {
  const value = $('#service').value.trim();
  const previous = await chrome.storage.local.get('proService');
  await chrome.storage.local.set({ proService: value });
  try { await serviceConfig(); } catch (e) { await chrome.storage.local.set({ proService: previous.proService || '' }); throw e; }
  await chrome.storage.local.remove('proSession');
  await catalog(); await refresh();
});
async function openBilling(path) {
  await action(async () => {
    const result = await proRequest(path, {});
    const u = new URL(result.url);
    if (u.protocol !== 'https:' || !['checkout.stripe.com', 'billing.stripe.com'].includes(u.hostname)) throw new Error('Ödeme bağlantısı doğrulanamadı.');
    await chrome.tabs.create({ url: u.href });
  });
}
$('#buy').onclick = () => openBilling('/v1/billing/checkout');
$('#portal').onclick = () => openBilling('/v1/billing/portal');
$('#service').value = await serviceConfig();
action(async()=>{await catalog();await refresh();});
