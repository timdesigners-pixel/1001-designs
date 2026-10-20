// Monaco tabanlı kod editörü (HTML / CSS / JS). Yerel paketlenmiş AMD derlemesini kullanır:
// MV3 CSP uzaktan script ve blob: worker'a izin vermediği için worker, dosya tabanlı önyükleyiciyle açılır.
const BASE = new URL('../vendor/monaco/', import.meta.url).href;

let monacoP;
export function loadMonaco() {
  return (monacoP ||= new Promise((resolve, reject) => {
    self.MonacoEnvironment = { getWorkerUrl: () => BASE + 'worker-main.js' };
    const s = document.createElement('script');
    s.src = BASE + 'vs/loader.js';
    s.onload = () => {
      window.require.config({ paths: { vs: BASE + 'vs' } });
      window.require(['vs/editor/editor.main'], () => resolve(window.monaco), (e) => reject(e));
    };
    s.onerror = () => reject(new Error('Monaco yüklenemedi: ' + s.src));
    document.head.appendChild(s);
  }));
}

const LANG = { html: 'html', css: 'css', js: 'javascript' };
const FILE = { html: 'index.html', css: 'style.css', js: 'script.js' };

const CSS_SNIPPETS = [
  ['flexc', 'Flex ortala', 'display: flex;\nalign-items: center;\njustify-content: center;'],
  ['grid', 'Grid kolonlar', 'display: grid;\ngrid-template-columns: repeat(${1:3}, 1fr);\ngap: ${2:16px};'],
  ['fill', 'Mutlak doldur', 'position: absolute;\ninset: 0;'],
  ['mq', '@media max-width', '@media (max-width: ${1:768px}) {\n\t$0\n}'],
  ['mqdark', '@media koyu tema', '@media (prefers-color-scheme: dark) {\n\t$0\n}'],
  ['trans', 'transition', 'transition: ${1:all} ${2:.2s} ${3:ease};'],
  ['ellipsis', 'Tek satır …', 'overflow: hidden;\ntext-overflow: ellipsis;\nwhite-space: nowrap;'],
  ['clamp', 'Akışkan boyut', 'font-size: clamp(${1:1rem}, ${2:2vw + .5rem}, ${3:2rem});'],
  ['glass', 'Cam efekti', 'background: rgba(255, 255, 255, .6);\nbackdrop-filter: blur(${1:12px});\nborder: 1px solid rgba(255, 255, 255, .4);'],
  ['shadow', 'Katmanlı gölge', 'box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.12);'],
  ['anim', '@keyframes', '@keyframes ${1:name} {\n\tfrom { $2 }\n\tto { $0 }\n}'],
  ['vars', ':root değişkenleri', ':root {\n\t--${1:primary}: ${2:#e60023};\n\t--${3:radius}: ${4:16px};\n}'],
];
const JS_SNIPPETS = [
  ['qs', 'querySelector', "const ${1:el} = document.querySelector('${2:.selector}');"],
  ['qsa', 'querySelectorAll.forEach', "document.querySelectorAll('${1:.selector}').forEach((${2:el}) => {\n\t$0\n});"],
  ['on', 'addEventListener', "${1:el}.addEventListener('${2:click}', (${3:e}) => {\n\t$0\n});"],
  ['toggle', 'classList.toggle', "${1:el}.classList.toggle('${2:is-open}');"],
  ['fetchj', 'fetch JSON', "const res = await fetch('${1:/api}');\nif (!res.ok) throw new Error(res.status);\nconst data = await res.json();"],
  ['ls', 'localStorage (güvenli)', "const store = {\n\tget(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },\n\tset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },\n};"],
  ['debounce', 'debounce', 'const debounce = (fn, ms = 200) => {\n\tlet t;\n\treturn (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };\n};'],
  ['io', 'IntersectionObserver', "const io = new IntersectionObserver((entries) => {\n\tentries.forEach((e) => e.isIntersecting && e.target.classList.add('is-visible'));\n}, { threshold: ${1:0.2} });\ndocument.querySelectorAll('${2:.reveal}').forEach((el) => io.observe(el));"],
  ['dcl', 'DOMContentLoaded', "document.addEventListener('DOMContentLoaded', () => {\n\t$0\n});"],
];

