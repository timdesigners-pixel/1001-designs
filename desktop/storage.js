/* Masaüstü depolama: dosya tabanlı anahtar-değer deposu.
 * Atomik yazma (geçici dosya + rename), son sağlam yedek (.bak) ve boyut/anahtar sınırları. Electron'a bağımlı değildir; testler doğrudan çağırır. */
const fs = require("node:fs");
const path = require("node:path");

const MAX_BYTES = 50 * 1024 * 1024;
const KEY_RE = /^[a-z]{1,8}\.[A-Za-z0-9_.-]{1,64}$/;

class FileStore {
  constructor(dir, file = "store.json") {
    this.dir = dir;
    this.file = path.join(dir, file);
    this.queue = Promise.resolve();
  }
  _readSync() {
    for (const f of [this.file, this.file + ".bak"]) {
      try {
        const data = JSON.parse(fs.readFileSync(f, "utf8"));
        if (data && typeof data === "object" && !Array.isArray(data)) return Object.assign(Object.create(null), data);
      } catch {
        /* sonraki aday */
      }
    }
    return Object.create(null);
  }
  _writeSync(data) {
    const text = JSON.stringify(data);
    if (Buffer.byteLength(text) > MAX_BYTES) throw new Error("Depolama sınırı aşıldı (50 MB).");
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = this.file + ".tmp";
    fs.writeFileSync(tmp, text, "utf8");
    if (fs.existsSync(this.file)) fs.copyFileSync(this.file, this.file + ".bak");
    fs.renameSync(tmp, this.file);
  }
  _run(fn) {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => {});
    return next;
  }
  /** chrome.storage.local.get ile aynı: anahtar dizgesi, dizi veya null (hepsi). */
  get(keys) {
    return this._run(() => {
      const all = this._readSync();
      if (keys == null) return { ...all };
      const list = Array.isArray(keys) ? keys : [keys];
      const out = {};
      for (const k of list) if (typeof k === "string" && k in all) out[k] = all[k];
      return out;
    });
  }
  set(obj) {
    return this._run(() => {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("Geçersiz depolama isteği.");
      for (const k of Object.keys(obj)) if (!KEY_RE.test(k)) throw new Error("Geçersiz depolama anahtarı: " + k);
      const all = this._readSync();
      Object.assign(all, JSON.parse(JSON.stringify(obj)));
      this._writeSync(all);
    });
  }
}

module.exports = { FileStore, KEY_RE, MAX_BYTES };
