import { Menu, MenuItemConstructorOptions, nativeImage, Tray } from "electron";
import * as path from "path";
import { Timer, TimerType } from "../types/timer";
import {
  ASSETS_PATHS,
  DEFAULT_TIMER_DURATIONS,
  TRAY_MENU_LABELS,
  UPDATE_INTERVALS,
} from "../utils/constants";
import { trayLogger } from "../utils/logger";
import { TimeFormatter } from "../utils/timeFormatter";

export interface TrayManagerCallbacks {
  onStartTimer?: (type: TimerType) => void;
  onStopTimer?: () => void;
  onShowSettings?: () => void;
  onShowStats?: () => void;
  onShowAbout?: () => void;
  onQuit?: () => void;
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
      // Путь к иконке относительно корня проекта
      const iconPath = path.join(process.cwd(), ASSETS_PATHS.ICONS.MAIN);
      const icon = nativeImage.createFromPath(iconPath);

      if (icon.isEmpty()) {
        trayLogger.warn("Tray icon not found, using empty image", { iconPath });
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

  updateTimer(timer: Timer | null): void {
    this.currentTimer = timer;
    this.buildContextMenu();
    this.updateTrayDisplay();
  }

  private updateTrayDisplay(): void {
    if (!this.tray) return;

    if (this.currentTimer && this.currentTimer.state === "running") {
      const title = TimeFormatter.formatTrayTitle(
        this.currentTimer.remainingTime,
        this.currentTimer.type
      );
      this.updateTrayTitle(title);

      if (!this.updateInterval) {
        this.startUpdateInterval();
      }
    } else {
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
          label: `Запустить работу (${DEFAULT_TIMER_DURATIONS.WORK} мин)`,
          click: () => this.callbacks.onStartTimer?.("work"),
        },
        {
          label: `Запустить короткий перерыв (${DEFAULT_TIMER_DURATIONS.SHORT_BREAK} мин)`,
          click: () => this.callbacks.onStartTimer?.("shortBreak"),
        },
        {
          label: `Запустить длинный перерыв (${DEFAULT_TIMER_DURATIONS.LONG_BREAK} мин)`,
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

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray.setContextMenu(contextMenu);
  }

  destroy(): void {
    this.stopUpdateInterval();
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
