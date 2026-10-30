/* Binbir Dizayn Stüdyo — kütüphane çekirdeği. Tarayıcıda <script> olarak, ana süreçte ve testlerde require ile yüklenir.
 * Veri seti güvenilmeyen girdi gibi doğrulanır; arama Türkçe karakterlere duyarsızdır; dışa aktarılan belge kapanış etiketlerine karşı kaçırılır. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BDLibrary = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const MAX_CODE = 200 * 1024;
  const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
  const SLUG_RE = /^[a-z0-9-]{1,40}$/;
  const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
  const COLOR_KEYS = ["primary", "onPrimary", "bg", "surface", "text", "muted", "border", "accent"];

  const FOLD = { ı: "i", İ: "i", ğ: "g", Ğ: "g", ü: "u", Ü: "u", ş: "s", Ş: "s", ö: "o", Ö: "o", ç: "c", Ç: "c" };
  /** Arama için katlama: küçük harf, Türkçe harfler ve aksanlar düz Latin harfe. */
  function fold(s) {
    return String(s == null ? "" : s)
      .replace(/[ıİğĞüÜşŞöÖçÇ]/g, (c) => FOLD[c])
      .normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  /** Kategori adlarının Türkçesi (görüntü ve arama için; veri setindeki İngilizce ad da aranır). */
  const TR = {
    accordion: "Akordeon", alert: "Uyarı", avatar: "Avatar", badge: "Rozet", "pricing-toggle": "Fatura dönemi seçici", breadcrumb: "İçerik yolu",
    button: "Buton", cta: "Eylem çağrısı", card: "Kart", carousel: "Döngü / kaydırıcı", chat: "Sohbet penceresi", checklist: "Yapılacaklar listesi",
    "contact-form": "İletişim formu", table: "Veri tablosu", dropdown: "Açılır menü", "empty-state": "Boş durum", features: "Özellik bölümü",
    footer: "Alt bilgi", hero: "Kahraman bölümü", gallery: "Görsel galerisi", "login-form": "Giriş formu", modal: "Modal diyalog", navbar: "Gezinme çubuğu",
    newsletter: "Bülten kaydı", pagination: "Sayfalama", "pricing-card": "Fiyat kartı", "product-card": "Ürün kartı", "profile-card": "Profil kartı",
    progress: "İlerleme", quantity: "Adet seçici", rating: "Puanlama", "search-bar": "Arama çubuğu", sidebar: "Kenar çubuğu", "signup-form": "Kayıt formu",
    skeleton: "İskelet yükleyici", stats: "İstatistik / KPI", tabs: "Sekmeler", testimonial: "Kullanıcı yorumu", timeline: "Zaman çizelgesi",
    toast: "Bildirim (toast)", toggle: "Aç/kapa anahtarı", tooltip: "İpucu / açılır kutu",
  };
  const titleTr = (cat, fallback) => TR[cat] || fallback || cat;

  const str = (v, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
  const code = (v) => (typeof v === "string" && v.length <= MAX_CODE ? v : null);

  /** Bir veri seti girdisini doğrular; geçersizse null. Yalnız bilinen alanlar kopyalanır. */
  function validateEntry(e) {
    if (!e || typeof e !== "object" || Array.isArray(e)) return null;
    if (typeof e.id !== "string" || !ID_RE.test(e.id)) return null;
    if (typeof e.category !== "string" || !SLUG_RE.test(e.category)) return null;
    const html = code(e.html), css = code(e.css == null ? "" : e.css), js = code(e.js == null ? "" : e.js);
    if (html == null || css == null || js == null || !html.trim()) return null;
    const t = e.tokens && typeof e.tokens === "object" ? e.tokens : {};
    const colors = {};
    const src = t.colors && typeof t.colors === "object" ? t.colors : {};
    for (const k of COLOR_KEYS) if (typeof src[k] === "string" && HEX_RE.test(src[k])) colors[k] = src[k].toLowerCase();
    return {
      id: e.id,
      category: e.category,
      categoryTitle: str(e.categoryTitle, 60) || e.category,
      categoryTr: titleTr(e.category, str(e.categoryTitle, 60)),
      name: str(e.name, 160) || e.id,
      layout: str(e.layout, 60),
      tags: Array.isArray(e.tags) ? e.tags.filter((x) => typeof x === "string").map((x) => x.slice(0, 40)).slice(0, 24) : [],
      description: str(e.description, 600),
      tokens: {
        palette: str(t.palette, 40),
        mode: t.mode === "dark" ? "dark" : "light",
        colors,
        radius: Number.isFinite(t.radius) ? Math.max(0, Math.min(64, t.radius)) : null,
        radiusName: str(t.radiusName, 20),
        shadow: str(t.shadow, 20),
        font: str(t.font, 20),
        density: str(t.density, 20),
      },
      interactive: e.interactive === true && js.trim().length > 0,
      html, css, js,
    };
  }

  /** Veri setini doğrular; geçersiz ve yinelenen kimlikleri atar, kaç tanesinin atıldığını bildirir (sessiz kayıp yok). */
  function validateDataset(list) {
    if (!Array.isArray(list)) throw new Error("Veri seti bir dizi değil.");
    const seen = new Set(), entries = [];
    let rejected = 0;
    for (const raw of list) {
      const e = validateEntry(raw);
      if (!e || seen.has(e.id)) { rejected++; continue; }
      seen.add(e.id);
      entries.push(e);
    }
    return { entries, rejected };
  }

  function haystack(e) {
    return fold([e.name, e.category, e.categoryTitle, e.categoryTr, e.layout, e.tags.join(" "), e.tokens.palette, e.tokens.mode === "dark" ? "koyu dark" : "acik light", e.interactive ? "etkilesimli interactive" : "", e.id].join(" "));
  }

  /** Süzgeç: q (çok sözcüklü VE), category, mode, palette, interactive, favorites (Set) + onlyFav. */
  function filterEntries(entries, opts = {}) {
    const words = fold(opts.q || "").split(/\s+/).filter(Boolean);
    const fav = opts.favorites instanceof Set ? opts.favorites : new Set(opts.favorites || []);
    return entries.filter((e) => {
      if (opts.category && e.category !== opts.category) return false;
      if (opts.mode && e.tokens.mode !== opts.mode) return false;
      if (opts.palette && e.tokens.palette !== opts.palette) return false;
      if (opts.interactive && !e.interactive) return false;
      if (opts.onlyFav && !fav.has(e.id)) return false;
      if (!words.length) return true;
      const h = e._h || (e._h = haystack(e));
      return words.every((w) => h.includes(w));
    });
  }

  function categories(entries) {
    const m = new Map();
    for (const e of entries) {
      const c = m.get(e.category) || { category: e.category, title: e.categoryTr, count: 0 };
      c.count++;
      m.set(e.category, c);
    }
    return [...m.values()].sort((a, b) => a.title.localeCompare(b.title, "tr"));
  }

  function palettes(entries) {
    return [...new Set(entries.map((e) => e.tokens.palette).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  }

  const escHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /** <style>/<script> içeriği kendi kapanış etiketiyle bloğu erken bitiremesin. */
  const escBlock = (s) => String(s).replace(/<\/(style|script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--");

  /** Tek dosya, bağımsız çalışan HTML belgesi (dışa aktarma). Dış kaynak yüklemez. */
  function entryDocument(e) {
    const bg = e.tokens.colors.bg || (e.tokens.mode === "dark" ? "#111111" : "#ffffff");
    return [
      "<!doctype html>",
      '<html lang="tr">',
      "<head>",
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      `<title>${escHtml(e.name)}</title>`,
      `<!-- Binbir Dizayn · ${escHtml(e.id)} · ${escHtml(e.category)} · lisans: MIT -->`,
      `<style>\nbody{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:${bg}}\n${escBlock(e.css)}\n</style>`,
      "</head>",
      "<body>",
      e.html,
      e.js && e.js.trim() ? `<script>\n${escBlock(e.js)}\n</script>` : "",
      "</body>",
      "</html>",
      "",
    ].filter((x) => x !== "").join("\n");
  }

  function hexToRgb(hex) {
    let h = String(hex).replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

  /**
   * Görselden çıkarılan palete (en çok kullanılan önce, {hex, pct}) en yakın bileşenler.
   * Her palet rengi için bileşenin belirteç renklerine en kısa uzaklık alınır, kullanım yüzdesiyle ağırlıklandırılır. Küçük puan = daha yakın.
   */
  function nearestEntries(entries, palette, n = 12) {
    const cols = (palette || []).filter((c) => c && HEX_RE.test(c.hex)).slice(0, 5).map((c) => ({ rgb: hexToRgb(c.hex), w: Math.max(1, c.pct || 1) }));
    if (!cols.length) return [];
    const wsum = cols.reduce((a, c) => a + c.w, 0);
    return entries
      .map((e) => {
        const ec = ["primary", "bg", "surface", "accent", "text"].map((k) => e.tokens.colors[k]).filter(Boolean).map(hexToRgb);
        if (!ec.length) return null;
        const score = cols.reduce((a, c) => a + c.w * Math.min(...ec.map((x) => dist(c.rgb, x))), 0) / wsum;
        return { entry: e, score };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score || a.entry.id.localeCompare(b.entry.id))
      .slice(0, n);
  }

  /** Paleti CSS değişkenleri olarak (kopyalamak için). */
  function paletteCss(palette) {
    const lines = (palette || []).filter((c) => c && HEX_RE.test(c.hex)).map((c, i) => `  --renk-${i + 1}: ${c.hex}; /* %${c.pct} */`);
    return `:root {\n${lines.join("\n")}\n}\n`;
  }

  return { fold, validateEntry, validateDataset, filterEntries, categories, palettes, entryDocument, nearestEntries, paletteCss, hexToRgb, MAX_CODE };
});
