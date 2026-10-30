// Masaüstü duman testi: gerçek Electron penceresi, ayrı (geçici) kullanıcı verisi. Ağ kullanılmaz.
// Çalıştırma: PLAYWRIGHT_MODULE=playwright [xvfb-run -a] node tests/desktop-smoke.cjs [ekran-görüntüsü-klasörü]
// BD_SMOKE_EXE verilirse depo yerine paketlenmiş uygulama (ör. dist/win-unpacked/Binbir Dizayn Stüdyo.exe) sınanır.
const { _electron: electron } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const assert = require("node:assert/strict");
const repo = path.resolve(__dirname, "..");
const shots = process.argv[2];
const electronPath = require(require.resolve("electron", { paths: [repo] }));
// Sayfa CSP'si eval'a izin vermez; Playwright waitForFunction bazı durumlarda eval kullanır. Bu yüzden bekleme Node tarafında yoklanır.
const until = async (fn, what, timeout = 20000) => {
  const end = Date.now() + timeout;
  for (;;) {
    try { if (await fn()) return; } catch { /* sayfa yeniden çiziliyor olabilir */ }
    if (Date.now() > end) throw new Error("zaman aşımı: " + what);
    await new Promise((r) => setTimeout(r, 100));
  }
};
const userData = fs.mkdtempSync(path.join(os.tmpdir(), "bd-desktop-"));
const exportPath = path.join(userData, "disa-aktarim.html");
const shot = async (page, name) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, name) }); } };

async function launch() {
  const app = await electron.launch({
    executablePath: process.env.BD_SMOKE_EXE || electronPath,
    args: [...(process.env.BD_SMOKE_EXE ? [] : [repo]), ...(process.platform === "linux" ? ["--no-sandbox"] : [])],
    env: { ...process.env, BD_USER_DATA: userData, BD_EXPORT_PATH: exportPath },
  });
  const page = await app.firstWindow();
  const violations = [];
  page.on("console", (m) => { if (/Content Security Policy|Refused to|Uncaught/i.test(m.text())) violations.push(m.text()); });
  page.on("pageerror", (e) => violations.push(String(e)));
  await page.waitForLoadState("domcontentloaded");
  await until(async () => (await page.locator("#root").getAttribute("data-ready")) === "1", "kütüphane yüklenmesi");
  return { app, page, violations };
}
// Önizleme çerçevesinin içeriği (sandbox'lı, opak köken) Playwright çerçeve API'siyle okunur.
const frameText = async (page, sel) => {
  const h = await page.locator(sel).first().elementHandle();
  const f = h && await h.contentFrame();
  return f ? (await f.locator("body").innerText()).trim() : "";
};

