import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { settingsService } from "./services/SettingsService";
import { TimerService } from "./services/TimerService";
import { TrayManager, TrayManagerCallbacks } from "./services/TrayManager";
import type { SettingsFormData } from "./types/settings";
import type { TimerConfig, TimerType } from "./types/timer";
import { createLogger } from "./utils/logger";

const logger = createLogger("main");

let trayManager: TrayManager | null = null;
let timerService: TimerService | null = null;
let aboutWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

// Предотвращаем закрытие приложения при закрытии всех окон
app.on("window-all-closed", () => {
  // На macOS приложения обычно остаются активными даже когда все окна закрыты
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Функция создания окна "О программе"
function createAboutWindow(): void {
  if (aboutWindow) {
    aboutWindow.show();
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 400,
    height: 400,
    title: "О программе",
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  aboutWindow.loadFile(path.join(__dirname, "about.html"));

  // Убираем меню в окне (только для Windows/Linux)
  aboutWindow.setMenu(null);

  aboutWindow.on("closed", () => {
    aboutWindow = null;
  });
}

// Функция создания окна настроек
function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 450,
    height: 500,
    title: "Настройки",
    resizable: false,
    minimizable: false,
    maximizable: false,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      preload: path.join(
        __dirname,
        "windows",
        "preloads",
        "settingsPreload.js"
      ),
    },
  });

  settingsWindow.loadFile(path.join(__dirname, "windows", "settings.html"));

  // Убираем меню в окне (только для Windows/Linux)
  settingsWindow.setMenu(null);

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  // Центрирование окна
  settingsWindow.center();
}

// Функция создания и инициализации TimerService
function createTimerService(): void {
  timerService = new TimerService({
    onTick: (_remainingTime: number) => {
      // Обновляем трей каждую секунду
      if (trayManager && timerService) {
        trayManager.updateTimer(timerService.getCurrentTimer());
      }
    },
    onComplete: (type: TimerType, actualDuration: number) => {
      // TODO: Интегрировать с NotificationService и SoundService
      logger.info(
        `Timer completed: ${type}, duration: ${actualDuration} minutes`
      );

      // Обновляем трей после завершения таймера
      if (trayManager) {
        trayManager.updateTimer(null);
      }
    },
    onStart: (type: TimerType, duration: number) => {
      logger.info(`Timer started: ${type}, duration: ${duration} minutes`);

      // Обновляем трей при запуске таймера
      if (trayManager && timerService) {
        trayManager.updateTimer(timerService.getCurrentTimer());
      }
    },
    onStop: (type: TimerType, remainingTime: number) => {
      logger.info(
        `Timer stopped: ${type}, remaining: ${remainingTime} seconds`
      );

      // Обновляем трей после остановки таймера
      if (trayManager) {
        trayManager.updateTimer(null);
      }
    },
  });
}

// Функция создания системного трея
function createTrayManager(): void {
  const callbacks: TrayManagerCallbacks = {
    onStartTimer: (type) => {
      if (timerService) {
        // Получаем продолжительность из настроек
        const settings = settingsService.getSettings();
        let duration: number;

        switch (type) {
          case "work":
            duration = settings.workDuration;
            break;
          case "shortBreak":
            duration = settings.shortBreakDuration;
            break;
          case "longBreak":
            duration = settings.longBreakDuration;
            break;
          default:
            duration = 25; // fallback
        }

        const config: TimerConfig = { type, duration };
        timerService.startTimer(config);
      }
    },
    onStopTimer: () => {
      if (timerService) {
        timerService.stopTimer();
      }
    },
    onShowSettings: () => {
      createSettingsWindow();
    },
    onShowStats: () => {
      // TODO: Интегрировать с окном статистики
      logger.info("Show stats");
    },
    onShowAbout: () => {
      createAboutWindow();
    },
    onQuit: () => {
      app.quit();
    },
  };

  trayManager = new TrayManager(callbacks);
  trayManager.initialize();
}

// Настройка IPC обработчиков для окна настроек
function setupSettingsIPC(): void {
  // Получение текущих настроек
  ipcMain.handle("settings:get", async () => {
    try {
      return settingsService.getSettings();
    } catch (error) {
      logger.error("Error getting settings:", error);
      throw error;
    }
  });

  // Сохранение настроек
  ipcMain.handle(
    "settings:save",
    async (_event, formData: SettingsFormData) => {
      try {
        // Преобразуем данные формы в настройки приложения
        const updates = {
          workDuration: parseInt(formData.workDuration),
          shortBreakDuration: parseInt(formData.shortBreakDuration),
          longBreakDuration: parseInt(formData.longBreakDuration),
          soundEnabled: formData.soundEnabled,
        };

        await settingsService.updateSettings(updates);

        // Отправляем обновление всем окнам
        const updatedSettings = settingsService.getSettings();
        if (settingsWindow) {
          settingsWindow.webContents.send("settings:updated", updatedSettings);
        }
        if (aboutWindow) {
          aboutWindow.webContents.send("settings:updated", updatedSettings);
        }

        return true;
      } catch (error) {
        logger.error("Error saving settings:", error);
        throw error;
      }
    }
  );

  // Сброс к настройкам по умолчанию
  ipcMain.handle("settings:reset", async () => {
    try {
      await settingsService.resetToDefaults();

      // Отправляем обновление всем окнам
      const updatedSettings = settingsService.getSettings();
      if (settingsWindow) {
        settingsWindow.webContents.send("settings:updated", updatedSettings);
      }
      if (aboutWindow) {
        aboutWindow.webContents.send("settings:updated", updatedSettings);
      }

      return true;
    } catch (error) {
      logger.error("Error resetting settings:", error);
      throw error;
    }
  });

  // Закрытие окна настроек
  ipcMain.on("settings:close", () => {
    if (settingsWindow) {
      settingsWindow.close();
    }
  });
}

// Когда приложение готово
app.whenReady().then(async () => {
  try {
    // Инициализируем сервис настроек
    await settingsService.initialize();

    // Настраиваем IPC обработчики
    setupSettingsIPC();

    // Создаем TimerService
    createTimerService();

    // Скрываем иконку из дока на macOS
    if (process.platform === "darwin" && app.dock) {
      app.dock.hide();
    }

    createTrayManager();
  } catch (error) {
    logger.error("Failed to initialize application:", error);
    // Приложение может продолжить работу с настройками по умолчанию
    setupSettingsIPC();
    createTimerService();
    createTrayManager();
  }
});

// Обрабатываем событие активации (macOS)
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createAboutWindow();
  }
});

// Предотвращаем выход при закрытии окна на macOS
app.on("before-quit", () => {
  // Очищаем TimerService перед выходом
  if (timerService) {
    timerService.destroy();
  }

  // Очищаем трей перед выходом
  if (trayManager) {
    trayManager.destroy();
  }
});