let registered = false;
let emmetRegistered = false;
const setupEmmetOnce = (monaco) => { if (!emmetRegistered) { emmetRegistered = true; setupEmmet(monaco); } };
function setupLanguages(monaco) {
  if (registered) return;
  registered = true;
  const ts = monaco.languages.typescript;
  ts.javascriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ES2020, allowNonTsExtensions: true, allowJs: true, checkJs: false, noEmit: true,
    lib: ['es2020', 'dom', 'dom.iterable'],
  });
  ts.javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false });
  ts.javascriptDefaults.setEagerModelSync(true);
  monaco.languages.css.cssDefaults.setOptions({ validate: true, lint: { unknownProperties: 'warning', duplicateProperties: 'warning', emptyRules: 'ignore', vendorPrefix: 'ignore', compatibleVendorPrefixes: 'ignore' } });
  monaco.languages.html.htmlDefaults.setOptions({ format: { tabSize: 2, insertSpaces: true, wrapLineLength: 140, indentInnerHtml: true, endWithNewline: true }, suggest: { html5: true } });

  const kind = monaco.languages.CompletionItemKind;
  const rules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  const snippetProvider = (lang, list) => monaco.languages.registerCompletionItemProvider(lang, {
    provideCompletionItems(model, pos) {
      const w = model.getWordUntilPosition(pos);
      const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn };
      return { suggestions: list.map(([label, detail, text]) => ({ label, detail, kind: kind.Snippet, insertText: text, insertTextRules: rules, range, sortText: '9' + label })) };
    },
  });
  snippetProvider('css', CSS_SNIPPETS);
  snippetProvider('javascript', JS_SNIPPETS);

  // Aynı belgede tanımlı --özel-özellikleri var(--x) olarak öner (tasarım token'ları için)
  monaco.languages.registerCompletionItemProvider('css', {
    triggerCharacters: ['-', '('],
    provideCompletionItems(model, pos) {
      const text = model.getValue();
      const seen = new Map();
      for (const m of text.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)/g)) if (!seen.has(m[1])) seen.set(m[1], m[2].trim());
      const w = model.getWordUntilPosition(pos);
      const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn };
      return {
        suggestions: [...seen].map(([name, val]) => ({
          label: { label: name, description: val }, kind: kind.Variable, detail: val,
          insertText: `var(${name})`, filterText: `${name} var`, range, sortText: '0' + name,
        })),
      };
    },
  });

  // Sayfadaki id/class adlarını JS içinde selector tamamlaması için öner
  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.', '#', "'", '"'],
    provideCompletionItems(model, pos) {
      const line = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
      if (!/(querySelector(All)?|closest|matches|getElementById)\(\s*['"][^'"]*$/.test(line)) return { suggestions: [] };
      const html = model._drHtml || '';
      const css = model._drCss || '';
      const names = new Set();
      for (const m of html.matchAll(/\bclass=["']([^"']+)["']/g)) m[1].split(/\s+/).forEach((c) => c && names.add('.' + c));
      for (const m of html.matchAll(/\bid=["']([^"']+)["']/g)) names.add('#' + m[1]);
      for (const m of css.matchAll(/\.([a-zA-Z_][\w-]*)/g)) names.add('.' + m[1]);
      const isById = /getElementById\(\s*['"][^'"]*$/.test(line);
      const typed = (line.match(/['"]([^'"]*)$/) || [, ''])[1];
      const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: pos.column - typed.length, endColumn: pos.column };
      return {
        suggestions: [...names].filter((n) => (isById ? n[0] === '#' : true)).map((n) => ({
          label: n, kind: n[0] === '#' ? kind.Reference : kind.Class, insertText: isById ? n.slice(1) : n, range, sortText: '1' + n,
        })),
      };
    },
  });
}


/* ------------------------------------------------------------------ */
/* Emmet (HTML + CSS): öneri listesi, Tab ve Ctrl+E ile genişletme       */
/* ------------------------------------------------------------------ */
let emmetP;
function loadEmmet() {
  if (globalThis.emmet) return Promise.resolve(globalThis.emmet);
  return (emmetP ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('../vendor/emmet/emmet.js', import.meta.url).href;
    s.onload = () => resolve(globalThis.emmet);
    s.onerror = () => reject(new Error('Emmet yüklenemedi'));
    document.head.appendChild(s);
  }));
}

const EMMET_OPTS = {
  'output.indent': '  ',
  'output.format': true,
  // Monaco snippet sözdizimi: ${1:varsayılan} ve $0 ; metindeki özel karakterler kaçırılır
  'output.field': (i, ph) => (ph ? '${' + i + ':' + ph + '}' : '${' + i + '}'),
  'output.text': (t) => t.replace(/[$}\\]/g, '\\$&'),
};
const COMMON_TAGS = /^(a|abbr|article|aside|audio|b|body|button|canvas|caption|code|dd|details|div|dl|dt|em|fieldset|figure|footer|form|h[1-6]|head|header|hr|html|i|iframe|img|input|label|legend|li|link|main|mark|meta|nav|ol|option|p|picture|pre|script|section|select|small|source|span|strong|style|summary|svg|table|tbody|td|template|textarea|tfoot|th|thead|time|title|tr|ul|video)$/;
const HAS_OPERATOR = /[.#>+*^[\]{}()@$:|!]/;

/** İmlecin HTML belgesindeki bölgesi: 'html' | 'style' | 'script' */
function htmlRegion(model, pos) {
  const text = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: pos.lineNumber, endColumn: pos.column });
  const lower = text.toLowerCase();
  const lastOpen = (tag) => lower.lastIndexOf('<' + tag);
  const lastClose = (tag) => lower.lastIndexOf('</' + tag);
  if (lastOpen('script') > lastClose('script')) return 'script';
  if (lastOpen('style') > lastClose('style')) return 'style';
  return 'html';
}
/** Metnin imlecine kadar açık bir { bloğu içinde olup olmadığı (CSS bildirimi bağlamı) */
function inCssBlock(model, pos, startLine = 1) {
  const text = model.getValueInRange({ startLineNumber: startLine, startColumn: 1, endLineNumber: pos.lineNumber, endColumn: pos.column });
  let depth = 0;
  for (const ch of text) { if (ch === '{') depth++; else if (ch === '}') depth--; }
  return depth > 0;
}

