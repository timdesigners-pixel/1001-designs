import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const L = require("../studio-desktop/src/library.js");
const P = require("../studio-desktop/src/palette.js");
const raw = require("../design-replicator/dataset/components.json");

const { entries, rejected } = L.validateDataset(raw);

test("gerçek veri seti: 1001 bileşenin tamamı doğrulamadan geçer, 42 kategori, 649 etkileşimli", () => {
  assert.equal(entries.length, 1001);
  assert.equal(rejected, 0);
  assert.equal(L.categories(entries).length, 42);
  assert.equal(entries.filter((e) => e.interactive).length, 649);
  assert.equal(L.palettes(entries).length, 14);
  for (const c of L.categories(entries)) assert.ok(c.title && c.title !== c.category, `Türkçe kategori adı: ${c.category}`);
});

test("doğrulama: geçersiz, eksik ve yinelenen girdiler sayılarak atılır; bilinmeyen alanlar kopyalanmaz", () => {
  const ok = { id: "x-1", category: "button", html: "<b>a</b>", css: "", js: "", tokens: { colors: { primary: "#ABCDEF", bg: "red", text: "#fff" } }, evil: "<script>" };
  const r = L.validateDataset([ok, { ...ok }, { ...ok, id: "../etc" }, { ...ok, id: "x-2", html: "  " }, { ...ok, id: "x-3", css: "a".repeat(L.MAX_CODE + 1) }, null, 5, { ...ok, id: "x-4", category: "Bad Cat" }]);
  assert.equal(r.entries.length, 1);
  assert.equal(r.rejected, 7);
  const e = r.entries[0];
  assert.equal(e.evil, undefined);
  assert.deepEqual(e.tokens.colors, { primary: "#abcdef", text: "#fff" }, "geçersiz renk (red) atılır");
  assert.equal(e.interactive, false, "JS yoksa etkileşimli sayılmaz");
  assert.throws(() => L.validateDataset({}), /dizi/);
});

test("arama: Türkçe karakter/büyük harf duyarsız, çok sözcüklü VE, Türkçe ve İngilizce kategori adı", () => {
  assert.equal(L.fold("GİRİŞ Formu Işık ÇÖĞÜŞ"), "giris formu isik cogus");
  const a = L.filterEntries(entries, { q: "giriş FORMU" });
  const b = L.filterEntries(entries, { q: "login form" });
  assert.ok(a.length > 0);
  assert.deepEqual(a.map((e) => e.id), b.map((e) => e.id));
  const dark = L.filterEntries(entries, { q: "buton koyu" });
  assert.ok(dark.length > 0 && dark.every((e) => e.category === "button" && e.tokens.mode === "dark"));
  assert.equal(L.filterEntries(entries, { q: "buton zzzyok" }).length, 0);
});

test("süzgeçler: kategori, tema, palet, etkileşimli, favoriler", () => {
  const pick = entries.find((e) => e.category === "card" && e.tokens.mode === "light");
  const r = L.filterEntries(entries, { category: "card", mode: "light", palette: pick.tokens.palette });
  assert.ok(r.length > 0 && r.every((e) => e.category === "card" && e.tokens.mode === "light" && e.tokens.palette === pick.tokens.palette));
  assert.ok(L.filterEntries(entries, { mode: "dark" }).length < entries.length);
  assert.ok(L.filterEntries(entries, { interactive: true }).every((e) => e.interactive && e.js.trim()));
  const fav = new Set([entries[3].id, entries[500].id]);
  assert.deepEqual(L.filterEntries(entries, { onlyFav: true, favorites: fav }).map((e) => e.id), [entries[3].id, entries[500].id]);
});

test("dışa aktarma: bağımsız belge; kapanış etiketleri kaçırılır, başlık HTML'e kaçırılır, dış kaynak yok", () => {
  const e = L.validateEntry({ id: "t-1", category: "card", name: 'A<b>"x"</b>', html: "<div class=\"c\">x</div>", css: ".c{}</style><script>alert(1)</script>", js: "var s='</script><img src=x>';", tokens: { colors: { bg: "#123456" } } });
  const doc = L.entryDocument(e);
  assert.match(doc, /^<!doctype html>/);
  assert.match(doc, /<title>A&lt;b&gt;&quot;x&quot;&lt;\/b&gt;<\/title>/);
  assert.equal((doc.match(/<\/style>/g) || []).length, 1, "CSS bloğu erken kapanmaz");
  assert.equal((doc.match(/<\/script>/g) || []).length, 1, "JS bloğu erken kapanmaz");
  assert.match(doc, /background:#123456/);
  assert.doesNotMatch(doc, /https?:\/\//);
  const noJs = L.entryDocument(entries.find((x) => !x.interactive));
  assert.doesNotMatch(noJs, /<script>/);
});

test("palet: piksellerden deterministik palet ve en yakın bileşenler", () => {
  const px = [];
  for (let i = 0; i < 300; i++) px.push(194, 37, 92, 255); // %75 gül kırmızısı (Rose primary)
  for (let i = 0; i < 100; i++) px.push(255, 241, 244, 255); // %25 açık pembe (Rose bg)
  for (let i = 0; i < 50; i++) px.push(0, 0, 0, 0); // saydam sayılmaz
  const pal = P.paletteFromPixels(px, 8);
  assert.deepEqual(pal.map((c) => [c.hex, c.pct]), [["#c2255c", 75], ["#fff1f4", 25]]);
  assert.equal(pal[0].text, "#ffffff");
  assert.equal(pal[1].text, "#111111");
  assert.deepEqual(P.paletteFromPixels([0, 0, 0, 0]), []);
  const near = L.nearestEntries(entries, pal, 10);
  assert.equal(near.length, 10);
  assert.ok(near.every((n) => n.entry.tokens.palette === "Rose"), "Rose paletindeki bileşenler önce gelmeli");
  assert.deepEqual(L.nearestEntries(entries, [], 5), []);
  assert.match(L.paletteCss(pal), /--renk-1: #c2255c; \/\* %75 \*\//);
});
