// Pin şablonunu örnek veriyle derler (tarayıcıda hızlı test için): node tools/build-sample.js out.html
const fs = require('fs'), path = require('path');
const T = (f) => fs.readFileSync(path.join(__dirname, '..', 'templates', f), 'utf8');
const svg = (c1, c2, w, h) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
const cols = [['#ff9a9e', '#fad0c4'], ['#a18cd1', '#fbc2eb'], ['#84fab0', '#8fd3f4'], ['#fccb90', '#d57eeb'], ['#e0c3fc', '#8ec5fc']];
const related = Array.from({ length: 45 }, (_, i) => { const c = cols[i % 5]; const h = 300 + ((i * 97) % 320); return { id: String(1000 + i), title: 'İlham pin ' + i, image: svg(c[0], c[1], 474, h), w: 474, h, domain: i % 3 ? 'example.com' : '', link: i % 3 ? 'https://example.com' : '' }; });
const data = {
  lang: 'tr', siteName: 'Pinterest',
  pin: { id: '999', url: 'https://www.pinterest.com/pin/999/', title: 'Minimal oturma odası fikirleri', description: 'Sıcak tonlar, doğal dokular ve yumuşak ışıkla huzurlu bir oturma odası. '.repeat(4), link: 'https://example.com/post', domain: 'example.com', color: '#fad0c4', image: { url: svg('#ff9a9e', '#fad0c4', 736, 1100), w: 736, h: 1100 }, likes: 42, author: { name: 'Ayşe Yılmaz', username: 'ayse', avatar: '', followers: 1234 }, board: { name: 'Ev dekorasyonu' } },
  comments: [{ id: 'k1', user: 'Mehmet', text: 'Çok güzel!', ts: Date.now() - 3600e3, likes: 3 }],
  related, palette: [{ hex: '#ff9a9e', pct: 50, text: '#111111' }, { hex: '#fad0c4', pct: 30, text: '#111111' }],
};
const html = T('pin.html').replace('{{LANG}}', 'tr').replace(/\{\{TITLE\}\}/g, () => 'Test').replace('{{CSS}}', () => T('pin.css')).replace('{{JS}}', () => T('pin.js')).replace('{{DATA}}', () => JSON.stringify(data).replace(/</g, '\u003c'));
fs.writeFileSync(process.argv[2] || 'sample.html', html);
console.log('ok', html.length);
