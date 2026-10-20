// 1001 bileşenlik referans seti üretici (deterministik).
//   node tools/build-dataset.mjs
// Çıktı: dataset/components.json, dataset/meta.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTES, RADII, SHADOWS, FONTS, DENSITIES, POOL, mulberry32 } from './dataset/core.mjs';
import { TEMPLATES_A } from './dataset/templates-a.mjs';
import { TEMPLATES_B } from './dataset/templates-b.mjs';

const TOTAL = 1001;
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATES = [...TEMPLATES_A, ...TEMPLATES_B];

const pick = (arr, k) => arr[((k % arr.length) + arr.length) % arr.length];
const poolFor = (k) => ({
  brand: pick(POOL.brand, k),
  head: pick(POOL.head, k * 3),
  sub: pick(POOL.sub, k * 5),
  cta: pick(POOL.cta, k * 7),
  name: (j = 0) => pick(POOL.names, k + j * 3),
  role: (j = 0) => pick(POOL.roles, k + j * 2),
  item: (j = 0) => pick(POOL.items, k + j * 3),
  quote: (j = 0) => pick(POOL.quotes, k + j),
  topic: (j = 0) => pick(POOL.topics, k + j),
  faqs: (n) => Array.from({ length: n }, (_, j) => pick(POOL.faqs, k + j)),
  price: (j = 0) => '$' + (9 + ((k * 7 + j * 13) % 90)),
});

const baseCss = `&{box-sizing:border-box;font-family:var(--font);font-size:16px;line-height:1.5;color:var(--text);background:var(--bg);padding:var(--pad)}
& *,& *::before,& *::after{box-sizing:inherit;margin:0}
& button,& input,& textarea,& select{font:inherit;color:inherit}
& :focus-visible{outline:3px solid var(--accent);outline-offset:2px}`;

const tokensBlock = (pal, rad, shadow, font, dens) =>
  `&{--bg:${pal.bg};--surface:${pal.surface};--text:${pal.text};--muted:${pal.muted};--primary:${pal.primary};--on-primary:${pal.onPrimary};--border:${pal.border};--accent:${pal.accent};--radius:${Math.min(rad.v, 28)}px;--radius-ctl:${rad.v >= 999 ? '999px' : rad.v + 'px'};--shadow:${shadow.v};--font:${font.v};--pad:${dens.pad}px;--gap:${dens.gap}px}`;

const minify = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '\n').replace(/\n{2,}/g, '\n').trim();

const entries = [];
const used = new Map(TEMPLATES.map((t) => [t.cat, new Set()]));
const counts = new Map(TEMPLATES.map((t) => [t.cat, 0]));

for (let k = 0; k < TOTAL; k++) {
  const t = TEMPLATES[k % TEMPLATES.length];
  const nth = counts.get(t.cat);
  counts.set(t.cat, nth + 1);
  const layoutIdx = nth % t.layouts.length;
  const layout = t.layouts[layoutIdx];
  const rnd = mulberry32(k * 7919 + 13);

  // Aynı kategori içinde (düzen, palet, yarıçap, gölge, yazı tipi, yoğunluk) birleşimi tekrarlanmasın
  let pal, rad, shadow, font, dens, sig, tries = 0;
  do {
    pal = pick(PALETTES, Math.floor(rnd() * 1e6));
    rad = pick(RADII, Math.floor(rnd() * 1e6));
    shadow = pick(SHADOWS, Math.floor(rnd() * 1e6));
    font = pick(FONTS, Math.floor(rnd() * 1e6));
    dens = pick(DENSITIES, Math.floor(rnd() * 1e6));
    sig = [layoutIdx, pal.name, rad.name, shadow.name, font.name, dens.name].join('|');
  } while (used.get(t.cat).has(sig) && ++tries < 500);
  used.get(t.cat).add(sig);

  const cls = `c-${t.cat}-${String(nth + 1).padStart(2, '0')}`;
  const p = poolFor(k);
  const inner = layout.h(p);
  const html = `<div class="${cls}">${inner}</div>`;
  const css = minify(`${tokensBlock(pal, rad, shadow, font, dens)}\n${baseCss}\n${layout.c}`).replaceAll('&', '.' + cls);
  const js = layout.j ? `(() => {\n  const root = document.querySelector('.${cls}');\n  if (!root) return;\n  ${layout.j}\n})();` : '';

  entries.push({
    id: 'cmp-' + String(k + 1).padStart(4, '0'),
    category: t.cat,
    categoryTitle: t.title,
    name: `${t.title} · ${layout.n} · ${pal.name} · ${rad.name}`,
    layout: layout.n,
    tags: [...new Set([...t.tags, layout.n.toLowerCase().replace(/\s+/g, '-'), pal.name.toLowerCase(), pal.mode, rad.name, shadow.name + '-shadow', font.name, dens.name])],
    description: `${t.title} (${layout.n}): ${layout.d} Styled with the ${pal.name} ${pal.mode} palette (primary ${pal.primary}, background ${pal.bg}), ${rad.name} corners, ${shadow.name} shadow, ${font.name} typography and ${dens.name} spacing.`,
    tokens: {
      palette: pal.name, mode: pal.mode,
      colors: { primary: pal.primary, onPrimary: pal.onPrimary, bg: pal.bg, surface: pal.surface, text: pal.text, muted: pal.muted, border: pal.border, accent: pal.accent },
      radius: rad.v, radiusName: rad.name, shadow: shadow.name, font: font.name, density: dens.name,
    },
    interactive: !!js,
    html, css, js,
  });
}

// Benzersiz ad: tekrar eden adlara gölge/yazı tipi/yoğunluk eklenir
const seen = new Map();
for (const e of entries) {
  const n = seen.get(e.name) || 0;
  seen.set(e.name, n + 1);
  if (n) e.name += ` · ${e.tokens.shadow}/${e.tokens.font}/${e.tokens.density}`;
}
const names = new Set();
for (const e of entries) { while (names.has(e.name)) e.name += ' ·'; names.add(e.name); }

fs.mkdirSync(path.join(ROOT, 'dataset'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'dataset', 'components.json'), JSON.stringify(entries));

const cats = TEMPLATES.map((t) => ({ category: t.cat, title: t.title, layouts: t.layouts.map((l) => l.n), count: counts.get(t.cat) }));
const meta = {
  name: '1001 component reference set',
  version: '1.0.0',
  count: entries.length,
  interactive: entries.filter((e) => e.interactive).length,
  license: 'MIT',
  generator: 'tools/build-dataset.mjs (deterministic: hand-written component templates x layout variants x 14 palettes x radius/shadow/font/density tokens)',
  categories: cats,
  palettes: PALETTES.map((p) => ({ name: p.name, mode: p.mode, primary: p.primary })),
  schema: ['id', 'category', 'categoryTitle', 'name', 'layout', 'tags', 'description', 'tokens', 'interactive', 'html', 'css', 'js'],
};
fs.writeFileSync(path.join(ROOT, 'dataset', 'meta.json'), JSON.stringify(meta, null, 2));
const size = fs.statSync(path.join(ROOT, 'dataset', 'components.json')).size;
console.log(`entries=${entries.length} categories=${cats.length} interactive=${meta.interactive} size=${(size / 1e6).toFixed(2)}MB`);
