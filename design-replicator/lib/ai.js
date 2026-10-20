import { blobToDataURL } from './util.js';

export const MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (önerilen)' },
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (en yüksek kalite)' },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (hızlı / ucuz)' },
];

export const SYSTEM_PROMPT = `You are a senior front-end engineer and a pixel-perfect UI replicator.

TASK
Rebuild the design shown in the reference image as ONE self-contained, fully working HTML file (inline <style> and <script>; no build step; no frameworks).

RULES
1. FIDELITY FIRST. Reproduce layout, spacing, alignment, sizes, radii, borders, shadows, typography (family, size, weight, line-height, letter-spacing) and EXACT colors. If a design-token list is provided, use those exact hex values; otherwise sample colors from the image as precisely as you can. Declare colors, spacing and radii as CSS custom properties on :root.
2. Copy every visible piece of text verbatim (same language, casing, punctuation). Never translate, shorten or "improve" copy. No lorem ipsum.
3. MAKE IT WORK with vanilla JS: mobile menu, dropdowns, tabs, accordions, modals, carousels/sliders, search/filter, form validation with inline messages, toggles, like/save/favorite buttons with state, toasts, smooth anchor scrolling, hover/focus/active/disabled states, keyboard accessibility (visible focus rings, Esc closes overlays, arrow keys in tabs/menus). Persist user state with localStorage inside try/catch.
4. RESPONSIVE: match the reference exactly at the stated viewport width; below it degrade gracefully with flex/grid, clamp() and media queries (1024 / 768 / 480).
5. IMAGES: if image URLs are listed, use them exactly (with width/height or aspect-ratio to avoid layout shift). If none are listed, draw photos and illustrations as CSS gradients or inline SVG built from the sampled colors, and icons as inline SVG.
6. FONTS: use the identified families with a robust system fallback stack; add a Google Fonts <link> only when the family is a Google font.
7. Semantic, accessible markup (landmarks, alt text, labels, aria-*).
8. OUTPUT ONLY the complete document inside a single \`\`\`html fenced block. No commentary before or after it.`;

/** Görseli API sınırlarına (<=5MB, uzun kenar <=1568px) uygun JPEG'e çevirir. */
export async function prepareImage(blob, maxEdge = 1568) {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const cv = new OffscreenCanvas(w, h);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const out = await cv.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  const dataUrl = await blobToDataURL(out);
  const origin = { width: bmp.width, height: bmp.height };
  bmp.close?.();
  return { mediaType: 'image/jpeg', base64: dataUrl.split(',')[1], width: w, height: h, origin };
}

export function buildTabPrompt(s, hasImage) {
  const lines = [];
  lines.push(`Source page: ${s.title || ''} — ${s.url}`);
  lines.push(`Reference viewport: ${s.viewport.w}x${s.viewport.h}px (device pixel ratio ${s.viewport.dpr}). The page's full height is ${s.viewport.scrollH}px.`);
  lines.push(hasImage
    ? 'The attached screenshot shows the visible viewport. Replicate it exactly, then continue the page below the fold in the same style using the outline.'
    : 'No screenshot is available; rebuild the page from the structural outline below.');
  lines.push('\nDESIGN TOKENS (measured from computed styles, ordered by importance):');
  lines.push('Text colors: ' + s.tokens.text.join(', '));
  lines.push('Background colors: ' + s.tokens.bg.join(', '));
  lines.push('Border colors: ' + s.tokens.border.join(', '));
  lines.push('Fonts (family / size / weight): ' + s.tokens.fonts.join(' | '));
  if (s.images.length) {
    lines.push('\nIMAGES (x,y,w,h → url). Use these URLs as-is:');
    s.images.forEach((i) => lines.push(`[${i.r.join(',')}] ${i.url}`));
  }
  lines.push('\nSTRUCTURAL OUTLINE (tag#id.class [x,y,w,h] "own text" {computed styles}); coordinates are page pixels:');
  lines.push(s.outline);
  lines.push('\nNow produce the single-file HTML replica.');
  return lines.join('\n');
}

export function buildImagePrompt({ width, height, palette, note }) {
  const lines = [
    `The attached image (${width}x${height}px) is the design to replicate. Treat it as the desktop reference at ${Math.min(width, 1440)}px viewport width.`,
    'Identify every section, component, icon, text block and decorative element; infer the fonts and spacing grid; then rebuild it.',
  ];
  if (palette?.length) lines.push('Dominant colors sampled from the image (use them as the base of your palette; refine others by eye): ' + palette.map((c) => `${c.hex} (${c.pct}%)`).join(', '));
  if (note) lines.push('Extra instructions from the user: ' + note);
  lines.push('Now produce the single-file HTML replica.');
  return lines.join('\n');
}

/** Yanıttan ```html bloğunu (kesilmişse de) çıkarır. */
export function pullHtml(text) {
  let m = text.match(/```(?:html)?[ \t]*\r?\n([\s\S]*?)(?:```|$)/i);
  let html = m ? m[1] : text;
  const i = html.search(/<!doctype html|<html[\s>]/i);
  if (i > 0) html = html.slice(i);
  return html.trim();
}

