/**
 * Preload скрипт для окна статистики
 * Предоставляет безопасный API для взаимодействия с главным процессом
 */

import { contextBridge, ipcRenderer } from "electron";
import type { StatsData } from "../../types/stats";

export interface StatsAPI {
  // Получение текущей статистики
  getStats(): Promise<StatsData>;

  // Показ диалога подтверждения сброса
  showResetDialog(): Promise<boolean>;

  // Сброс статистики
  resetStats(): Promise<void>;

  // Закрытие окна
  closeWindow(): void;

  // Подписка на обновления статистики
  onStatsUpdated(callback: (stats: StatsData) => void): void;

  // Отписка от обновлений
  removeStatsListener(): void;
}

// Определяем API для окна статистики
const statsAPI: StatsAPI = {
  // Получение текущей статистики
  async getStats(): Promise<StatsData> {
    return await ipcRenderer.invoke("stats:get");
  },

  // Показ диалога подтверждения сброса
  async showResetDialog(): Promise<boolean> {
    return await ipcRenderer.invoke("stats:show-reset-dialog");
  },

  // Сброс статистики
  async resetStats(): Promise<void> {
    return await ipcRenderer.invoke("stats:reset");
  },

  // Закрытие окна статистики
  closeWindow(): void {
    ipcRenderer.send("stats:close");
  },

  // Подписка на обновления статистики из главного процесса
  onStatsUpdated(callback: (stats: StatsData) => void): void {
    ipcRenderer.on("stats:updated", (_event, stats: StatsData) => {
      callback(stats);
    });
  },

  // Удаление слушателя обновлений статистики
  removeStatsListener(): void {
    ipcRenderer.removeAllListeners("stats:updated");
  },
};

// Проверяем, что contextIsolation включен
if (process.contextIsolated) {
  try {
    // Безопасно экспортируем API в renderer процесс
    contextBridge.exposeInMainWorld("electronAPI", {
      stats: statsAPI,
    });
  } catch (error) {
    console.error("Failed to expose stats API:", error);
  }
} else {
  // Fallback для старых версий Electron (не рекомендуется)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).electronAPI = {
    stats: statsAPI,
  };
}

// Логирование для отладки
console.log("Stats preload script loaded successfully");
