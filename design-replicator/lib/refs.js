// Referans bileşen kütüphanesi: yükleme, ilgili örnekleri seçme (prompt'a gömmek için),
// kullanıcı kütüphanesi ve ince ayar / eğitim verisi dışa aktarma.
//
// Giriş şeması (dataset/components.json): id, category, categoryTitle, name, layout, tags[], description,
// tokens{palette,mode,colors{primary,onPrimary,bg,surface,text,muted,border,accent},radius,shadow,font,density},
// interactive, html, css, js

let builtinP;
export function loadBuiltin() {
  return (builtinP ||= fetch(new URL('../dataset/components.json', import.meta.url)).then((r) => {
    if (!r.ok) throw new Error('Referans seti okunamadı: HTTP ' + r.status);
    return r.json();
  }));
}

export async function loadUserRefs() {
  const { userRefs } = await chrome.storage.local.get('userRefs');
  return Array.isArray(userRefs) ? userRefs : [];
}
export async function loadLibrary({ includeUser = true } = {}) {
  const [b, u] = await Promise.all([loadBuiltin(), includeUser ? loadUserRefs() : []]);
  return [...u, ...b];
}

/* ---------- kullanıcı kütüphanesi ---------- */
const clip = (s, n) => (s || '').slice(0, n);
export function normalizeEntry(o, i = 0) {
  if (!o || typeof o !== 'object' || !(o.html || o.css)) return null;
  const cat = String(o.category || 'custom').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'custom';
  return {
    id: String(o.id || `user-${Date.now().toString(36)}-${i}`),
    category: cat,
    categoryTitle: o.categoryTitle || cat,
    name: clip(o.name || `${cat} ${i + 1}`, 120),
    layout: o.layout || 'Custom',
    tags: Array.isArray(o.tags) ? o.tags.map(String).slice(0, 24) : [cat],
    description: clip(o.description || `${cat} component`, 600),
    tokens: o.tokens && o.tokens.colors ? o.tokens : { palette: 'custom', mode: 'light', colors: {}, radius: 0, shadow: '', font: '', density: '' },
    interactive: !!o.js,
    html: clip(o.html, 80000), css: clip(o.css, 80000), js: clip(o.js, 80000),
    user: true,
  };
}
export async function saveUserRefs(list) { await chrome.storage.local.set({ userRefs: list }); }
export async function addUserRef(entry) {
  const list = await loadUserRefs();
  const e = normalizeEntry(entry, list.length);
  if (!e) throw new Error('Geçersiz bileşen (html ya da css gerekli).');
  list.unshift(e);
  await saveUserRefs(list);
  return e;
}
/** .json (dizi) ya da .jsonl metnini içe aktarır; eklenen sayıyı döner. */
export async function importUserRefs(text) {
  let items = [];
  const t = text.trim();
  if (t.startsWith('[')) items = JSON.parse(t);
  else items = t.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const cur = await loadUserRefs();
  const seen = new Set(cur.map((e) => e.id));
  let added = 0;
  items.forEach((o, i) => {
    const e = normalizeEntry(o, cur.length + i);
    if (!e) return;
    while (seen.has(e.id)) e.id += '-x';
    seen.add(e.id); cur.unshift(e); added++;
  });
  await saveUserRefs(cur);
  return added;
}

/* ---------- ilgili örnekleri seçme ---------- */
const CATEGORY_HINTS = [
  ['navbar', /\b(navbar|navigation|nav|menu|header|logo)\b/g], ['hero', /\b(hero|headline|welcome|landing|get started|learn more)\b/g],
  ['pricing-card', /\b(pricing|plans?|per month|\/mo|billing|subscription)\b/g], ['pricing-toggle', /\b(monthly|yearly|annual)\b/g],
  ['footer', /\b(footer|copyright|©|privacy|terms)\b/g], ['login-form', /\b(sign in|log in|login|password|forgot)\b/g],
  ['signup-form', /\b(sign up|register|create (an )?account)\b/g], ['contact-form', /\b(contact|message|get in touch)\b/g],
  ['search-bar', /\b(search|filter)\b/g], ['modal', /\b(modal|dialog|popup|confirm)\b/g], ['tabs', /\btabs?\b/g],
  ['accordion', /\b(faq|accordion|frequently asked|expand)\b/g], ['carousel', /\b(carousel|slider|slide|slideshow)\b/g],
  ['testimonial', /\b(testimonials?|reviews?|customers say|quote)\b/g], ['features', /\b(features?|benefits|why choose)\b/g],
  ['stats', /\b(stats|metrics|kpi|analytics|revenue|uptime)\b/g], ['table', /\b(table|invoice|rows?|orders)\b/g],
  ['product-card', /\b(add to cart|buy now|price|shop|product|cart)\b/g], ['profile-card', /\b(follow|followers|profile|bio)\b/g],
  ['gallery', /\b(gallery|photos?|images?|pins?|pinterest|masonry)\b/g], ['newsletter', /\b(newsletter|subscribe)\b/g],
  ['cta', /\b(call to action|join now|start free|book a demo)\b/g], ['sidebar', /\b(sidebar|dashboard|workspace)\b/g],
  ['chat', /\b(chat|messenger|support|reply)\b/g], ['timeline', /\b(timeline|roadmap|history)\b/g],
  ['pagination', /\b(pagination|next|previous|page \d)\b/g], ['breadcrumb', /\b(breadcrumb|home\s*[>\/])\b/g],
  ['avatar', /\b(avatar|online|members)\b/g], ['toast', /\b(toast|snackbar|notification)\b/g],
  ['button', /\b(button|cta)\b/g], ['card', /\bcards?\b/g], ['alert', /\b(alert|warning|error|success)\b/g],
  ['badge', /\b(badge|tag|chip|status)\b/g], ['progress', /\b(progress|step \d|loading)\b/g], ['rating', /\b(rating|stars?|rate)\b/g],
];
const STOP = new Set('the and for with that this from your you are our all can will not but have has was new more one its into out get'.split(' '));
const words = (s) => (s.toLowerCase().match(/[a-zçğıöşü]{3,}/g) || []).filter((w) => !STOP.has(w));

