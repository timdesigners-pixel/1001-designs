// İlk boyamadan önce senkron çalışır (klasik script, <head> içinde): kayıtlı temayı uygular, parlamayı önler.
try {
  var t = localStorage.getItem('dr-theme');
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
} catch (e) { /* depolama kapalı */ }
