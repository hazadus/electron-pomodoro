import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeImage,
  shell,
} from "electron";
import * as fs from "fs";
import * as path from "path";
import {
  NotificationHandler,
  NotificationService,
} from "./services/NotificationService";
import { settingsService } from "./services/SettingsService";
import { SoundService } from "./services/SoundService";
import { statsService } from "./services/StatsService";
import { TimerService } from "./services/TimerService";
import { TrayManager, TrayManagerCallbacks } from "./services/TrayManager";
import type { NotificationActionType } from "./types/notification";
import type { SettingsFormData } from "./types/settings";
import type { TimerConfig, TimerType } from "./types/timer";
import { ASSETS_PATHS, WINDOW_CONFIG } from "./utils/constants";
import { createLogger } from "./utils/logger";

const logger = createLogger("main");

// Читаем информацию о версии и сборке
let buildInfo = {
  version: "1.0.0", // fallback версия
  buildTime: null as string | null,
  buildTimestamp: null as number | null,
};

try {
  // Сначала пытаемся прочитать buildinfo.json
  const buildInfoPath = path.join(__dirname, "..", "buildinfo.json");
  if (fs.existsSync(buildInfoPath)) {
    const buildInfoData = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
    buildInfo = {
      version: buildInfoData.version,
      buildTime: buildInfoData.buildTime,
      buildTimestamp: buildInfoData.buildTimestamp,
    };
    logger.info("Build info loaded:", buildInfo);
  } else {
    // Fallback к чтению только версии из package.json
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageData = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    buildInfo.version = packageData.version;
    logger.info("App version loaded from package.json:", buildInfo.version);
  }
} catch (error) {
  logger.warn("Failed to read build info:", error);
}

// Устанавливаем название приложения для системных уведомлений
app.setName("Pomodoro Timer");

let trayManager: TrayManager | null = null;
let timerService: TimerService | null = null;
let notificationService: NotificationService | null = null;
let soundService: SoundService | null = null;
let aboutWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let statsWindow: BrowserWindow | null = null;

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
    width: WINDOW_CONFIG.ABOUT.width,
    height: WINDOW_CONFIG.ABOUT.height,
    title: "О программе",
    resizable: WINDOW_CONFIG.ABOUT.resizable,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  aboutWindow.loadFile(path.join(__dirname, "windows", "about.html"));

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
    width: WINDOW_CONFIG.SETTINGS.width,
    height: WINDOW_CONFIG.SETTINGS.height,
    title: "Настройки",
    resizable: WINDOW_CONFIG.SETTINGS.resizable,
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

