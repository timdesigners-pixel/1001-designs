// Referans setin yapısal doğrulaması (tarayıcı gerektirmez):  node tools/validate-dataset.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast } from './dataset/core.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'dataset', 'components.json'), 'utf8'));
const problems = [];
const bad = (e, msg) => problems.push(`${e.id} ${e.name}: ${msg}`);

if (data.length !== 1001) problems.push(`beklenen 1001 giriş, bulunan ${data.length}`);
const ids = new Set(), names = new Set(), sigs = new Set();
for (const e of data) {
  for (const k of ['id', 'category', 'name', 'description', 'html', 'css', 'tokens']) if (!e[k]) bad(e, `eksik alan: ${k}`);
  if (ids.has(e.id)) bad(e, 'tekrar eden id'); ids.add(e.id);
  if (names.has(e.name)) bad(e, 'tekrar eden ad'); names.add(e.name);
  const sig = e.html + e.css + e.js;
  // sınıf adı dışında tamamen aynı içerik var mı?
  const norm = sig.replace(/c-[a-z-]+-\d\d/g, 'C');
  if (sigs.has(norm)) bad(e, 'başka bir girişle birebir aynı (sınıf adı hariç)'); sigs.add(norm);

  const all = e.html + e.css + e.js;
  if (/undefined|NaN|\[object Object\]|\$\{/.test(all)) bad(e, 'şablon sızıntısı (undefined/NaN/${})');
  if (e.css.includes('&')) bad(e, 'çözülmemiş & kapsamı');
  const cls = e.html.match(/^<div class="([^"]+)"/)?.[1];
  if (!cls || !e.css.includes('.' + cls)) bad(e, 'kök sınıf CSS ile eşleşmiyor');
  if (e.js && !e.js.includes('.' + cls)) bad(e, 'JS kök sınıfına bağlanmıyor');

  const c = e.tokens.colors;
  const pairs = [['text/bg', c.text, c.bg, 7], ['text/surface', c.text, c.surface, 7], ['onPrimary/primary', c.onPrimary, c.primary, 4.5], ['muted/surface', c.muted, c.surface, 4.5], ['muted/bg', c.muted, c.bg, 4.2]];
  for (const [n, a, b, min] of pairs) { const r = contrast(a, b); if (r < min) bad(e, `kontrast ${n} = ${r.toFixed(2)} < ${min}`); }
}
const byCat = {};
for (const e of data) byCat[e.category] = (byCat[e.category] || 0) + 1;
console.log('kategori başına:', Object.entries(byCat).map(([k, v]) => `${k}:${v}`).join(' '));
console.log(`giriş=${data.length}  etkileşimli=${data.filter((e) => e.interactive).length}  sorun=${problems.length}`);
if (problems.length) { console.log(problems.slice(0, 25).join('\n')); process.exitCode = 1; }
