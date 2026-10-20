// Monaco web worker önyükleyicisi (MV3 CSP: blob: worker yok, bu yüzden dosya tabanlı).
self.MonacoEnvironment = { baseUrl: new URL('./', self.location.href).href };
importScripts(self.MonacoEnvironment.baseUrl + 'vs/base/worker/workerMain.js');