(async () => {
  let { app, page, violations } = await launch();
  try {
    assert.equal(await page.title(), "Binbir Dizayn Stüdyo");
    assert.equal(await page.evaluate(() => typeof require + typeof process), "undefinedundefined", "Node sayfaya sızmamalı");
    assert.equal(await page.evaluate(() => window.bdDesktop.platform), process.platform);
    assert.equal(await page.locator("#root").getAttribute("data-pl-theme"), "dark");
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("root")).getPropertyValue("--pl-accent").trim()), "#f472b6", "Design Replicator aksanı");
    assert.match(await page.textContent("#sub"), /1\.001 bileşen · 649 etkileşimli/);
    assert.equal(await page.locator("#grid .bd-item").count(), 24);
    assert.equal(await page.locator("#cat option").count(), 43);
    await until(async () => (await frameText(page, "#grid .bd-thumb iframe")).length > 0, "ilk önizleme çizimi");
    await new Promise((r) => setTimeout(r, 800));
    await shot(page, "masaustu-01-kutuphane.png");

    // Önizleme çerçevesi ana sayfaya ve köprüye erişemez
    const isolated = await (await (await page.locator("#grid .bd-thumb iframe").first().elementHandle()).contentFrame()).evaluate(() => {
      let parentDoc = "erişildi";
      try { void window.parent.document; } catch { parentDoc = "engellendi"; }
      return { bridge: typeof window.bdDesktop, parentDoc, origin: String(window.origin) };
    });
    assert.deepEqual(isolated, { bridge: "undefined", parentDoc: "engellendi", origin: "null" });

    // Arama (Türkçe) + süzgeç
    await page.fill("#q", "giriş formu");
    await until(async () => /eşleşti/.test(await page.textContent("#count")), "arama");
    const n = await page.locator("#grid .bd-item").count();
    assert.ok(n > 0);
    assert.match(await page.locator("#grid .bd-item .bd-small").first().textContent(), /Giriş formu/);
    await page.selectOption("#mode", "dark");
    await until(async () => (await page.locator("#grid .bd-item").count()) < n, "koyu süzgeç");
    await page.fill("#q", "zzzyok");
    await until(async () => !(await page.locator("#empty").isHidden()), "boş durum");
    await page.click("#clear");
    await until(async () => (await page.textContent("#count")).trim() === "1.001 bileşen", "süzgeç temizleme");

    // Ayrıntı: canlı önizleme, kod, favori, dışa aktarma
    await page.selectOption("#cat", "button");
    await until(async () => /24 \/ 1\.001/.test(await page.textContent("#count")), "kategori süzgeci");
    const firstId = await page.locator("#grid .bd-item").first().getAttribute("data-id");
    await page.locator("#grid .bd-thumb").first().click();
    await until(async () => await page.locator("#detail").evaluate((d) => d.open), "ayrıntı penceresi");
    await until(async () => (await frameText(page, "#dPrev iframe")).length > 0, "canlı önizleme");
    assert.match(await page.textContent("#codePre"), /<button/);
    await page.click('#codeTabs [data-code="css"]');
    assert.match(await page.textContent("#codePre"), /--primary/);
    await page.click("#dFav");
    await until(async () => (await page.textContent("#favCount")).trim() === "1", "favori sayacı");
    await page.click("#dExport");
    await until(async () => fs.existsSync(exportPath), "HTML dışa aktarma");
    const doc = fs.readFileSync(exportPath, "utf8");
    assert.match(doc, /^<!doctype html>/);
    assert.match(doc, new RegExp(firstId));
    await page.click('#codeTabs [data-code="html"]');
    await new Promise((r) => setTimeout(r, 600));
    await shot(page, "masaustu-02-ayrinti.png");
    await page.click("#dClose");

    // Favoriler görünümü
    await page.click('#tabs [data-view="favorites"]');
    assert.equal(await page.locator("#favGrid .bd-item").count(), 1);

    // Görselden palet (yerel dosya) + en yakın bileşenler
    await page.click('#tabs [data-view="palette"]');
    await page.setInputFiles("#imgPick", path.join(repo, "tests/fixtures/palet-rose.png"));
    await until(async () => (await page.locator("#palList .bd-chip").count()) === 3, "palet çıkarma");
    assert.equal((await page.locator("#palList .bd-chip b").first().textContent()).trim(), "#c2255c");
    await until(async () => (await page.locator("#nearGrid .bd-item").count()) === 12, "en yakın bileşenler");
    assert.match(await page.locator("#nearGrid .bd-small").first().textContent(), /Rose/);
    await new Promise((r) => setTimeout(r, 800));
    await shot(page, "masaustu-03-palet.png");

    // Komut paleti
    await page.keyboard.press("Control+K");
    await until(async () => await page.locator("#cmdk").evaluate((d) => d.open), "komut paleti");
    await page.fill("#cmdQ", "kategori ürün kartı");
    await until(async () => (await page.locator("#cmdList .pl-menuitem").count()) >= 1, "komut arama");
    await shot(page, "masaustu-04-komut-paleti.png");
    await page.keyboard.press("Enter");
    await until(async () => (await page.inputValue("#cat")) === "product-card", "komut çalıştırma");

    // Ağ kapalı: sayfadan dış istek yapılamaz (CSP + oturum düzeyinde iptal)
    const net = await page.evaluate(() => new Promise((res) => { const i = new Image(); i.onload = () => res("yüklendi"); i.onerror = () => res("engellendi"); i.src = "https://example.com/x.png"; }));
    assert.equal(net, "engellendi");

    // Gezinme kilidi (en sonda)
    await page.evaluate(() => { location.href = "https://example.com/"; }).catch(() => {});
    await new Promise((r) => setTimeout(r, 400));
    assert.match(page.url(), /index\.html$/);

    const stored = JSON.parse(fs.readFileSync(path.join(userData, "store.json"), "utf8"));
    assert.deepEqual(stored["bd.favorites"], [firstId]);
    const real = violations.filter((v) => !/example\.com/.test(v));
    assert.deepEqual(real, [], "CSP ihlali/hata olmamalı");
    await app.close();

    ({ app, page, violations } = await launch());
    assert.equal((await page.textContent("#favCount")).trim(), "1", "favori yeniden başlatınca kalıcı");
    assert.deepEqual(violations, []);
    console.log("masaüstü duman testi: tüm kontroller geçti (" + process.platform + ")");
  } finally {
    await app.close().catch(() => {});
  }
})().catch((e) => { console.error(e); process.exit(1); });