/** Claude Messages API — SSE akışı. onText(chunk, total) çağrılır. */
export async function streamClaude({ apiKey, model, maxTokens, system, content, signal, onText, baseUrl = 'https://api.anthropic.com' }) {
  const res = await fetch(baseUrl.replace(/\/+$/, '') + '/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      system,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) {
    let msg = await res.text();
    try { msg = JSON.parse(msg).error?.message || msg; } catch { /* düz metin */ }
    throw new Error(`API ${res.status}: ${msg}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let text = '';
  let stop = null;
  let usage = {};
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let ev;
      try { ev = JSON.parse(payload); } catch { continue; }
      if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
        text += ev.delta.text;
        onText?.(ev.delta.text, text);
      } else if (ev.type === 'message_start') {
        usage = { ...usage, ...ev.message?.usage };
      } else if (ev.type === 'message_delta') {
        stop = ev.delta?.stop_reason || stop;
        usage = { ...usage, ...ev.usage };
      } else if (ev.type === 'error') {
        throw new Error(ev.error?.message || 'Akış hatası');
      }
    }
  }
  return { text, stopReason: stop, usage };
}

/* ------------------------------------------------------------------ */
/* Sağlayıcı soyutlaması: claude | openai | gemini | ollama | lmstudio */
/* ------------------------------------------------------------------ */
export const PROVIDERS = {
  claude: { label: 'Claude API (bulut)', needsKey: true, baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-5-5' },
  openai: { label: 'OpenAI (bulut)', needsKey: true, baseUrl: 'https://api.openai.com', model: 'gpt-4.1' },
  gemini: { label: 'Google Gemini (bulut)', needsKey: true, baseUrl: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash' },
  ollama: { label: 'Ollama (yerel)', needsKey: false, baseUrl: 'http://localhost:11434', model: 'qwen2.5vl:7b' },
  lmstudio: { label: 'LM Studio (yerel)', needsKey: false, baseUrl: 'http://localhost:1234', model: '' },
};

/** Claude biçimli içeriği [{type:'image',source},{type:'text'}] -> {text, images[]} */
function splitContent(content) {
  let text = '';
  const images = [];
  for (const c of content) {
    if (c.type === 'text') text += (text ? '\n\n' : '') + c.text;
    else if (c.type === 'image') images.push({ mediaType: c.source.media_type, base64: c.source.data });
  }
  return { text, images };
}

async function* readLines(res) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      yield buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
    }
  }
  if (buf.trim()) yield buf.trim();
}

async function failIfBad(res, who) {
  if (res.ok) return;
  let msg = await res.text();
  try { const j = JSON.parse(msg); msg = j.error?.message || (typeof j.error === 'string' ? j.error : '') || msg; } catch { /* düz metin */ }
  if (res.status === 403 && who === 'Ollama') msg += ' (Ollama Origin reddetti — uzantıyı yeniden yükleyin ya da OLLAMA_ORIGINS="chrome-extension://*" ayarlayın)';
  if (res.status === 401) msg += ' (API anahtarını kontrol edin)';
  throw new Error(`${who} ${res.status}: ${msg}`);
}

const trimUrl = (u) => u.replace(/\/+$/, '');
const mapStop = (s) => (s === 'length' || s === 'MAX_TOKENS' ? 'max_tokens' : s);

async function streamOllama({ baseUrl, model, maxTokens, system, content, signal, onText, numCtx }) {
  const { text: userText, images } = splitContent(content);
  let res;
  try {
    res = await fetch(trimUrl(baseUrl) + '/api/chat', {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userText, ...(images.length ? { images: images.map((i) => i.base64) } : {}) },
        ],
        options: { num_predict: maxTokens, num_ctx: numCtx || 16384, temperature: 0.3 },
      }),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error(`Ollama'ya ulaşılamadı (${baseUrl}). Çalışıyor mu? ${e.message}`);
  }
  await failIfBad(res, 'Ollama');
  let text = '', stop = null, usage = {};
  for await (const line of readLines(res)) {
    if (!line) continue;
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.error) throw new Error(ev.error);
    const piece = ev.message?.content || '';
    if (piece) { text += piece; onText?.(piece, text); }
    if (ev.done) { stop = ev.done_reason || 'stop'; usage = { input_tokens: ev.prompt_eval_count, output_tokens: ev.eval_count }; }
  }
  return { text, stopReason: mapStop(stop), usage };
}

