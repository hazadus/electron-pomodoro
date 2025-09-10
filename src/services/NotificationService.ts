import { Menu, MenuItem, Notification, Tray } from "electron";
import * as fs from "fs";
import * as path from "path";
import {
  NOTIFICATION_ACTIONS,
  NotificationActionType,
} from "../types/notification";
import {
  TIMER_COMPLETION_MESSAGES,
  TIMER_EMOJIS,
  TimerType,
} from "../types/timer";
import { ASSETS_PATHS } from "../utils/constants";
import { createLogger } from "../utils/logger";

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
  private currentNotification?: Notification;

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

      // Показываем системное уведомление
      await this.showSystemNotification(emoji, message, timerType);

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
   * Показывает системное уведомление для всех платформ
   */
  private async showSystemNotification(
    emoji: string,
    message: string,
    timerType: TimerType
  ): Promise<void> {
    try {
      if (process.platform === "win32") {
        // Windows - используем balloon уведомления трея
        this.tray.displayBalloon({
          title: `${emoji} Pomodoro Timer`,
          content: message,
          icon: undefined, // Используется иконка трея
          iconType: "info",
          respectQuietTime: false,
        });
      } else {
        // macOS и Linux - используем системные уведомления
        if (Notification.isSupported()) {
          const actions = this.getActionsForTimerType(timerType);
          this.logger.info("Creating system notification with actions", {
            timerType,
            actionsCount: actions.length,
            actions: actions.map((a) => ({ type: a.type, text: a.text })),
          });

          // Путь к иконке приложения (относительно dist/)
          const iconPath = path.join(
            __dirname,
            "..",
            ASSETS_PATHS.IMAGES.POMODORO
          );
          const iconExists = fs.existsSync(iconPath);
          this.logger.info("Notification icon path", { iconPath, iconExists });

          // Закрываем предыдущее уведомление если есть
          if (this.currentNotification) {
            this.logger.info(
              "Closing previous notification before showing new one"
            );
            this.currentNotification.close();
          }

          const notification = new Notification({
            title: `${emoji} Pomodoro Timer`,
            body: message,
            icon: iconPath,
            silent: false,
            urgency: "normal",
            actions: actions.map((action) => ({
              type: "button",
              text: action.text,
            })),
          });

          // Сохраняем ссылку на текущее уведомление
          this.currentNotification = notification;

          // Обработка кликов по уведомлению
          notification.on("click", () => {
            this.logger.info("System notification clicked");
            // Показываем меню трея при клике на уведомление
            if (this.tray) {
              this.tray.popUpContextMenu();
            }
          });

          // Обработка кликов по кнопкам действий
          notification.on("action", (_event, index) => {
            this.logger.info("System notification action event received", {
              index,
              indexType: typeof index,
              actionsLength: actions.length,
              actions: actions.map((a) => a.type),
            });

            if (
              typeof index === "number" &&
              index >= 0 &&
              index < actions.length
            ) {
              // eslint-disable-next-line security/detect-object-injection
              const action = actions[index];
              this.logger.info("System notification action clicked", {
                action: action.type,
                index,
              });
              // Очищаем ссылку на текущее уведомление
              if (this.currentNotification === notification) {
                this.currentNotification = undefined;
              }
              this.handleNotificationAction(action.type);
            } else {
              this.logger.warn("Invalid action index received", {
                index,
                indexType: typeof index,
                actionsLength: actions.length,
              });
            }
          });

          // Обработка ошибок уведомления
          notification.on("failed", (error) => {
            this.logger.error("System notification failed", {
              error: error instanceof Error ? error.message : "Unknown error",
            });
            // Очищаем ссылку на текущее уведомление
            if (this.currentNotification === notification) {
              this.currentNotification = undefined;
            }
            // Восстанавливаем меню при ошибке
            this.restoreOriginalMenu();
          });

          // Обработка закрытия уведомления
          notification.on("close", () => {
            this.logger.info("System notification closed by user", {
              timerType,
              platform: process.platform,
            });
            // Очищаем ссылку на текущее уведомление
            if (this.currentNotification === notification) {
              this.currentNotification = undefined;
            }
            // Восстанавливаем оригинальное меню при закрытии уведомления
            this.restoreOriginalMenu();
          });

          // Обработка ответа на уведомление (если поддерживается)
          notification.on("reply", (_event, reply) => {
            this.logger.debug("System notification reply received", { reply });
            // Восстанавливаем меню после ответа
            this.restoreOriginalMenu();
          });

          // Показываем уведомление
          notification.show();

          this.logger.info("System notification shown", {
            platform: process.platform,
            hasActions: actions.length > 0,
          });
        } else {
          this.logger.warn(
            "System notifications not supported on this platform",
            {
              platform: process.platform,
            }
          );

          // Fallback - мигаем иконкой трея
          this.flashTrayIcon();
        }
      }
    } catch (error) {
      this.logger.error("Failed to show system notification", {
        error: error instanceof Error ? error.message : String(error),
        platform: process.platform,
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
    this.logger.info("Processing notification action", {
      action,
      hasHandler: !!this.handler,
      hasOriginalMenu: !!this.originalMenu,
    });

    // Восстанавливаем оригинальное меню
    this.restoreOriginalMenu();

    // Вызываем обработчик действия
    if (this.handler) {
      try {
        this.logger.debug("Calling notification handler", { action });
        this.handler.onNotificationAction(action);
        this.logger.debug("Notification handler completed successfully", {
          action,
        });
      } catch (error) {
        this.logger.error("Error in notification action handler", {
          action,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
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
   * Проверяет доступность системных уведомлений
   */
  public isNotificationSupported(): boolean {
    if (process.platform === "win32") {
      return true; // Balloon уведомления всегда доступны в Windows
    }
    return Notification.isSupported();
  }

  /**
   * Проверяет доступность balloon уведомлений (Windows) - устаревший метод
   * @deprecated Используйте isNotificationSupported()
   */
  public isBalloonSupported(): boolean {
    return process.platform === "win32";
  }

  /**
   * Мигает иконкой трея как fallback уведомление
   */
  private flashTrayIcon(): void {
    try {
      if (!this.tray) return;

      let flashCount = 0;
      const maxFlashes = 6; // 3 полных цикла мигания
      const flashInterval = 300;

      // Сохраняем текущее состояние трея для восстановления

      const flashTimer = setInterval(() => {
        if (flashCount >= maxFlashes) {
          clearInterval(flashTimer);
          this.logger.debug("Tray icon flash completed");
          return;
        }

        // Альтернируем между обычной иконкой и временным скрытием/показом tooltip
        if (flashCount % 2 === 0) {
          this.tray.setToolTip(
            "🍅 Время вышло! Кликните правой кнопкой для действий"
          );
        } else {
          this.tray.setToolTip("Pomodoro Timer");
        }

        flashCount++;
      }, flashInterval);

      this.logger.info("Tray icon flashing as notification fallback");
    } catch (error) {
      this.logger.error("Failed to flash tray icon", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Принудительно скрывает уведомление и восстанавливает меню
   */
  public dismissNotification(): void {
    this.logger.info("Dismissing notification");
    // Закрываем текущее уведомление если есть
    if (this.currentNotification) {
      this.logger.info("Force closing current notification");
      this.currentNotification.close();
      this.currentNotification = undefined;
    }
    this.restoreOriginalMenu();
  }
}
