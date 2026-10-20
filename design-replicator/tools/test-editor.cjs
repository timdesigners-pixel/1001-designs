const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'design-replicator-editor-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1440, height: 1000 },
    args: ['--disable-extensions-except=' + root, '--load-extension=' + root]
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('chrome-extension://' + new URL(worker.url()).host + '/studio/studio.html');
    await page.getByRole('button', { name: 'Kod', exact: true }).click();
    await page.locator('#ed-loading').waitFor({ state: 'detached' });
    await page.locator('#ed-auto').uncheck();
    await page.evaluate(() => {
      const models = monaco.editor.getModels();
      const model = suffix => models.find(m => m.uri.path.endsWith('/' + suffix));
      window.testModels = { html: model('index.html'), css: model('style.css'), js: model('script.js') };
      testModels.html.setValue('<!doctype html><html><body><input id="email" class="contact-field"><button id="send">Send</button></body></html>');
      testModels.css.setValue(':root { --accent: #b43b24; }\n.contact-field { color: var(--ac); }');
      testModels.js.setValue("const email = document.getElementById('email');\nemail.value = 'hello';\nemail.value.toFixed(2);");
    });
    await page.waitForFunction(() => monaco.languages.typescript.javascriptDefaults.getExtraLibs() &&
      Object.values(monaco.languages.typescript.javascriptDefaults.getExtraLibs()).some(lib => lib.content.includes('HTMLInputElement')));
    const types = await page.evaluate(async () => {
      const getWorker = await monaco.languages.typescript.getJavaScriptWorker();
      const worker = await getWorker(testModels.js.uri);
      const info = await worker.getQuickInfoAtPosition(testModels.js.uri.toString(), testModels.js.getValue().indexOf('email.value') + 1);
      const diagnostics = await worker.getSemanticDiagnostics(testModels.js.uri.toString());
      return { info: info.displayParts.map(p => p.text).join(''), codes: diagnostics.map(d => d.code) };
    });
    assert.ok(types.info.includes('HTMLInputElement'), JSON.stringify(types));
    assert.ok(types.codes.some(code => [2339, 2551].includes(code)), JSON.stringify(types));
    await page.getByRole('button', { name: 'JS', exact: false }).filter({ hasText: /^JS/ }).first().click();
    await page.locator('#ed-problems').click();
    await page.locator('.ed-problem').filter({ hasText: 'toFixed' }).waitFor();
    await page.locator('.ed-problem').filter({ hasText: 'toFixed' }).click();
    assert.equal(await page.evaluate(() => monaco.editor.getEditors()[0].getPosition().lineNumber), 3);
    await page.locator('#ed-typecheck').uncheck();
    await page.waitForFunction(() => !monaco.editor.getModelMarkers({ resource: testModels.js.uri }).some(m => ['2339', '2551'].includes(m.code)));
    await page.locator('#ed-typecheck').check();
    await page.waitForFunction(() => monaco.editor.getModelMarkers({ resource: testModels.js.uri }).some(m => ['2339', '2551'].includes(m.code)));
    await page.getByRole('button', { name: 'CSS', exact: false }).filter({ hasText: /^CSS/ }).first().click();
    await page.evaluate(() => {
      const editor = monaco.editor.getEditors()[0];
      const offset = testModels.css.getValue().indexOf('--ac)') + 4;
      editor.setPosition(testModels.css.getPositionAt(offset)); editor.focus();
      editor.getAction('editor.action.triggerSuggest').run();
    });
    await page.locator('.suggest-widget.visible .monaco-list-row').filter({ hasText: '--accent' }).first().click();
    const completedCss = await page.evaluate(() => testModels.css.getValue());
    assert.ok(completedCss.includes('var(--accent)'), completedCss);
    assert.equal(await page.evaluate(() => testModels.css.getValue().includes('var(var(')), false);
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      const editor = monaco.editor.getEditors()[0];
      testModels.css.setValue('.cont'); editor.setPosition({ lineNumber: 1, column: 6 }); editor.focus();
      editor.getAction('editor.action.triggerSuggest').run();
    });
    await page.locator('.suggest-widget.visible .monaco-list-row').filter({ hasText: '.contact-field' }).first().waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Bul', exact: true }).click();
    await page.locator('.find-widget.visible').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('#ed-minimap').uncheck();
    assert.equal(await page.evaluate(() => monaco.editor.getEditors()[0].getOption(monaco.editor.EditorOption.minimap).enabled), false);
    assert.deepEqual(errors, []);
    await fs.mkdir(path.join(root, 'store-assets'), { recursive: true });
    await page.evaluate(css => testModels.css.setValue(css), completedCss);
    await page.waitForFunction(() => !monaco.editor.getModelMarkers({ resource: testModels.css.uri }).length);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('button', { name: 'JS', exact: false }).filter({ hasText: /^JS/ }).first().click();
    await page.evaluate(() => {
      const editor = monaco.editor.getEditors()[0];
      editor.setPosition({ lineNumber: 2, column: 9 }); editor.focus();
      editor.getAction('editor.action.triggerSuggest').run();
    });
    await page.locator('.suggest-widget.visible').waitFor();
    await page.screenshot({ path: path.join(root, 'store-assets/advanced-editor.png') });
    console.log('EDITOR PASS: real MV3 workers, DOM-aware JS IntelliSense, semantic diagnostics/toggle, CSS variables without duplicate var(), HTML class suggestions, problem navigation, find and minimap.');
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