/** OpenAI Chat Completions + LM Studio (OpenAI uyumlu). vendor: 'openai' | 'lmstudio' */
async function streamOpenAICompat({ baseUrl, model, maxTokens, system, content, signal, onText, apiKey, vendor = 'lmstudio' }) {
  const { text: userText, images } = splitContent(content);
  const userContent = images.length
    ? [...images.map((i) => ({ type: 'image_url', image_url: { url: `data:${i.mediaType};base64,${i.base64}` } })), { type: 'text', text: userText }]
    : userText;
  const isOpenAI = vendor === 'openai';
  const who = isOpenAI ? 'OpenAI' : 'LM Studio';
  const body = {
    model: model || undefined, // LM Studio: boşsa yüklü modeli kullanır
    stream: true,
    messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }],
  };
  if (isOpenAI) {
    // Yeni model aileleri max_tokens'ı reddeder ve temperature'ı sabitler.
    body.max_completion_tokens = maxTokens;
    body.stream_options = { include_usage: true };
  } else {
    body.max_tokens = maxTokens;
    body.temperature = 0.3;
  }
  let res;
  try {
    res = await fetch(trimUrl(baseUrl).replace(/\/v1$/, '') + '/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error(`${who} sunucusuna ulaşılamadı (${baseUrl}). ${e.message}`);
  }
  await failIfBad(res, who);
  let text = '', stop = null, usage = {};
  for await (const line of readLines(res)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    let ev;
    try { ev = JSON.parse(payload); } catch { continue; }
    if (ev.error) throw new Error(ev.error.message || String(ev.error));
    const ch = ev.choices?.[0];
    const piece = ch?.delta?.content || '';
    if (piece) { text += piece; onText?.(piece, text); }
    if (ch?.finish_reason) stop = ch.finish_reason;
    if (ev.usage) usage = { input_tokens: ev.usage.prompt_tokens, output_tokens: ev.usage.completion_tokens };
  }
  return { text, stopReason: mapStop(stop), usage };
}

/** Google Gemini (Generative Language API) — SSE akışı */
async function streamGemini({ baseUrl, model, maxTokens, system, content, signal, onText, apiKey }) {
  const { text: userText, images } = splitContent(content);
  const url = `${trimUrl(baseUrl)}/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey || '' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [...images.map((i) => ({ inline_data: { mime_type: i.mediaType, data: i.base64 } })), { text: userText }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
      }),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error(`Gemini sunucusuna ulaşılamadı (${baseUrl}). ${e.message}`);
  }
  await failIfBad(res, 'Gemini');
  let text = '', stop = null, usage = {};
  for await (const line of readLines(res)) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (!payload) continue;
    let ev;
    try { ev = JSON.parse(payload); } catch { continue; }
    if (ev.error) throw new Error(ev.error.message || 'Gemini hatası');
    const cand = ev.candidates?.[0];
    for (const part of cand?.content?.parts || []) {
      if (part.thought || typeof part.text !== 'string') continue; // "düşünme" parçalarını atla
      text += part.text;
      onText?.(part.text, text);
    }
    if (cand?.finishReason) stop = cand.finishReason;
    if (ev.usageMetadata) usage = { input_tokens: ev.usageMetadata.promptTokenCount, output_tokens: ev.usageMetadata.candidatesTokenCount };
  }
  if (!text && stop && stop !== 'STOP' && stop !== 'MAX_TOKENS') throw new Error('Gemini yanıtı engelledi: ' + stop);
  return { text, stopReason: mapStop(stop), usage };
}

/** Sağlayıcının model listesini getirir (ayarlar sayfası ve stüdyo için). */
export async function listModels(provider, baseUrl, apiKey = '') {
  const b = trimUrl(baseUrl).replace(/\/v1$/, '');
  if (provider === 'ollama') {
    const r = await fetch(b + '/api/tags');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return ((await r.json()).models || []).map((m) => m.name);
  }
  if (provider === 'gemini') {
    const r = await fetch(b + '/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': apiKey } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return ((await r.json()).models || [])
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''));
  }
  if (provider === 'claude') {
    const r = await fetch(b + '/v1/models', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return ((await r.json()).data || []).map((m) => m.id);
  }
  const r = await fetch(b + '/v1/models', { headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {} });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  let ids = ((await r.json()).data || []).map((m) => m.id);
  if (provider === 'openai') ids = ids.filter((id) => /^(gpt|o\d|chatgpt)/i.test(id) && !/embedding|whisper|tts|dall|moderation|audio|realtime|transcribe/i.test(id)).sort();
  return ids;
}
export const listLocalModels = listModels; // geriye dönük uyumluluk

/**
 * Tek giriş noktası. cfg: { provider, baseUrl, apiKey, model, maxTokens, numCtx }
 * Görsel girdi için modelin vision desteklemesi gerekir.
 */
export function streamModel(cfg, { system, content, signal, onText }) {
  const common = { baseUrl: cfg.baseUrl, model: cfg.model, maxTokens: cfg.maxTokens, system, content, signal, onText };
  switch (cfg.provider) {
    case 'ollama': return streamOllama({ ...common, numCtx: cfg.numCtx });
    case 'lmstudio': return streamOpenAICompat({ ...common, apiKey: cfg.apiKey, vendor: 'lmstudio' });
    case 'openai': return streamOpenAICompat({ ...common, apiKey: cfg.apiKey, vendor: 'openai' });
    case 'gemini': return streamGemini({ ...common, apiKey: cfg.apiKey });
    default: return streamClaude({ ...common, apiKey: cfg.apiKey });
  }
}
