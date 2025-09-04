import { contextBridge } from 'electron';

// Экспортируем безопасный API для рендер-процесса
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});