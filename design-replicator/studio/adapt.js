import { requirePro, proRequest, openPro } from '../lib/pro.js';
export function initAdapt({ getDocument, applyDocument, log, isBusy }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'adapt-dialog';
  dialog.innerHTML = '<form method="dialog"><div class="row"><span class="pro-badge">PRO</span><h2>Binbir Dizayn · Uyarla</h2><button class="btn" value="cancel" aria-label="Kapat">×</button></div></form>' +
    '<p id="adapt-name"></p><p class="hint">Mevcut tasarımın bir kopyası üzerinde çalışır. Kaynak web sitesi değişmez.</p>' +
    '<label class="stack">Hedef alan<select id="adapt-target"></select></label>' +
    '<label class="stack">Yerleştirme<select id="adapt-place"><option value="append">Alanın sonuna ekle</option><option value="prepend">Alanın başına ekle</option><option value="replace">Seçili alanı değiştir</option></select></label>' +
    '<label class="stack">Uyarlama<select id="adapt-mode"><option value="design-to-content">Bileşenin tasarımını mevcut içeriğe uyarla</option><option value="content-to-design">İçeriğimi bileşenin tasarımına uygula</option></select></label>' +
    '<label class="stack">İçerik ve talimat<textarea id="adapt-content" rows="4" maxlength="10000" placeholder="Başlık, açıklama, buton metni veya özel talimat…"></textarea></label>' +
    '<label class="stack">Sağlayıcı<select id="adapt-provider"><option value="openai">OpenAI API</option><option value="claude">Claude API</option></select></label>' +
    '<label class="chk"><input type="checkbox" id="adapt-consent"> Mevcut sayfa kodunu, seçili bileşeni ve talimatı uyarlama hizmetine ve seçilen AI sağlayıcısına göndermeyi onaylıyorum.</label>' +
    '<p class="hint" id="adapt-status" role="status"></p><div class="row"><button class="btn primary" id="adapt-generate">Uyarlamayı önizle</button><button class="btn" id="adapt-apply" disabled>Sonucu uygula</button><button class="btn" id="adapt-undo" disabled>Geri al</button></div>' +
    '<iframe id="adapt-preview" sandbox="allow-scripts" title="Uyarlama önizlemesi" hidden></iframe>';
  document.body.append(dialog);
  const $ = s => dialog.querySelector(s);
  let selected, original, candidate, applied, previewDocument, revision = 0, controller;
  window.addEventListener('message', event => {
    if (event.source === $('#adapt-preview').contentWindow && event.data?.type === 'ready' && previewDocument) {
      event.source.postMessage({ type: 'render', html: previewDocument }, '*');
    }
  });
  function targets() {
    const doc = new DOMParser().parseFromString(original, 'text/html');
    const elements = [doc.body, ...doc.body.querySelectorAll('main, header, footer, nav, section, article, aside, [id]')]
      .filter(el => !['STYLE', 'SCRIPT', 'LINK', 'META', 'TEMPLATE'].includes(el.tagName)).slice(0, 120);
    const path = el => {
      if (el.tagName === 'BODY') return 'body';
      const parts = [];
      while (el && el.tagName !== 'HTML') {
        const tag = el.tagName.toLowerCase();
        const siblings = [...el.parentElement.children].filter(x => x.tagName === el.tagName);
        parts.unshift(tag + ':nth-of-type(' + (siblings.indexOf(el) + 1) + ')');
        el = el.parentElement;
      }
      return parts.join(' > ');
    };
    $('#adapt-target').replaceChildren(...elements.map(el => Object.assign(document.createElement('option'), {
      value: path(el), textContent: el.tagName.toLowerCase() + (el.id ? ' #' + el.id : '') + ' · ' + (el.textContent || '').trim().slice(0, 65)
    })));
    const main = elements.findIndex(el => el.tagName === 'MAIN');
    if (main >= 0) $('#adapt-target').selectedIndex = main;
  }
  function invalidate() {
    revision++; controller?.abort(); candidate = null;
    $('#adapt-apply').disabled = true;
    $('#adapt-preview').hidden = true;
  }
  dialog.querySelectorAll('select, textarea, input').forEach(el => el.addEventListener('input', invalidate));
  dialog.addEventListener('close', () => { revision++; controller?.abort(); });
  $('#adapt-generate').onclick = async () => {
    if (!$('#adapt-consent').checked) { $('#adapt-status').textContent = 'Devam etmek için veri gönderimini onaylayın.'; return; }
    invalidate(); const current = revision; controller = new AbortController();
    $('#adapt-generate').disabled = true;
    $('#adapt-status').textContent = 'Üyelik doğrulanıyor ve bileşen uyarlanıyor…';
    try {
      await requirePro();
      const result = await proRequest('/v1/adapt', { document: original, component: selected,
        target: $('#adapt-target').value, placement: $('#adapt-place').value,
        mode: $('#adapt-mode').value, content: $('#adapt-content').value, provider: $('#adapt-provider').value
      }, { signal: controller.signal });
      if (current !== revision || !dialog.open) return;
      if (!/<html[\s>]/i.test(result.html || '')) throw new Error('Geçerli HTML alınamadı.');
      candidate = result.html;
      // Preview is opaque and cannot navigate the parent, use extension APIs, or load remote scripts.
      previewDocument = '<meta http-equiv="Content-Security-Policy" content="default-src &apos;none&apos;; style-src &apos;unsafe-inline&apos; https:; img-src data: https:; font-src data: https:; script-src &apos;unsafe-inline&apos;; connect-src &apos;none&apos;; form-action &apos;none&apos;; base-uri &apos;none&apos;">' + candidate;
      $('#adapt-preview').src = '../sandbox/preview.html?adapt=' + Date.now();
      $('#adapt-preview').hidden = false;
      $('#adapt-apply').disabled = false;
      $('#adapt-status').textContent = 'Önizlemeyi kontrol edin. Uygula, sonucu stüdyo editörüne aktarır.';
    } catch (e) { if (current === revision) $('#adapt-status').textContent = e.message; }
    finally { $('#adapt-generate').disabled = false; }
  };
  $('#adapt-apply').onclick = async () => {
    if (!candidate || isBusy()) return;
    if (getDocument() !== original) { $('#adapt-status').textContent = 'Belge değişti. Paneli kapatıp uyarlamayı yeniden başlatın.'; return; }
    await applyDocument(candidate);
    applied = getDocument();
    $('#adapt-undo').disabled = false; $('#adapt-apply').disabled = true;
    log('Pro uyarlama editöre uygulandı. Geri al ile önceki belgeye dönebilirsiniz.', 'ok');
  };
  $('#adapt-undo').onclick = async () => {
    if (isBusy()) return;
    if (getDocument() !== applied) { $('#adapt-status').textContent = 'Sonradan düzenleme yapıldı; geri alma bu değişiklikleri silebilir. Önce dosyanızı indirin.'; return; }
    await applyDocument(original);
    $('#adapt-undo').disabled = true; dialog.close();
  };
  return async entry => {
    if (isBusy()) { log('Önce devam eden üretimin tamamlanmasını bekleyin.', 'warn'); return; }
    try { await requirePro(); }
    catch (e) { log(e.message, 'warn'); openPro(); return; }
    original = getDocument();
    if (!original || !/<body[\s>]/i.test(original)) { log('Önce hedef sayfayı klonlayın veya editörde açın; ardından kütüphaneden Uyarla seçin.', 'warn'); return; }
    selected = entry; candidate = null; applied = null;
    $('#adapt-name').textContent = entry.name;
    $('#adapt-status').textContent = ''; $('#adapt-consent').checked = false;
    $('#adapt-apply').disabled = true; $('#adapt-undo').disabled = true; $('#adapt-preview').hidden = true;
    targets(); dialog.showModal();
  };
}
