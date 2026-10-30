/* Binbir Dizayn Stüdyo — Windows (ve Electron'un desteklediği diğer) masaüstü kabuğu.
 * Arayüz studio-desktop/index.html'dir. 1001 bileşenlik veri seti uygulamayla gelir ve ana süreçte doğrulanır.
 * Ağ isteği yoktur: http/https/ws istekleri oturum düzeyinde iptal edilir. Önizlemeler ayrı, sandbox'lı iframe'de çalışır. */
const { app, BrowserWindow, ipcMain, session, Menu, nativeTheme, dialog, clipboard } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { FileStore } = require("./storage");
const L = require("../studio-desktop/src/library.js");

const root = path.join(__dirname, "..");
const ui = path.join(root, "studio-desktop");
// Kurulum klasörü boşluk/Türkçe harf içerebilir ("Binbir Dizayn Stüdyo"); URL'ler çözülmüş yol olarak karşılaştırılır.
const filePath = (u) => {
  try { const x = new URL(u); return x.protocol === "file:" ? decodeURIComponent(x.pathname).replace(/\\/g, "/").toLowerCase() : null; } catch { return null; }
};
const previewPath = filePath(require("node:url").pathToFileURL(path.join(ui, "preview.html")).href);
// Test ortamında (CI/duman testi) kullanıcı verisine dokunmamak için ayrı klasör verilebilir.
if (process.env.BD_USER_DATA) app.setPath("userData", process.env.BD_USER_DATA);
let win = null;
let store = null;
let lib = null; // { entries, byId, rejected, meta }

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

function loadLibrary() {
  const raw = JSON.parse(fs.readFileSync(path.join(root, "design-replicator", "dataset", "components.json"), "utf8"));
  const { entries, rejected } = L.validateDataset(raw);
  let meta = {};
  try {
    const m = JSON.parse(fs.readFileSync(path.join(root, "design-replicator", "dataset", "meta.json"), "utf8"));
    meta = { version: String(m.version || ""), license: String(m.license || "") };
  } catch { /* meta isteğe bağlı */ }
  return { entries, rejected, meta, byId: new Map(entries.map((e) => [e.id, e])) };
}

function show() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow() {
  nativeTheme.themeSource = "dark";
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 800,
    minHeight: 560,
    useContentSize: true,
    autoHideMenuBar: true,
    title: "Binbir Dizayn Stüdyo",
    icon: path.join(__dirname, "icon256.png"),
    backgroundColor: "#0e1322", // --pl-bg-1 (koyu); açılışta beyaz parlama olmaması için
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      spellcheck: false,
    },
  });
  win.once("ready-to-show", show);
  win.loadFile(path.join(ui, "index.html"));
  // Ana sayfa gezinemez; iframe'ler yalnız önizleme sayfasını açabilir. Yeni pencere açılmaz.
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.webContents.on("will-frame-navigate", (e) => {
    if (!e.isMainFrame && filePath(e.url) !== previewPath) e.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.on("closed", () => { win = null; });
}

// IPC yalnız kendi penceremizin ana çerçevesinden gelen çağrıları kabul eder (önizleme iframe'leri değil).
function assertOwn(e) {
  if (!win || e.sender !== win.webContents || (e.senderFrame && e.senderFrame !== win.webContents.mainFrame)) throw new Error("Yetkisiz istek.");
}

if (gotLock) {
  app.on("second-instance", show);
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    const ses = session.defaultSession;
    // Hiçbir izin (kamera, bildirim, pano okuma…) verilmez.
    ses.setPermissionRequestHandler((_wc, _permission, cb) => cb(false));
    ses.setPermissionCheckHandler(() => false);
    // Ağ yok: yalnız uygulama dosyaları, data: ve blob: yüklenir.
    ses.webRequest.onBeforeRequest((details, cb) => cb({ cancel: !/^(file|data|blob|devtools):/i.test(details.url) }));
    store = new FileStore(app.getPath("userData"));
    lib = loadLibrary();

    ipcMain.handle("library:list", (e) => { assertOwn(e); return { entries: lib.entries, rejected: lib.rejected, meta: lib.meta }; });
    ipcMain.handle("storage:get", (e, keys) => { assertOwn(e); return store.get(keys); });
    ipcMain.handle("storage:set", (e, obj) => { assertOwn(e); return store.set(obj); });
    ipcMain.handle("clipboard:write", (e, text) => {
      assertOwn(e);
      if (typeof text !== "string" || text.length > 2 * 1024 * 1024) throw new Error("Geçersiz pano içeriği.");
      clipboard.writeText(text);
      return true;
    });
    // Dışa aktarma: sayfa yalnız kimlik gönderir; belge doğrulanmış veriden ana süreçte üretilir.
    ipcMain.handle("export:html", async (e, id) => {
      assertOwn(e);
      const entry = typeof id === "string" ? lib.byId.get(id) : null;
      if (!entry) throw new Error("Bileşen bulunamadı.");
      let file = process.env.BD_EXPORT_PATH; // yalnız otomatik test: diyalog otomasyonla açılamaz
      if (!file) {
        const r = await dialog.showSaveDialog(win, {
          title: "HTML olarak kaydet",
          defaultPath: path.join(app.getPath("documents"), `${entry.id}-${entry.category}.html`),
          filters: [{ name: "HTML belgesi", extensions: ["html"] }],
        });
        if (r.canceled || !r.filePath) return { canceled: true };
        file = r.filePath;
      }
      fs.writeFileSync(file, L.entryDocument(entry), "utf8");
      return { ok: true, file: path.basename(file) };
    });
    createWindow();
    app.on("activate", () => { if (!win) createWindow(); });
  });
  app.on("window-all-closed", () => app.quit());
}
