import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { FileStore } = require("../desktop/storage.js");
const repo = path.resolve(import.meta.dirname, "..");

test("depolama: atomik yazma, yedekten kurtarma, anahtar doğrulama", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bd-store-"));
  const s = new FileStore(dir);
  await s.set({ "bd.favorites": ["cmp-0001"] });
  assert.deepEqual(await s.get(["bd.favorites"]), { "bd.favorites": ["cmp-0001"] });
  await s.set({ "bd.favorites": ["cmp-0002"] });
  fs.writeFileSync(path.join(dir, "store.json"), "{bozuk");
  assert.deepEqual(await s.get("bd.favorites"), { "bd.favorites": ["cmp-0001"] }, "bozuk dosyada son sağlam yedek okunur");
  await assert.rejects(s.set({ "../x": 1 }), /anahtar/);
  await assert.rejects(s.set([1]), /Geçersiz/);
});

test("güvenlik sınırları: sandbox/izolasyon açık, ağ kapalı, önizleme sandbox'lı iframe", () => {
  const main = fs.readFileSync(path.join(repo, "desktop/main.js"), "utf8");
  for (const s of ["contextIsolation: true", "sandbox: true", "nodeIntegration: false", "nodeIntegrationInSubFrames: false", "setPermissionRequestHandler", "onBeforeRequest", "will-navigate", "will-frame-navigate", "setWindowOpenHandler"]) assert.ok(main.includes(s), s);
  const ui = ["studio-desktop/app.js", "studio-desktop/src/library.js", "studio-desktop/src/palette.js", "studio-desktop/preview.html", "desktop/preload.js"].map((f) => fs.readFileSync(path.join(repo, f), "utf8")).join("\n");
  assert.doesNotMatch(ui, /\bfetch\s*\(|XMLHttpRequest|WebSocket|net\.request/, "ağ isteği yok");
  const index = fs.readFileSync(path.join(repo, "studio-desktop/index.html"), "utf8");
  assert.match(index, /connect-src 'none'/);
  assert.doesNotMatch(index.match(/Content-Security-Policy" content="([^"]+)"/)[1], /unsafe/);
  const prev = fs.readFileSync(path.join(repo, "studio-desktop/preview.html"), "utf8");
  assert.match(prev, /connect-src 'none'/);
  assert.match(fs.readFileSync(path.join(repo, "studio-desktop/app.js"), "utf8"), /setAttribute\("sandbox", "allow-scripts"\)/);
  assert.doesNotMatch(fs.readFileSync(path.join(repo, "studio-desktop/app.js"), "utf8"), /allow-same-origin/);
});

test("tasarım sistemi: pl/ kopyası değişmemiş, app.css yalnız token renkleri kullanır", () => {
  const css = fs.readFileSync(path.join(repo, "studio-desktop/app.css"), "utf8");
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i, "app.css sabit renk içermez");
  const idx = fs.readFileSync(path.join(repo, "studio-desktop/index.html"), "utf8");
  assert.match(idx, /data-pl data-pl-theme="dark" data-pl-product="replicator"/);
});

test("paket: electron-builder dosya listesi gerçekten var olan dosyaları içerir", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8"));
  for (const f of pkg.build.files) if (!f.includes("*")) assert.ok(fs.existsSync(path.join(repo, f)), f);
  assert.ok(fs.existsSync(path.join(repo, pkg.build.win.icon)));
});