const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const size = (e) => e.html.length + e.css.length + e.js.length;

/**
 * Sorguya uygun örnekleri seçer.
 * opts: { text, colors: ['#rrggbb'], k, maxChars, pinned: [id], diverse }
 */
export function selectRefs(lib, { text = '', colors = [], k = 4, maxChars = 9000, pinned = [] } = {}) {
  const lower = text.toLowerCase();
  const catScore = new Map();
  for (const [cat, re] of CATEGORY_HINTS) {
    const m = lower.match(re);
    if (m) catScore.set(cat, Math.min(m.length, 4));
  }
  const qWords = new Set(words(text).slice(0, 400));
  const cols = colors.map(hexRgb).filter(Boolean);
  const STARTER_BIAS = new Set(['navbar', 'hero', 'card', 'button', 'footer', 'features', 'cta', 'pricing-card']);
  const noCat = catScore.size === 0;

  const scored = lib.map((e) => {
    let s = (catScore.get(e.category) || 0) * 3;
    let hits = 0;
    for (const t of e.tags || []) if (qWords.has(t)) hits += 1.5;
    for (const w of words(e.name)) if (qWords.has(w)) hits += 1;
    s += Math.min(hits, 6);
    if (cols.length && e.tokens && e.tokens.colors && e.tokens.colors.primary) {
      const ec = [hexRgb(e.tokens.colors.primary), hexRgb(e.tokens.colors.bg), hexRgb(e.tokens.colors.accent)].filter(Boolean);
      let best = 441;
      for (const c of cols) for (const x of ec) best = Math.min(best, dist(c, x));
      s += 2 * (1 - best / 441); // 0..2 renk yakınlığı bonusu
    }
    if (noCat && STARTER_BIAS.has(e.category)) s += 1.2; // ipucu yoksa temel yerleşim örnekleri
    if (e.user) s += 1.5; // kullanıcı kütüphanesi öncelikli
    return { e, s };
  });

  const out = [];
  const used = new Set();
  let budget = maxChars;
  const take = (e) => {
    if (used.has(e.id)) return false;
    const sz = size(e);
    if (sz > budget && out.length) return false;
    used.add(e.id); out.push(e); budget -= sz; return true;
  };
  for (const id of pinned) { const e = lib.find((x) => x.id === id); if (e) take(e); }

  const perCat = new Map();
  const hasSignal = catScore.size > 0 || qWords.size > 0 || cols.length > 0;
  const order = scored.sort((a, b) => b.s - a.s || (a.e.id < b.e.id ? -1 : 1));
  const starter = ['navbar', 'hero', 'card', 'button', 'footer', 'login-form'];
  const pool = hasSignal ? order : order.sort((a, b) => starter.indexOf(a.e.category) - starter.indexOf(b.e.category) || a.s - b.s).filter((x) => starter.includes(x.e.category));
  for (const { e } of pool) {
    if (out.length >= k) break;
    if ((perCat.get(e.category) || 0) >= 2) continue;
    if (take(e)) perCat.set(e.category, (perCat.get(e.category) || 0) + 1);
  }
  return out;
}

