const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => {
      const store = { proService: 'http://localhost:8787' };
      window.chrome = {
        storage: {
          onChanged: { addListener() {} },
          local: { get: async key => typeof key === 'string' ? { [key]: store[key] } : store,
            set: async data => Object.assign(store, data), remove: async key => { delete store[key]; } },
          session: { get: async () => ({}), remove: async () => {} }
        }, runtime: { getURL: value => 'http://127.0.0.1:8790/' + value, openOptionsPage() {} },
        tabs: { create: async () => {} }
      };
    });
    let paid = false;
    await context.route('http://localhost:8787/**', async route => {
      if (route.request().url().endsWith('/v1/adapt')) {
        assert.equal(paid, true);
        const data = route.request().postDataJSON();
        assert.ok(data.target.includes('body'), 'Target selector received: ' + JSON.stringify(data.target));
        assert.ok(data.component.html);
        return route.fulfill({ json: { html: '<!doctype html><html><head><title>Adapted</title></head><body><main id="adapted">Adapted test component</main></body></html>' } });
      }
      return route.fulfill({ json: { email: paid ? 'ui-test@example.com' : null, pro: paid } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8790/pro/pro.html');
    await page.getByText('Satın almak için giriş yapın veya hesap oluşturun.').waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('http://127.0.0.1:8790/studio/studio.html');
    await page.getByRole('button', { name: 'Binbir Dizayn', exact: true }).click();
    await page.locator('.lib-card').first().waitFor();
    assert.equal(await page.locator('.lib-card').count(), 24);
    await page.getByRole('button', { name: 'Uyarla PRO' }).first().click();
    await page.getByText('Bu özellik için aktif Pro üyeliği gerekli.', { exact: false }).waitFor();
    paid = true;
    await page.getByRole('button', { name: 'Editörde aç', exact: true }).first().click();
    await page.locator('#dl-html:not([disabled])').waitFor();
    await page.getByRole('button', { name: 'Binbir Dizayn', exact: true }).click();
    await fs.mkdir(path.join(root, 'store-assets'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'store-assets/pro-library.png') });
    await page.getByRole('button', { name: 'Uyarla PRO' }).nth(1).click();
    await page.locator('dialog').waitFor({ state: 'visible' });
    await page.locator('#adapt-generate').click();
    await page.getByText('Devam etmek için veri gönderimini onaylayın.').waitFor();
    await page.locator('#adapt-consent').check();
    await page.locator('#adapt-content').fill('Test content');
    await page.locator('#adapt-generate').click();
    await page.locator('#adapt-apply:not([disabled])').waitFor();
    await page.frameLocator('#adapt-preview').locator('#adapted').waitFor();
    await page.screenshot({ path: path.join(root, 'store-assets/pro-adapt.png') });
    await page.locator('#adapt-apply').click();
    await page.locator('#adapt-undo:not([disabled])').waitFor();
    await page.frameLocator('#frame').locator('#adapted').waitFor();
    await page.locator('#adapt-undo').click();
    await page.locator('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.frameLocator('#frame').locator('#adapted').count(), 0);
    assert.deepEqual(errors, []);
    console.log('UI PASS: free gate, library, mobile layout, consent, paid preview, apply, undo. Mocked memberships and AI; actual browser DOM and Monaco.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
