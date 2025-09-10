import { contextBridge, ipcRenderer } from "electron";

// Экспортируем безопасный API для рендер-процесса
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});