/** İmleçteki kısaltmayı bulup genişletir; yoksa null. */
function emmetAt(model, pos) {
  const em = globalThis.emmet;
  if (!em) return null;
  const lang = model.getLanguageId();
  let type = 'markup';
  if (lang === 'css') {
    if (!inCssBlock(model, pos)) return null;
    type = 'stylesheet';
  } else if (lang === 'html') {
    const region = htmlRegion(model, pos);
    if (region === 'script') return null;
    if (region === 'style') { type = 'stylesheet'; if (!inCssBlock(model, pos)) return null; }
  } else return null;

  const before = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
  let r;
  try { r = em.extract(before, before.length, { type }); } catch { return null; }
  if (!r || !r.abbreviation) return null;
  if (type === 'markup') {
    if (/<[\w-]+[^<>]*$/.test(before.slice(0, r.start))) return null; // etiket içinde (öznitelik yazılıyor)
    if (!HAS_OPERATOR.test(r.abbreviation) && !COMMON_TAGS.test(r.abbreviation)) return null;
  }
  let text;
  try { text = em.expand(r.abbreviation, { type, options: EMMET_OPTS }); } catch { return null; }
  if (!text || text === r.abbreviation) return null;
  return { abbr: r.abbreviation, startCol: r.start + 1, endCol: r.end + 1, text, lang: type === 'markup' ? 'html' : 'css' };
}
const plainSnippet = (t) => t.replace(/\$\{\d+(?::([^}]*))?\}/g, (m, ph) => ph || '').replace(/\$0/g, '');

function setupEmmet(monaco) {
  const kind = monaco.languages.CompletionItemKind.Snippet;
  const rules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
  for (const lang of ['html', 'css']) {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['>', '+', '*', '.', '#', ']', '}', ')', '$', ':'],
      provideCompletionItems(model, pos) {
        const e = emmetAt(model, pos);
        if (!e) return { suggestions: [] };
        const plain = plainSnippet(e.text);
        return {
          suggestions: [{
            label: { label: e.abbr, description: 'Emmet' },
            kind, detail: plain.split('\n')[0].slice(0, 80),
            documentation: { value: '```' + e.lang + '\n' + plain + '\n```' },
            insertText: e.text, insertTextRules: rules, filterText: e.abbr, sortText: '0000', preselect: true,
            range: { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: e.startCol, endColumn: e.endCol },
          }],
        };
      },
    });
  }
}

/** Editöre Emmet tuşlarını bağlar: Tab (yalnızca genişletilebilir kısaltma varken) ve Ctrl+E */
function bindEmmet(monaco, ed) {
  const canKey = ed.createContextKey('drEmmetPossible', false);
  const refresh = () => {
    const m = ed.getModel(), p = ed.getPosition();
    canKey.set(!!(m && p && !ed.getOption(monaco.editor.EditorOption.readOnly) && emmetAt(m, p)));
  };
  ed.onDidChangeCursorPosition(refresh);
  ed.onDidChangeModel(refresh);
  ed.onDidChangeModelContent(refresh);

  const expand = () => {
    const m = ed.getModel(), p = ed.getPosition();
    const e = m && p && emmetAt(m, p);
    if (!e) return false;
    const snip = ed.getContribution('snippetController2');
    snip.insert(e.text, { overwriteBefore: e.endCol - e.startCol });
    return true;
  };
  ed.addCommand(monaco.KeyCode.Tab, expand, 'editorTextFocus && drEmmetPossible && !suggestWidgetVisible && !inSnippetMode && !editorHasSelection');
  ed.addAction({ id: 'dr.emmetExpand', label: 'Emmet: Kısaltmayı genişlet', keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE], run: () => { expand(); } });
}

