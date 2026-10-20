// Workspace suggestions complement Monaco's built-in CSS and TypeScript workers.
export function cssVariableSuggestions(monaco, model, pos) {
  const text = model.getValue();
  const before = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
  const argument = before.match(/var\(\s*(--[\w-]*)?$/);
  const word = model.getWordUntilPosition(pos);
  const typed = argument ? argument[1] || '' : (before.match(/--[\w-]*$/) || [''])[0];
  const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber,
    startColumn: typed ? pos.column - typed.length : word.startColumn, endColumn: pos.column };
  const seen = new Map();
  for (const m of (text + '\n' + (model._drHtml || '')).matchAll(/(--[\w-]+)\s*:\s*([^;}{<]+)/g)) {
    if (!seen.has(m[1])) seen.set(m[1], m[2].trim());
  }
  return { suggestions: [...seen].map(([name, value]) => ({
    label: { label: name, description: value }, kind: monaco.languages.CompletionItemKind.Variable,
    detail: value, insertText: argument ? name : `var(${name})`, filterText: `${name} var`, range, sortText: '0' + name
  })) };
}

export function workspaceSelectors(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const selectors = new Map();
  for (const el of doc.body.querySelectorAll('[id], [class]')) {
    const type = el.namespaceURI === 'http://www.w3.org/1999/xhtml' && /^HTML\w+Element$/.test(el.constructor.name)
      ? el.constructor.name : 'Element';
    if (el.id) selectors.set('#' + el.id, { type, tag: el.localName, id: el.id });
    for (const name of el.classList) {
      if (!/^[a-zA-Z_][\w-]*$/.test(name)) continue;
      const key = '.' + name, previous = selectors.get(key);
      selectors.set(key, { type: previous && previous.type !== type ? 'Element' : type, tag: el.localName });
    }
  }
  return selectors;
}

export function setupWorkspaceIntelligence(monaco, models, editor) {
  let library, timer, previousHtml;
  const declarationsUri = models.js.uri.toString().replace(/script\.js$/, 'document-elements.d.ts');
  const sync = () => {
    const html = models.html.getValue();
    models.css._drHtml = html;
    if (previousHtml === html) return;
    previousHtml = html;
    const selectors = workspaceSelectors(html);
    models.css._drSelectors = selectors;
    const lines = [];
    for (const [selector, info] of selectors) {
      // Do not narrow repeated classes to one element type, or special CSS identifiers.
      if (selector.startsWith('#') && !/^[a-zA-Z_][\w-]*$/.test(info.id)) continue;
      lines.push(`querySelector(selectors: ${JSON.stringify(selector)}): ${info.type} | null;`);
      if (info.id) lines.push(`getElementById(elementId: ${JSON.stringify(info.id)}): ${info.type} | null;`);
    }
    library?.dispose();
    library = monaco.languages.typescript.javascriptDefaults.addExtraLib(
      'interface Document {\n' + lines.slice(0, 800).join('\n') + '\n}', declarationsUri);
  };
  const changes = models.html.onDidChangeContent(() => { clearTimeout(timer); timer = setTimeout(sync, 250); });
  const provider = monaco.languages.registerCompletionItemProvider('css', {
    triggerCharacters: ['.', '#'],
    provideCompletionItems(model, pos) {
      if (model !== models.css) return { suggestions: [] };
      const before = model.getLineContent(pos.lineNumber).slice(0, pos.column - 1);
      const match = before.match(/([.#][\w-]*)$/);
      if (!match || /[{}:]/.test(before.slice(0, match.index))) return { suggestions: [] };
      return { suggestions: [...(model._drSelectors || [])].map(([label, info]) => ({
        label, kind: monaco.languages.CompletionItemKind.Class, detail: `<${info.tag}> · HTML belgesinden`,
        insertText: label, range: { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber,
          startColumn: pos.column - match[1].length, endColumn: pos.column }, sortText: '0' + label
      })) };
    }
  });
  sync();
  const disposal = editor.onDidDispose(() => { clearTimeout(timer); library?.dispose(); changes.dispose(); provider.dispose(); disposal.dispose(); });
  return sync;
}
