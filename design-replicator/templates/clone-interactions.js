/* Design Replicator — klonlanan statik sayfaya genel, güvenli etkileşimler.
   Yalnızca standart ARIA sözleşmelerine dayanır; sitenin özel JS'ini taklit etmez. */
(function () {
  'use strict';
  var d = document;

  // 1) Sayfa içi bağlantılarda yumuşak kaydırma
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var t = d.getElementById(id) || d.getElementsByName(id)[0];
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
  });

  // 2) aria-controls + aria-expanded (menü, akordeon, açılır liste)
  d.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[aria-controls][aria-expanded]');
    if (!b) return;
    var ids = b.getAttribute('aria-controls').split(/\s+/);
    var open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    ids.forEach(function (id) {
      var t = d.getElementById(id);
      if (!t) return;
      if (open) t.removeAttribute('hidden'); else t.setAttribute('hidden', '');
    });
  });

  // 3) Sekmeler (role=tab / tabpanel)
  d.addEventListener('click', function (e) {
    var tab = e.target.closest && e.target.closest('[role="tab"]');
    if (!tab) return;
    var list = tab.closest('[role="tablist"]');
    if (!list) return;
    list.querySelectorAll('[role="tab"]').forEach(function (x) {
      var on = x === tab;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      var p = x.getAttribute('aria-controls') && d.getElementById(x.getAttribute('aria-controls'));
      if (p) { if (on) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); }
    });
  });

  // 4) Esc: açık <dialog> ve aria-expanded menüleri kapat
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    d.querySelectorAll('[aria-controls][aria-expanded="true"]').forEach(function (b) { b.click(); });
  });

  // 5) Formlar: sunucu olmadığından gönderimi engelle ve kullanıcıya bildir
  d.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.getAttribute('data-dr-allow')) return;
    var action = f.getAttribute('action') || '';
    if (/^https?:/i.test(action) || f.method === 'post') {
      e.preventDefault();
      var n = d.createElement('div');
      n.textContent = 'Demo: form gönderimi bu kopyada devre dışı.';
      n.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#111;color:#fff;padding:12px 20px;border-radius:24px;font:600 14px system-ui;z-index:2147483647';
      d.body.appendChild(n);
      setTimeout(function () { n.remove(); }, 2600);
    }
  });
})();