export function formatRefs(list) {
  if (!list.length) return '';
  const head = [
    'REFERENCE COMPONENT LIBRARY',
    'The following are vetted, working components from the project design library. Use them as a guide for markup structure, CSS custom-property tokens, accessibility attributes (roles, aria-*), interaction patterns and JavaScript style.',
    'Do NOT copy them blindly: adapt colors, spacing, copy and layout so the result matches the TARGET design exactly.',
  ];
  const blocks = list.map((e, i) => {
    const t = e.tokens || {};
    const c = t.colors || {};
    const tok = c.primary ? ` — tokens: primary ${c.primary}, bg ${c.bg}, text ${c.text}, radius ${t.radius}px, ${t.font || ''} font` : '';
    return `### REF ${i + 1}: ${e.name} (${e.category})${tok}\n\`\`\`html\n${e.html}\n\`\`\`\n\`\`\`css\n${e.css}\n\`\`\`${e.js ? `\n\`\`\`js\n${e.js}\n\`\`\`` : ''}`;
  });
  return head.join('\n') + '\n\n' + blocks.join('\n\n');
}

/** Önizleme/Editör için tek belge */
export function entryDocument(e, { page = false } = {}) {
  const bg = (e.tokens && e.tokens.colors && e.tokens.colors.bg) || '#ffffff';
  const wrap = page ? `html,body{margin:0}body{min-height:100vh;display:grid;place-items:center;background:${bg}}` : '';
  return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${(e.name || 'component').replace(/</g, '&lt;')}</title>\n<style>${wrap}\n${e.css}\n</style></head>\n<body>\n${e.html}\n${e.js ? `<script>\n${e.js}\n</script>\n` : ''}</body></html>`;
}

/* ---------- eğitim / ince ayar verisi ---------- */
export const TRAIN_SYSTEM = 'You are a senior front-end engineer. Produce one self-contained, accessible, working HTML component (an inline <style> block, the markup, and an inline <script> only when interaction is required) that follows the requested design tokens exactly. Return only code.';
const userPrompt = (e) => {
  const t = e.tokens || {}, c = t.colors || {};
  const tok = c.primary ? `\nDesign tokens: primary ${c.primary}, on-primary ${c.onPrimary}, background ${c.bg}, surface ${c.surface}, text ${c.text}, accent ${c.accent}, radius ${t.radius}px, shadow ${t.shadow}, font ${t.font}, spacing ${t.density}.` : '';
  return `Create a ${e.categoryTitle || e.category} component (${e.layout} layout).\nRequirements: ${e.description}${tok}\nReturn only the code.`;
};
const answer = (e) => `<style>\n${e.css}\n</style>\n${e.html}${e.js ? `\n<script>\n${e.js}\n</script>` : ''}`;

export const TRAIN_FORMATS = {
  openai: { label: 'OpenAI chat fine-tuning (JSONL)', ext: 'jsonl' },
  gemini: { label: 'Google Gemini / Vertex tuning (JSONL)', ext: 'jsonl' },
  alpaca: { label: 'Alpaca (JSONL) — Unsloth, Axolotl, LLaMA-Factory', ext: 'jsonl' },
  sharegpt: { label: 'ShareGPT (JSONL)', ext: 'jsonl' },
  ollama: { label: 'Ollama Modelfile (örnekler gömülü)', ext: 'Modelfile' },
};

/** Seçilen biçimde dışa aktarma metni üretir. opts: { limit, base } */
export function buildTraining(lib, format, { limit = 0, base = 'qwen2.5-coder:7b' } = {}) {
  const rows = limit > 0 ? lib.slice(0, limit) : lib;
  const line = (o) => JSON.stringify(o);
  if (format === 'openai') return rows.map((e) => line({ messages: [{ role: 'system', content: TRAIN_SYSTEM }, { role: 'user', content: userPrompt(e) }, { role: 'assistant', content: answer(e) }] })).join('\n') + '\n';
  if (format === 'gemini') return rows.map((e) => line({ systemInstruction: { role: 'system', parts: [{ text: TRAIN_SYSTEM }] }, contents: [{ role: 'user', parts: [{ text: userPrompt(e) }] }, { role: 'model', parts: [{ text: answer(e) }] }] })).join('\n') + '\n';
  if (format === 'alpaca') return rows.map((e) => line({ instruction: userPrompt(e), input: '', output: answer(e), system: TRAIN_SYSTEM })).join('\n') + '\n';
  if (format === 'sharegpt') return rows.map((e) => line({ conversations: [{ from: 'system', value: TRAIN_SYSTEM }, { from: 'human', value: userPrompt(e) }, { from: 'gpt', value: answer(e) }] })).join('\n') + '\n';
  if (format === 'ollama') {
    // Bağlam sınırı nedeniyle kategori başına en küçük örnek, en fazla 12 kategori
    const byCat = new Map();
    for (const e of rows) { const cur = byCat.get(e.category); if (!cur || size(e) < size(cur)) byCat.set(e.category, e); }
    const picks = [...byCat.values()].sort((a, b) => size(a) - size(b)).slice(0, 12);
    const q = (s) => '"""' + s.replace(/"""/g, '"\\"\\"') + '"""';
    return [
      `# Oluşturma: ollama create design-replicator -f Modelfile`,
      `FROM ${base}`,
      `PARAMETER temperature 0.3`,
      `PARAMETER num_ctx 16384`,
      `SYSTEM ${q(TRAIN_SYSTEM)}`,
      ...picks.flatMap((e) => [`MESSAGE user ${q(userPrompt(e))}`, `MESSAGE assistant ${q(answer(e))}`]),
      '',
    ].join('\n');
  }
  throw new Error('Bilinmeyen biçim: ' + format);
}
