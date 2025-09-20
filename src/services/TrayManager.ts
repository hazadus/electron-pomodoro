import {
  app,
  Menu,
  MenuItemConstructorOptions,
  nativeImage,
  Tray,
} from "electron";
import * as path from "path";
import { Timer, TimerType } from "../types/timer";
import {
  ASSETS_PATHS,
  TRAY_MENU_LABELS,
  UPDATE_INTERVALS,
} from "../utils/constants";
import { trayLogger } from "../utils/logger";
import { TimeFormatter } from "../utils/timeFormatter";
import { settingsService } from "./SettingsService";

export interface TrayManagerCallbacks {
  onStartTimer?: (type: TimerType) => void;
  onStopTimer?: () => void;
  onShowSettings?: () => void;
  onShowStats?: () => void;
  onShowAbout?: () => void;
  onQuit?: () => void | Promise<void>;
}

export class TrayManager {
  private tray: Tray | null = null;
  private callbacks: TrayManagerCallbacks = {};
  private currentTimer: Timer | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(callbacks: TrayManagerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  initialize(): void {
    try {
      // Путь к иконке относительно директории приложения
      const iconPath = path.join(app.getAppPath(), ASSETS_PATHS.ICONS.MAIN);
      const icon = nativeImage.createFromPath(iconPath);

      if (icon.isEmpty()) {
        trayLogger.warn("Tray icon not found, using empty image", { iconPath });
      }

      // Включаем template режим для macOS для автоматической адаптации к теме
      if (process.platform === "darwin") {
        icon.setTemplateImage(true);
        trayLogger.info("Template mode enabled for tray icon on macOS");
      }

      this.tray = new Tray(icon);
      this.tray.setToolTip("Pomodoro Timer");
      this.buildContextMenu();

      // На macOS добавляем обработчик клика для показа меню
      if (process.platform === "darwin") {
        this.tray.on("click", () => {
          this.tray?.popUpContextMenu();
        });
      }

      trayLogger.info("TrayManager initialized successfully");
    } catch (error) {
      trayLogger.error("Failed to initialize TrayManager:", error);
      throw error;
    }
  }

  /**
   * Устанавливает видимость иконки трея
   */
  private setTrayIcon(visible: boolean): void {
    if (!this.tray) return;

    if (visible) {
      // Показываем обычную иконку
      const iconPath = path.join(app.getAppPath(), ASSETS_PATHS.ICONS.MAIN);
      const icon = nativeImage.createFromPath(iconPath);

      // Включаем template режим для macOS для автоматической адаптации к теме
      if (process.platform === "darwin") {
        icon.setTemplateImage(true);
      }

      this.tray.setImage(icon);
    } else {
      // Скрываем иконку, используя пустое изображение
      const emptyIcon = nativeImage.createEmpty();
      this.tray.setImage(emptyIcon);
    }
  }

  updateTimer(timer: Timer | null): void {
    this.currentTimer = timer;
    this.buildContextMenu();
    this.updateTrayDisplay();
  }

  /**
   * Обновляет меню трея (например, при изменении настроек)
   */
  refreshMenu(): void {
    trayLogger.debug("Refreshing tray menu due to settings change");
    this.buildContextMenu();
  }

  private updateTrayDisplay(): void {
    if (!this.tray) return;

    if (this.currentTimer && this.currentTimer.state === "running") {
      // Скрываем иконку при активном таймере
      this.setTrayIcon(false);

      const title = TimeFormatter.formatTrayTitle(
        this.currentTimer.remainingTime,
        this.currentTimer.type
      );
      this.updateTrayTitle(title);

      if (!this.updateInterval) {
        this.startUpdateInterval();
      }
    } else {
      // Показываем иконку когда таймер не активен
      this.setTrayIcon(true);

      // Убираем title на macOS когда таймер не активен, показываем только tooltip
      if (process.platform === "darwin") {
        this.tray?.setTitle("");
      } else {
        this.tray?.setToolTip("Pomodoro Timer");
      }
      this.stopUpdateInterval();
    }
  }

  private startUpdateInterval(): void {
    this.updateInterval = setInterval(() => {
      if (this.currentTimer && this.currentTimer.state === "running") {
        const title = TimeFormatter.formatTrayTitle(
          this.currentTimer.remainingTime,
          this.currentTimer.type
        );
        this.updateTrayTitle(title);
      } else {
        this.stopUpdateInterval();
      }
    }, UPDATE_INTERVALS.TRAY);
  }

  private stopUpdateInterval(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private updateTrayTitle(title: string): void {
    if (this.tray) {
      if (process.platform === "darwin") {
        this.tray.setTitle(title);
      } else {
        this.tray.setToolTip(title);
      }
    }
  }

  private buildContextMenu(): void {
    if (!this.tray) return;

    // Получаем актуальные настройки
    const settings = settingsService.getSettings();

    const isTimerActive =
      this.currentTimer && this.currentTimer.state === "running";
    let menuTemplate: MenuItemConstructorOptions[] = [];

    if (isTimerActive) {
      menuTemplate = [
        {
          label: TRAY_MENU_LABELS.STOP_TIMER,
          click: () => this.callbacks.onStopTimer?.(),
        },
        { type: "separator" },
        {
          label: TRAY_MENU_LABELS.STATISTICS,
          click: () => this.callbacks.onShowStats?.(),
        },
        {
          label: TRAY_MENU_LABELS.SETTINGS,
          click: () => this.callbacks.onShowSettings?.(),
        },
        {
          label: TRAY_MENU_LABELS.ABOUT,
          click: () => this.callbacks.onShowAbout?.(),
        },
        { type: "separator" },
        {
          label: TRAY_MENU_LABELS.QUIT,
          click: () => this.callbacks.onQuit?.(),
        },
      ];
    } else {
      menuTemplate = [
        {
          label: `Запустить работу (${settings.workDuration} мин)`,
          click: () => this.callbacks.onStartTimer?.("work"),
        },
        {
          label: `Запустить короткий перерыв (${settings.shortBreakDuration} мин)`,
          click: () => this.callbacks.onStartTimer?.("shortBreak"),
        },
        {
          label: `Запустить длинный перерыв (${settings.longBreakDuration} мин)`,
          click: () => this.callbacks.onStartTimer?.("longBreak"),
        },
        { type: "separator" },
        {
          label: TRAY_MENU_LABELS.STATISTICS,
          click: () => this.callbacks.onShowStats?.(),
        },
        {
          label: TRAY_MENU_LABELS.SETTINGS,
          click: () => this.callbacks.onShowSettings?.(),
        },
        {
          label: TRAY_MENU_LABELS.ABOUT,
          click: () => this.callbacks.onShowAbout?.(),
        },
        { type: "separator" },
        {
          label: TRAY_MENU_LABELS.QUIT,
          click: () => this.callbacks.onQuit?.(),
        },
      ];
    }

    this.contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray.setContextMenu(this.contextMenu);
  }

  getTray(): Tray | null {
    return this.tray;
  }

  private contextMenu: Menu | null = null;

  getContextMenu(): Menu | null {
    return this.contextMenu;
  }

  destroy(): void {
    this.stopUpdateInterval();
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
