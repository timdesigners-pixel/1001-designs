// Geliştirme aracı: icons/ klasörüne PNG ikonları üretir (bağımlılık yok).
//   node tools/make-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

// Kırmızı yuvarlak kare + beyaz toplu iğne (pin) simgesi, 3x3 süper örnekleme
function render(size) {
  const SS = 3;
  const px = Buffer.alloc(size * size * 4);
  const inRoundRect = (x, y, r) => {
    const cx = Math.min(Math.max(x, r), 1 - r);
    const cy = Math.min(Math.max(y, r), 1 - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  const inPin = (x, y) => {
    const d = Math.hypot(x - 0.5, y - 0.4);
    if (d <= 0.19 && Math.hypot(x - 0.5, y - 0.4) > 0.07) return true; // halka
    // damla kuyruğu
    if (y > 0.4 && y < 0.8) {
      const t = (y - 0.4) / 0.4;
      const half = 0.17 * (1 - t);
      return Math.abs(x - 0.5) <= half;
    }
    return false;
  };
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let a = 0, r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (i + (sx + 0.5) / SS) / size;
          const y = (j + (sy + 0.5) / SS) / size;
          if (!inRoundRect(x, y, 0.22)) continue;
          a++;
          const t = y;
          const base = [230 - 57 * t * 0.6, 0 + 8 * t, 35 - 8 * t]; // #e60023 -> koyu
          const white = inPin(x, y);
          r += white ? 255 : base[0];
          g += white ? 255 : base[1];
          b += white ? 255 : base[2];
        }
      }
      const o = (j * size + i) * 4;
      if (a) {
        px[o] = Math.round(r / a);
        px[o + 1] = Math.round(g / a);
        px[o + 2] = Math.round(b / a);
        px[o + 3] = Math.round((a / (SS * SS)) * 255);
      }
    }
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let j = 0; j < size; j++) {
    raw[j * (size * 4 + 1)] = 0;
    px.copy(raw, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });
for (const s of [16, 32, 48, 128]) fs.writeFileSync(path.join(out, `icon${s}.png`), render(s));
console.log('icons written');