export async function createEditor(container, handlers = {}, opts = {}) {
  const monaco = await loadMonaco();
  setupLanguages(monaco);
  await loadEmmet().then(() => setupEmmetOnce(monaco)).catch((e) => console.warn('Emmet', e));

  monaco.editor.defineTheme('dr-dark', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#121212' } });
  monaco.editor.defineTheme('dr-light', { base: 'vs', inherit: true, rules: [], colors: { 'editor.background': '#fafafa' } });
  const models = {};
  for (const k of Object.keys(LANG)) models[k] = monaco.editor.createModel('', LANG[k], monaco.Uri.parse('file:///' + FILE[k]));

  const ed = monaco.editor.create(container, {
    model: models.html,
    theme: opts.dark ? 'dr-dark' : 'dr-light',
    automaticLayout: true,
    fontSize: 13,
    fontFamily: "ui-monospace, 'Cascadia Code', Consolas, Menlo, monospace",
    tabSize: 2,
    minimap: { enabled: true, renderCharacters: false },
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true, indentation: true },
    stickyScroll: { enabled: true },
    formatOnPaste: true,
    formatOnType: true,
    linkedEditing: true,
    colorDecorators: true,
    quickSuggestions: { other: true, comments: false, strings: true },
    suggest: { showSnippets: true, preview: true, showStatusBar: true, insertMode: 'replace' },
    parameterHints: { enabled: true },
    wordWrap: 'off',
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorSmoothCaretAnimation: 'on',
    renderWhitespace: 'selection',
    folding: true,
    foldingStrategy: 'indentation',
    padding: { top: 8 },
    mouseWheelZoom: true,
  });

  if (globalThis.emmet) bindEmmet(monaco, ed);

  let current = 'html';
  const fileOf = (model) => Object.keys(models).find((k) => models[k] === model);

  // Çapraz dosya bilgisi: JS tamamlayıcı için HTML/CSS metnini model üzerinde sakla
  const syncCross = () => { models.js._drHtml = models.html.getValue(); models.js._drCss = models.css.getValue(); };
  for (const k of Object.keys(models)) {
    models[k].onDidChangeContent(() => { if (k !== 'js') syncCross(); handlers.onChange && handlers.onChange(k); });
  }

  const counts = () => {
    const c = {};
    for (const k of Object.keys(models)) {
      c[k] = monaco.editor.getModelMarkers({ resource: models[k].uri }).filter((m) => m.severity === monaco.MarkerSeverity.Error).length;
    }
    return c;
  };
  monaco.editor.onDidChangeMarkers(() => handlers.onMarkers && handlers.onMarkers(counts(), current));
  ed.onDidChangeCursorPosition((e) => handlers.onCursor && handlers.onCursor(e.position));

  const apply = () => handlers.onApply && handlers.onApply();
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, apply);
  ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, apply);
  ed.addAction({ id: 'dr.toggleWrap', label: 'Satır kaydırmayı aç/kapat', keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ], run: () => api.toggleWrap() });

  const api = {
    monaco, editor: ed,
    get current() { return current; },
    setParts(parts) {
      for (const k of Object.keys(models)) { models[k].setValue(parts[k] ?? ''); }
      syncCross();
    },
    getPart: (k) => models[k].getValue(),
    getParts: () => ({ html: models.html.getValue(), css: models.css.getValue(), js: models.js.getValue() }),
    show(k) { current = k; ed.setModel(models[k]); ed.setScrollTop(0); ed.focus(); handlers.onMarkers && handlers.onMarkers(counts(), current); },
    setDark: (b) => monaco.editor.setTheme(b ? 'dr-dark' : 'dr-light'),
    setReadOnly: (b) => ed.updateOptions({ readOnly: b }),
    async format() { const a = ed.getAction('editor.action.formatDocument'); if (a) await a.run(); },
    toggleWrap() { const on = ed.getOption(monaco.editor.EditorOption.wordWrap) === 'off'; ed.updateOptions({ wordWrap: on ? 'on' : 'off' }); return on; },
    zoom(d) { const sz = Math.min(24, Math.max(10, ed.getOption(monaco.editor.EditorOption.fontSize) + d)); ed.updateOptions({ fontSize: sz }); return sz; },
    counts,
    focus: () => ed.focus(),
    layout: () => ed.layout(),
    setStreamText(text) { models.html.setValue(text); ed.revealLine(models.html.getLineCount()); },
    revealStreaming() { const m = ed.getModel(); if (m) ed.revealLine(m.getLineCount()); },
  };
  return api;
}
