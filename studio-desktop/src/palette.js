/* Görselden baskın renk paleti (deterministik k-means). design-replicator/lib/palette.js'in masaüstü uyarlaması:
 * hesaplama saf işlevdedir (testlenebilir), görsel çözme yalnız tarayıcı tarafındadır. Görsel cihazdan çıkmaz. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BDPalette = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const toHex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

  /** RGBA piksel dizisinden palet: [{hex, pct, text}] (çoktan aza). Saydam pikseller sayılmaz. */
  function paletteFromPixels(data, k = 8) {
    const pts = [];
    for (let i = 0; i + 3 < data.length; i += 4) if (data[i + 3] > 125) pts.push([data[i], data[i + 1], data[i + 2]]);
    if (!pts.length) return [];
    // En uzak nokta başlangıcı (k-means++ benzeri ama deterministik)
    const centers = [pts[0].slice()];
    while (centers.length < Math.min(k, pts.length)) {
      let best = null, bestD = -1;
      for (const p of pts) {
        let d = Infinity;
        for (const c of centers) d = Math.min(d, dist2(p, c));
        if (d > bestD) { bestD = d; best = p; }
      }
      if (bestD <= 0) break;
      centers.push(best.slice());
    }
    let counts = [];
    for (let it = 0; it < 12; it++) {
      const sums = centers.map(() => [0, 0, 0]);
      counts = new Array(centers.length).fill(0);
      for (const p of pts) {
        let bi = 0, bd = Infinity;
        for (let c = 0; c < centers.length; c++) { const d = dist2(p, centers[c]); if (d < bd) { bd = d; bi = c; } }
        sums[bi][0] += p[0]; sums[bi][1] += p[1]; sums[bi][2] += p[2]; counts[bi]++;
      }
      centers.forEach((c, i) => { if (counts[i]) { c[0] = sums[i][0] / counts[i]; c[1] = sums[i][1] / counts[i]; c[2] = sums[i][2] / counts[i]; } });
    }
    const sorted = centers.map((c, i) => ({ rgb: c, n: counts[i] })).filter((c) => c.n > 0).sort((a, b) => b.n - a.n);
    // Birbirine çok yakın renkleri birleştir
    const merged = [];
    for (const c of sorted) {
      const near = merged.find((m) => dist2(m.rgb, c.rgb) < 28 ** 2);
      if (near) near.n += c.n; else merged.push({ ...c });
    }
    const total = merged.reduce((a, c) => a + c.n, 0);
    return merged.map((c) => ({
      hex: toHex(...c.rgb),
      pct: Math.round((c.n / total) * 100),
      text: 0.2126 * c.rgb[0] + 0.7152 * c.rgb[1] + 0.0722 * c.rgb[2] > 150 ? "#111111" : "#ffffff",
    }));
  }

  /** Tarayıcı: Blob/File → palet. Görsel 96 piksele küçültülerek okunur. */
  async function extractPalette(blob, k = 8) {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 96 / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const cv = new OffscreenCanvas(w, h);
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, w, h);
    const size = { width: bmp.width, height: bmp.height };
    if (bmp.close) bmp.close();
    return { colors: paletteFromPixels(ctx.getImageData(0, 0, w, h).data, k), ...size };
  }

  return { paletteFromPixels, extractPalette };
});