// Функция создания окна статистики
function createStatsWindow(): void {
  if (statsWindow) {
    statsWindow.show();
    statsWindow.focus();
    return;
  }

  statsWindow = new BrowserWindow({
    width: WINDOW_CONFIG.STATS.width,
    height: WINDOW_CONFIG.STATS.height,
    title: "Статистика",
    resizable: WINDOW_CONFIG.STATS.resizable,
    minimizable: false,
    maximizable: false,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      preload: path.join(__dirname, "windows", "preloads", "statsPreload.js"),
    },
  });

  statsWindow.loadFile(path.join(__dirname, "windows", "stats.html"));

  // Убираем меню в окне (только для Windows/Linux)
  statsWindow.setMenu(null);

  statsWindow.on("closed", () => {
    statsWindow = null;
  });

  // Центрирование окна
  statsWindow.center();
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
    onComplete: async (type: TimerType, actualDuration: number) => {
      logger.info(
        `Timer completed: ${type}, duration: ${actualDuration} minutes`
      );

      // Обновляем статистику
      try {
        statsService.incrementSession(type);

        // Добавляем время в зависимости от типа сессии
        if (type === "work") {
          statsService.addTime("work", actualDuration);
        } else {
          // Для коротких и длинных перерывов добавляем время отдыха
          statsService.addTime("break", actualDuration);
        }

        logger.info("Statistics updated successfully", {
          type,
          actualDuration,
        });
      } catch (error) {
        logger.error("Failed to update statistics:", error);
      }

      // Обновляем трей после завершения таймера
      if (trayManager) {
        trayManager.updateTimer(null);
      }

      // Показываем уведомление
      if (notificationService) {
        try {
          await notificationService.showInteractiveNotification(type);
        } catch (error) {
          logger.error("Failed to show notification:", error);
        }
      }

      // Воспроизводим звук
      if (soundService) {
        const settings = settingsService.getSettings();
        if (settings.soundEnabled) {
          try {
            await soundService.playNotificationSound();
          } catch (error) {
            logger.error("Failed to play notification sound:", error);
          }
        }
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

// Класс для обработки уведомлений
class NotificationHandlerImpl implements NotificationHandler {
  onNotificationAction(action: NotificationActionType): void {
    logger.info("Notification action triggered:", { action });

    if (!timerService) {
      logger.error("TimerService not available for action:", { action });
      return;
    }

    try {
      const settings = settingsService.getSettings();

      // Проверяем, есть ли активный таймер и останавливаем его перед запуском нового
      const currentTimer = timerService.getCurrentTimer();
      if (
        currentTimer &&
        (timerService.isRunning() || timerService.isPaused())
      ) {
        logger.info("Stopping current timer before starting new one", {
          currentType: currentTimer.type,
          currentState: currentTimer.state,
          newAction: action,
        });
        timerService.stopTimer();
      }

      switch (action) {
        case "start-work":
          logger.info("Starting work timer from notification", {
            duration: settings.workDuration,
          });
          timerService.startTimer({
            type: "work",
            duration: settings.workDuration,
          });
          break;
        case "start-short-break":
          logger.info("Starting short break timer from notification", {
            duration: settings.shortBreakDuration,
          });
          timerService.startTimer({
            type: "shortBreak",
            duration: settings.shortBreakDuration,
          });
          break;
        case "start-long-break":
          logger.info("Starting long break timer from notification", {
            duration: settings.longBreakDuration,
          });
          timerService.startTimer({
            type: "longBreak",
            duration: settings.longBreakDuration,
          });
          break;
        case "dismiss":
          logger.info("Notification dismissed - no timer action");
          break;
        default:
          logger.warn("Unknown notification action received:", { action });
          break;
      }

      // Проверяем, что таймер действительно запустился
      if (action !== "dismiss") {
        setTimeout(() => {
          const newTimer = timerService?.getCurrentTimer();
          if (!newTimer || newTimer.state !== "running") {
            logger.error("Timer failed to start after notification action", {
              action,
              timerState: newTimer?.state || "null",
              timerType: newTimer?.type || "null",
            });
          } else {
            logger.info("Timer successfully started from notification", {
              action,
              timerType: newTimer.type,
              timerDuration: newTimer.duration,
            });
          }
        }, 100); // Небольшая задержка для проверки состояния
      }
    } catch (error) {
      logger.error("Error handling notification action", {
        action,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// Функция проверки активного таймера перед выходом
async function checkActiveTimerBeforeQuit(): Promise<boolean> {
  if (!timerService) {
    return true; // Если нет сервиса таймера, разрешаем выход
  }

  const currentTimer = timerService.getCurrentTimer();
  const isTimerActive = timerService.isRunning() || timerService.isPaused();

  if (!isTimerActive || !currentTimer) {
    return true; // Если таймер неактивен, разрешаем выход
  }

  try {
    const timerTypeText =
      currentTimer.type === "work"
        ? "работы"
        : currentTimer.type === "shortBreak"
          ? "короткого перерыва"
          : "длинного перерыва";

    const remainingTimeText = TimerService.formatTime(
      currentTimer.remainingTime
    );
    const stateText =
      currentTimer.state === "paused" ? "приостановлен" : "активен";

    const result = await dialog.showMessageBox({
      type: "warning",
      title: "Активный таймер",
      message: `Таймер ${timerTypeText} ${stateText}`,
      detail: `Оставшееся время: ${remainingTimeText}\n\nВы действительно хотите остановить таймер и выйти из приложения?`,
      buttons: ["Отмена", "Остановить таймер и выйти"],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });

    if (result.response === 1) {
      // Пользователь выбрал "Остановить таймер и выйти"
      timerService.stopTimer();
      logger.info("Timer stopped before application quit", {
        type: currentTimer.type,
        remainingTime: currentTimer.remainingTime,
      });
      return true;
    } else {
      // Пользователь выбрал "Отмена"
      logger.info("Application quit cancelled due to active timer", {
        type: currentTimer.type,
        remainingTime: currentTimer.remainingTime,
      });
      return false;
    }
  } catch (error) {
    logger.error("Error showing quit confirmation dialog:", error);
    // В случае ошибки разрешаем выход
    return true;
  }
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
      createStatsWindow();
    },
    onShowAbout: () => {
      createAboutWindow();
    },
    onQuit: async () => {
      const canQuit = await checkActiveTimerBeforeQuit();
      if (canQuit) {
        app.quit();
      }
    },
  };

  trayManager = new TrayManager(callbacks);
  trayManager.initialize();
}

// Настройка IPC обработчиков для основных функций
function setupMainIPC(): void {
  // Получение информации о версии и сборке
  ipcMain.handle("app:get-version", async () => {
    return buildInfo.version;
  });

  // Получение полной информации о сборке
  ipcMain.handle("app:get-build-info", async () => {
    return buildInfo;
  });

  // Открытие внешней ссылки в системном браузере
  ipcMain.handle("app:open-external", async (_event, url: string) => {
    try {
      logger.info("Opening external URL:", url);
      await shell.openExternal(url);
      return true;
    } catch (error) {
      logger.error("Failed to open external URL:", error);
      throw error;
    }
  });
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

        // Обновляем меню трея с новыми настройками
        if (trayManager) {
          trayManager.refreshMenu();
        }

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

      // Обновляем меню трея с новыми настройками
      if (trayManager) {
        trayManager.refreshMenu();
      }

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

// Настройка IPC обработчиков для окна статистики
function setupStatsIPC(): void {
  // Получение текущей статистики
  ipcMain.handle("stats:get", async () => {
    try {
      return statsService.getStats();
    } catch (error) {
      logger.error("Error getting stats:", error);
      throw error;
    }
  });

  // Показ диалога подтверждения сброса
  ipcMain.handle("stats:show-reset-dialog", async () => {
    try {
      if (!statsWindow) {
        throw new Error("Stats window not available");
      }

      const result = await dialog.showMessageBox(statsWindow, {
        type: "warning",
        title: "Подтверждение сброса",
        message: "Сбросить всю статистику?",
        detail: "Это действие нельзя отменить.",
        buttons: ["Отмена", "Сбросить"],
        defaultId: 0,
        cancelId: 0,
      });

      return result.response === 1; // true если выбрана кнопка "Сбросить"
    } catch (error) {
      logger.error("Error showing reset dialog:", error);
      throw error;
    }
  });

  // Сброс статистики
  ipcMain.handle("stats:reset", async () => {
    try {
      await statsService.resetStats();

      // Отправляем обновленную статистику всем окнам статистики
      const updatedStats = statsService.getStats();
      if (statsWindow) {
        statsWindow.webContents.send("stats:updated", updatedStats);
      }

      return true;
    } catch (error) {
      logger.error("Error resetting stats:", error);
      throw error;
    }
  });

  // Закрытие окна статистики
  ipcMain.on("stats:close", () => {
    if (statsWindow) {
      statsWindow.close();
    }
  });
}

// Функция инициализации сервисов
function initializeServices(): void {
  // Инициализируем SoundService
  soundService = new SoundService();
  logger.info("SoundService initialized");

  // Инициализируем TimerService
  createTimerService();

  // Создаем TrayManager
  createTrayManager();

  // Инициализируем NotificationService после создания трея
  const tray = trayManager?.getTray();
  const contextMenu = trayManager?.getContextMenu();

  if (tray && contextMenu) {
    notificationService = new NotificationService(tray);
    notificationService.setHandler(new NotificationHandlerImpl());
    notificationService.setOriginalMenu(contextMenu);
    logger.info("NotificationService initialized");
  } else {
    logger.error(
      "Failed to initialize NotificationService: tray or context menu not available"
    );
  }

  // Загружаем звуковой файл если нужно
  const soundPath = path.join(
    __dirname,
    "..",
    ASSETS_PATHS.SOUNDS.NOTIFICATION
  );
  soundService.loadSound(soundPath).catch((error) => {
    logger.warn("Failed to load notification sound:", error);
  });
}

// Защита от запуска нескольких инстансов
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.info("Another instance is already running, quitting...");
  app.quit();
} else {
  // Обработчик попытки запуска второго инстанса
  app.on("second-instance", (_event, commandLine, workingDirectory) => {
    logger.info("Second instance attempted to start", {
      commandLine,
      workingDirectory,
    });

    // Показываем окно "О программе" если нет открытых окон
    const allWindows = BrowserWindow.getAllWindows();
    if (allWindows.length === 0) {
      createAboutWindow();
    } else {
      // Фокусируемся на существующих окнах
      allWindows.forEach((window) => {
        if (window.isMinimized()) {
          window.restore();
        }
        window.show();
        window.focus();
      });
    }
  });
}

// Когда приложение готово
app.whenReady().then(async () => {
  try {
    // Инициализируем сервис настроек
    await settingsService.initialize();

    // Инициализируем сервис статистики
    await statsService.initialize();

    // Настраиваем IPC обработчики
    setupMainIPC();
    setupSettingsIPC();
    setupStatsIPC();

    // Устанавливаем иконку приложения и скрываем из дока на macOS
    if (process.platform === "darwin" && app.dock) {
      const iconPath = path.join(__dirname, "..", "assets/icons/pomodoro.icns");
      if (fs.existsSync(iconPath)) {
        const icon = nativeImage.createFromPath(iconPath);
        app.dock.setIcon(icon);
        logger.info("Custom app icon set for dock", { iconPath });
      } else {
        logger.warn("App icon file not found", { iconPath });
      }
      app.dock.hide();
    }

    // Инициализируем все сервисы
    initializeServices();
  } catch (error) {
    logger.error("Failed to initialize application:", error);
    // Приложение может продолжить работу с настройками по умолчанию
    setupMainIPC();
    setupSettingsIPC();
    setupStatsIPC();
    initializeServices();
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

  // Очищаем NotificationService перед выходом
  if (notificationService) {
    notificationService.dismissNotification();
  }

  // Очищаем трей перед выходом
  if (trayManager) {
    trayManager.destroy();
  }
});
