// Accessible controls for Monaco actions; preferences are local to this browser profile.
export async function attachEditorTools(api, { log } = {}) {
  const $ = selector => document.querySelector(selector);
  const list = $('#ed-problem-list');
  const panel = $('#ed-problem-panel');
  const toggle = $('#ed-problems');
  let preferences = { minimap: true, typeChecking: true };
  try {
    const stored = await chrome.storage.local.get('editorPreferences');
    preferences = { ...preferences, ...stored.editorPreferences };
  } catch { /* Defaults remain available when storage is unavailable. */ }
  $('#ed-minimap').checked = preferences.minimap;
  $('#ed-typecheck').checked = preferences.typeChecking;
  api.setMinimap(preferences.minimap);
  api.setTypeChecking(preferences.typeChecking);
  const save = async () => {
    try { await chrome.storage.local.set({ editorPreferences: preferences }); }
    catch { log?.('Editör tercihi bu oturumda uygulandı; kalıcı kaydedilemedi.', 'warn'); }
  };
  $('#ed-minimap').addEventListener('change', () => {
    preferences.minimap = $('#ed-minimap').checked; api.setMinimap(preferences.minimap); save();
  });
  $('#ed-typecheck').addEventListener('change', () => {
    preferences.typeChecking = $('#ed-typecheck').checked; api.setTypeChecking(preferences.typeChecking); save();
  });
  const toggleProblems = () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    api.layout();
  };
  toggle.addEventListener('click', toggleProblems);
  api.editor.addAction({ id: 'dr.problems', label: 'Sorunlar panelini aç/kapat',
    keybindings: [api.monaco.KeyMod.CtrlCmd | api.monaco.KeyMod.Shift | api.monaco.KeyCode.KeyM], run: toggleProblems });
  document.querySelectorAll('[data-editor-action]').forEach(button => button.addEventListener('click', async () => {
    try { await api.runAction(button.dataset.editorAction); }
    catch (error) { log?.('Editör komutu çalışmadı: ' + error.message, 'warn'); }
  }));
  function setProblems(problems) {
    const errors = problems.filter(p => p.severity === api.monaco.MarkerSeverity.Error).length;
    toggle.textContent = `Sorunlar · ${errors} hata, ${problems.length - errors} uyarı`;
    const nodes = problems.slice(0, 200).map(problem => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'ed-problem';
      const file = { html: 'index.html', css: 'style.css', js: 'script.js' }[problem.file];
      const severity = problem.severity === api.monaco.MarkerSeverity.Error ? 'Hata' : 'Uyarı';
      const location = document.createElement('span');
      location.className = 'ed-problem-location';
      location.textContent = `${severity} · ${file}:${problem.startLineNumber}:${problem.startColumn}`;
      const message = document.createElement('span'); message.textContent = problem.message;
      button.append(location, message);
      button.addEventListener('click', () => api.revealProblem(problem));
      return button;
    });
    if (!nodes.length) {
      const empty = document.createElement('p'); empty.className = 'hint';
      empty.textContent = 'Hata veya uyarı bulunamadı.'; nodes.push(empty);
    }
    if (problems.length > 200) {
      const note = document.createElement('p'); note.className = 'hint';
      note.textContent = 'İlk 200 sorun gösteriliyor. Diğer işaretleri editörde inceleyebilirsiniz.'; nodes.push(note);
    }
    list.replaceChildren(...nodes);
  }
  setProblems(api.problems());
  return { setProblems };
}
