import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { settingsService } from "./services/SettingsService";
import { TrayManager, TrayManagerCallbacks } from "./services/TrayManager";
import type { SettingsFormData } from "./types/settings";

let trayManager: TrayManager | null = null;
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

// Функция создания системного трея
function createTrayManager(): void {
  const callbacks: TrayManagerCallbacks = {
    onStartTimer: (type) => {
      // TODO: Интегрировать с TimerService
      console.log(`Starting timer: ${type}`);
    },
    onStopTimer: () => {
      // TODO: Интегрировать с TimerService
      console.log("Stopping timer");
    },
    onShowSettings: () => {
      createSettingsWindow();
    },
    onShowStats: () => {
      // TODO: Интегрировать с окном статистики
      console.log("Show stats");
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
      console.error("Error getting settings:", error);
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
        console.error("Error saving settings:", error);
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
      console.error("Error resetting settings:", error);
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

    // Скрываем иконку из дока на macOS
    if (process.platform === "darwin" && app.dock) {
      app.dock.hide();
    }

    createTrayManager();
  } catch (error) {
    console.error("Failed to initialize application:", error);
    // Приложение может продолжить работу с настройками по умолчанию
    setupSettingsIPC();
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
  // Очищаем трей перед выходом
  if (trayManager) {
    trayManager.destroy();
  }
});
