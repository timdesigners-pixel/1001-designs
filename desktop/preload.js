/* Masaüstü kabuğu: sayfaya yalnız `window.bdDesktop` adlı dar bir arayüz verir (contextBridge). Node/Electron API'si sızdırılmaz. */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bdDesktop", {
  platform: process.platform,
  library: () => ipcRenderer.invoke("library:list"),
  copy: (text) => ipcRenderer.invoke("clipboard:write", text),
  exportHtml: (id) => ipcRenderer.invoke("export:html", id),
  storage: {
    get: (keys) => ipcRenderer.invoke("storage:get", keys),
    set: (obj) => ipcRenderer.invoke("storage:set", obj),
  },
});
