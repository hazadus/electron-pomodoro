import {
  NOTIFICATION_ACTIONS,
  NotificationActionType,
} from "@/types/notification";
import {
  TIMER_COMPLETION_MESSAGES,
  TIMER_EMOJIS,
  TimerType,
} from "@/types/timer";
import { createLogger } from "@/utils/logger";
import { Menu, MenuItem, Tray } from "electron";

export interface NotificationHandler {
  onNotificationAction(action: NotificationActionType): void;
}

/**
 * Сервис для отображения контекстных уведомлений через системный трей
 * Показывает интерактивные уведомления с кнопками действий
 */
export class NotificationService {
  private logger = createLogger("notification");
  private tray: Tray;
  private handler?: NotificationHandler;
  private originalMenu?: Menu;
  private notificationTimeout?: NodeJS.Timeout;

  constructor(tray: Tray) {
    this.tray = tray;
    this.logger.info("NotificationService initialized");
  }

  public setHandler(handler: NotificationHandler): void {
    this.handler = handler;
    this.logger.debug("Notification handler set");
  }

  public setOriginalMenu(menu: Menu): void {
    this.originalMenu = menu;
    this.logger.debug("Original menu set for restoration");
  }

  /**
   * Показывает интерактивное уведомление через трей с контекстными кнопками
   */
  public async showInteractiveNotification(
    timerType: TimerType
  ): Promise<void> {
    if (!this.tray) {
      this.logger.error("Tray not available for interactive notification");
      return;
    }

    try {
      // Очищаем предыдущий таймаут если есть
      if (this.notificationTimeout) {
        clearTimeout(this.notificationTimeout);
      }

      // Создаем временное меню уведомления
      const notificationMenu = this.createNotificationMenu(timerType);
      this.tray.setContextMenu(notificationMenu);

      // Обновляем тултип трея
      const emoji = this.getTimerEmoji(timerType);
      const message = this.getTimerMessage(timerType);
      this.tray.setToolTip(`${emoji} ${message}`);

      // Показываем balloon уведомление (Windows) или обычное (macOS/Linux)
      if (process.platform === "win32") {
        this.tray.displayBalloon({
          title: `${emoji} Pomodoro Timer`,
          content: message,
          icon: undefined, // Используется иконка трея
          iconType: "info",
          respectQuietTime: false,
        });
      }

      this.logger.info("Interactive notification shown via tray", {
        timerType,
      });

      // Автоматически восстанавливаем меню через 30 секунд
      this.notificationTimeout = setTimeout(() => {
        this.restoreOriginalMenu();
      }, 30000);
    } catch (error) {
      this.logger.error("Failed to show interactive notification", {
        error: error instanceof Error ? error.message : String(error),
        timerType,
      });
    }
  }

  /**
   * Создает меню с контекстными действиями для уведомления
   */
  private createNotificationMenu(timerType: TimerType): Menu {
    const actions = this.getActionsForTimerType(timerType);
    const menuItems: MenuItem[] = [];

    // Добавляем заголовок
    const emoji = this.getTimerEmoji(timerType);
    const message = this.getTimerMessage(timerType);
    menuItems.push(
      new MenuItem({
        label: `${emoji} ${message}`,
        enabled: false, // Неактивный заголовок
      })
    );

    menuItems.push(new MenuItem({ type: "separator" }));

    // Добавляем кнопки действий
    actions.forEach((action) => {
      menuItems.push(
        new MenuItem({
          label: action.text,
          click: () => {
            this.logger.info("Tray notification action clicked", {
              action: action.type,
              timerType,
            });
            this.handleNotificationAction(action.type);
          },
        })
      );
    });

    // Добавляем разделитель и кнопку восстановления меню
    menuItems.push(new MenuItem({ type: "separator" }));
    menuItems.push(
      new MenuItem({
        label: "Скрыть уведомление",
        click: () => {
          this.logger.debug("Hide notification clicked");
          this.restoreOriginalMenu();
        },
      })
    );

    return Menu.buildFromTemplate(menuItems);
  }

  /**
   * Безопасное получение эмодзи для типа таймера
   */
  private getTimerEmoji(timerType: TimerType): string {
    switch (timerType) {
      case "work":
        return TIMER_EMOJIS.work;
      case "shortBreak":
        return TIMER_EMOJIS.shortBreak;
      case "longBreak":
        return TIMER_EMOJIS.longBreak;
      default:
        return TIMER_EMOJIS.work;
    }
  }

  /**
   * Безопасное получение сообщения для типа таймера
   */
  private getTimerMessage(timerType: TimerType): string {
    switch (timerType) {
      case "work":
        return TIMER_COMPLETION_MESSAGES.work;
      case "shortBreak":
        return TIMER_COMPLETION_MESSAGES.shortBreak;
      case "longBreak":
        return TIMER_COMPLETION_MESSAGES.longBreak;
      default:
        return TIMER_COMPLETION_MESSAGES.work;
    }
  }

  /**
   * Получает доступные действия для типа таймера
   */
  public getActionsForTimerType(
    timerType: TimerType
  ): { type: NotificationActionType; text: string }[] {
    switch (timerType) {
      case "work":
        return [...NOTIFICATION_ACTIONS.afterWork];
      case "shortBreak":
        return [...NOTIFICATION_ACTIONS.afterShortBreak];
      case "longBreak":
        return [...NOTIFICATION_ACTIONS.afterLongBreak];
      default:
        this.logger.warn("Unknown timer type for notification actions", {
          timerType,
        });
        return [...NOTIFICATION_ACTIONS.afterLongBreak];
    }
  }

  /**
   * Обрабатывает действие уведомления
   */
  private handleNotificationAction(action: NotificationActionType): void {
    this.logger.info("Processing notification action", { action });

    // Восстанавливаем оригинальное меню
    this.restoreOriginalMenu();

    // Вызываем обработчик действия
    if (this.handler) {
      try {
        this.handler.onNotificationAction(action);
      } catch (error) {
        this.logger.error("Error in notification action handler", {
          action,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      this.logger.warn("No notification handler registered", { action });
    }
  }

  /**
   * Восстанавливает оригинальное меню трея
   */
  public restoreOriginalMenu(): void {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = undefined;
    }

    if (this.originalMenu && this.tray) {
      this.tray.setContextMenu(this.originalMenu);
      this.tray.setToolTip("Pomodoro Timer");
      this.logger.debug("Original tray menu restored");
    }
  }

  /**
   * Проверяет доступность balloon уведомлений (Windows)
   */
  public isBalloonSupported(): boolean {
    return process.platform === "win32";
  }

  /**
   * Принудительно скрывает уведомление и восстанавливает меню
   */
  public dismissNotification(): void {
    this.logger.info("Dismissing notification");
    this.restoreOriginalMenu();
  }
}
