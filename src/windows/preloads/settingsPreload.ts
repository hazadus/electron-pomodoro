import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import type { AppSettings, SettingsFormData } from "../../types/settings";

// API для окна настроек
const settingsAPI = {
  // Получить текущие настройки
  getSettings: (): Promise<AppSettings> => {
    return ipcRenderer.invoke("settings:get");
  },

  // Сохранить настройки
  saveSettings: (settings: SettingsFormData): Promise<void> => {
    return ipcRenderer.invoke("settings:save", settings);
  },

  // Сбросить к настройкам по умолчанию
  resetToDefaults: (): Promise<void> => {
    return ipcRenderer.invoke("settings:reset");
  },

  // Закрыть окно настроек
  closeWindow: (): void => {
    ipcRenderer.send("settings:close");
  },

  // Слушать события обновления настроек
  onSettingsUpdate: (callback: (settings: AppSettings) => void) => {
    const handler = (_event: IpcRendererEvent, settings: AppSettings) =>
      callback(settings);
    ipcRenderer.on("settings:updated", handler);

    // Возвращаем функцию для отписки
    return () => {
      ipcRenderer.removeListener("settings:updated", handler);
    };
  },
};

// Расширяем интерфейс Window
declare global {
  interface Window {
    electronAPI: {
      settings: typeof settingsAPI;
    };
  }
}

// Безопасно экспортируем API в renderer процесс
contextBridge.exposeInMainWorld("electronAPI", {
  settings: settingsAPI,
});
