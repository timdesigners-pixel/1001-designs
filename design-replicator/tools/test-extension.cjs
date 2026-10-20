const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'design-replicator-test-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
    args: ['--disable-extensions-except=' + root, '--load-extension=' + root]
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = new URL(worker.url()).host;
    let paid = false;
    await context.route('http://localhost:8787/**', route => {
      const html = '<!doctype html><html><head><title>Adapted</title></head><body><main id="adapted">Adapted test component<button id="live">Ready</button></main><script>document.getElementById("live").onclick=()=>document.getElementById("live").textContent="Working";</script></body></html>';
      return route.fulfill({ json: route.request().url().endsWith('/v1/adapt') ? { html } : { email: paid ? 'test@example.com' : null, pro: paid } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', message => { if (message.type() === 'error') console.log('BROWSER:', message.text()); });
    await page.goto('chrome-extension://' + id + '/studio/studio.html');
    await page.getByRole('button', { name: 'Binbir Dizayn', exact: true }).click();
    await page.locator('.lib-card').first().waitFor();
    await page.getByRole('button', { name: 'Uyarla PRO' }).first().click();
    await page.getByText('Bu özellik için aktif Pro üyeliği gerekli.', { exact: false }).waitFor();
    await page.bringToFront();
    paid = true;
    await page.getByRole('button', { name: 'Editörde aç', exact: true }).first().click();
    await page.locator('#dl-html:not([disabled])').waitFor();
    await page.getByRole('button', { name: 'Binbir Dizayn', exact: true }).click();
    await fs.mkdir(path.join(root, 'store-assets'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'store-assets/pro-library.png') });
    await page.getByRole('button', { name: 'Uyarla PRO' }).nth(1).click();
    await page.locator('dialog').waitFor({ state: 'visible' });
    await page.locator('#adapt-consent').check();
    await page.locator('#adapt-generate').click();
    await page.locator('#adapt-apply:not([disabled])').waitFor();
    const frame = page.frameLocator('#adapt-preview');
    await frame.locator('#adapted').waitFor();
    await frame.locator('#live').click();
    await frame.getByRole('button', { name: 'Working', exact: true }).waitFor({ timeout: 5000 });
    await page.screenshot({ path: path.join(root, 'store-assets/pro-adapt.png') });
    await page.locator('#adapt-apply').click();
    await page.locator('#adapt-undo:not([disabled])').waitFor();
    await page.frameLocator('#frame').locator('#adapted').waitFor();
    await page.locator('#adapt-undo').click();
    await page.locator('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.frameLocator('#frame').locator('#adapted').count(), 0);
    assert.deepEqual(errors, []);
    console.log('EXTENSION PASS: real MV3, service worker, Monaco, free gate, paid adaptation, sandbox JS interaction, apply and undo. Membership/AI responses mocked.');
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
