import { loadSettings, saveSettings } from '../lib/settings.js';
import { listModels, PROVIDERS } from '../lib/ai.js';
import { initTheme } from '../lib/theme.js';
import { loadBuiltin, loadUserRefs, importUserRefs, saveUserRefs, buildTraining, TRAIN_FORMATS } from '../lib/refs.js';
import { downloadBlob } from '../lib/util.js';

const $ = (id) => document.getElementById(id);
const KEYED = ['claude', 'openai', 'gemini'];
let S;

function showPane() {
  const p = document.querySelector('input[name=provider]:checked')?.value || 'claude';
  document.querySelectorAll('.pane').forEach((el) => el.classList.toggle('on', el.dataset.p === p));
}

function fill() {
  document.querySelector(`input[name=provider][value=${S.provider}]`).checked = true;
  for (const p of KEYED) {
    $(`${p}-key`).value = S[p].apiKey;
    $(`${p}-model`).value = S[p].model;
    $(`${p}-url`).value = S[p].baseUrl;
  }
  $('ollama-url').value = S.ollama.baseUrl;
  $('ollama-model').value = S.ollama.model;
  $('lm-url').value = S.lmstudio.baseUrl;
  $('lm-model').value = S.lmstudio.model;
  $('max-tokens').value = S.maxTokens;
  $('num-ctx').value = S.numCtx;
  $('inline').checked = S.inlineAssets;
  $('max-mb').value = S.maxAssetMB;
  $('scripts').value = S.scripts;
  $('autoscroll').checked = S.autoScroll;
  $('refs-on').checked = S.refs.enabled;
  $('refs-count').value = S.refs.count;
  $('refs-chars').value = S.refs.maxChars;
  $('refs-user').checked = S.refs.includeUser;
  showPane();
}

function collect() {
  const out = {
    ...S,
    provider: document.querySelector('input[name=provider]:checked').value,
    ollama: { baseUrl: $('ollama-url').value.trim(), model: $('ollama-model').value.trim() },
    lmstudio: { baseUrl: $('lm-url').value.trim(), model: $('lm-model').value.trim() },
    maxTokens: +$('max-tokens').value || 32000,
    numCtx: +$('num-ctx').value || 16384,
    inlineAssets: $('inline').checked,
    maxAssetMB: +$('max-mb').value || 4,
    scripts: $('scripts').value,
    autoScroll: $('autoscroll').checked,
    refs: { ...S.refs, enabled: $('refs-on').checked, count: Math.max(1, Math.min(10, +$('refs-count').value || 4)), maxChars: +$('refs-chars').value || 9000, includeUser: $('refs-user').checked },
  };
  for (const p of KEYED) out[p] = { apiKey: $(`${p}-key`).value.trim(), model: $(`${p}-model`).value.trim() || PROVIDERS[p].model, baseUrl: $(`${p}-url`).value.trim() || PROVIDERS[p].baseUrl };
  return out;
}

const DL_ID = { claude: 'claude-models', openai: 'openai-models', gemini: 'gemini-models', ollama: 'ollama-models', lmstudio: 'lm-models' };
const MODEL_INPUT = { claude: 'claude-model', openai: 'openai-model', gemini: 'gemini-model', ollama: 'ollama-model', lmstudio: 'lm-model' };

async function test() {
  const c = collect();
  const p = c.provider;
  const out = $('test-out');
  out.textContent = 'Deneniyor…';
  try {
    if (PROVIDERS[p].needsKey && !c[p].apiKey) throw new Error('API anahtarı girilmemiş');
    const names = await listModels(p, c[p].baseUrl, c[p].apiKey);
    const dl = $(DL_ID[p]);
    dl.replaceChildren(...names.map((n) => Object.assign(document.createElement('option'), { value: n })));
    out.textContent = `✓ Bağlandı — ${names.length} model: ${names.slice(0, 6).join(', ')}${names.length > 6 ? '…' : ''}`;
    const model = $(MODEL_INPUT[p]);
    if (!model.value && names[0]) model.value = names[0];
  } catch (e) {
    out.textContent = '✗ ' + (e.message || e);
  }
}

async function refreshCounts() {
  const [b, u] = await Promise.all([loadBuiltin(), loadUserRefs()]);
  $('lib-count').textContent = `· ${b.length} yerleşik + ${u.length} kullanıcı`;
}

async function exportTraining() {
  const out = $('tr-out');
  try {
    const fmt = $('tr-format').value;
    const lib = $('tr-user').checked ? await loadUserRefs() : [...(await loadUserRefs()), ...(await loadBuiltin())];
    if (!lib.length) throw new Error('Dışa aktarılacak bileşen yok.');
    const text = buildTraining(lib, fmt, { limit: +$('tr-limit').value || 0, base: $('tr-base').value.trim() || 'qwen2.5-coder:7b' });
    const info = TRAIN_FORMATS[fmt];
    const name = fmt === 'ollama' ? 'Modelfile' : `design-replicator-${fmt}.${info.ext}`;
    downloadBlob(new Blob([text], { type: fmt === 'ollama' ? 'application/octet-stream' : 'text/plain' }), name);
    out.textContent = `✓ ${name} indirildi (${(text.length / 1e6).toFixed(2)} MB)`;
  } catch (e) {
    out.textContent = '✗ ' + (e.message || e);
  }
}

(async () => {
  initTheme($('theme-btn'));
  S = await loadSettings();
  fill();
  $('tr-format').replaceChildren(...Object.entries(TRAIN_FORMATS).map(([k, v]) => Object.assign(document.createElement('option'), { value: k, textContent: v.label })));
  $('tr-limit').value = 0;
  const baseVis = () => ($('tr-base-wrap').hidden = $('tr-format').value !== 'ollama');
  $('tr-format').addEventListener('change', baseVis);
  baseVis();
  refreshCounts().catch(() => { $('lib-count').textContent = '· yüklenemedi'; });

  document.querySelectorAll('input[name=provider]').forEach((r) => r.addEventListener('change', showPane));
  $('test').addEventListener('click', test);
  $('tr-go').addEventListener('click', exportTraining);
  $('imp').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { const n = await importUserRefs(await f.text()); $('imp-out').textContent = `✓ ${n} bileşen eklendi`; refreshCounts(); } catch (err) { $('imp-out').textContent = '✗ ' + err.message; }
    e.target.value = '';
  });
  document.querySelector('label.file').addEventListener('click', (e) => { if (e.target.id !== 'imp') $('imp').click(); });
  $('clear-user').addEventListener('click', async () => {
    if (!confirm('Kullanıcı kütüphanesindeki tüm bileşenler silinsin mi?')) return;
    await saveUserRefs([]); $('imp-out').textContent = 'Temizlendi'; refreshCounts();
  });
  $('save').addEventListener('click', async () => {
    S = collect();
    await saveSettings(S);
    $('saved').textContent = '✓ Kaydedildi';
    setTimeout(() => ($('saved').textContent = ''), 2000);
  });
})();
