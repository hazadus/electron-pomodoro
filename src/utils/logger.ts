/**
 * Настройка системы логирования с использованием electron-log
 */

import { app } from "electron";
import log from "electron-log";
import path from "path";
import { DATA_FILES, LOGGING_CONFIG } from "./constants";

// Определяем режим разработки
const isDev = process.env.NODE_ENV === "development";

/**
 * Инициализация основного логгера
 */
function initializeMainLogger() {
  // Настройка файлового транспорта
  log.transports.file.level = isDev
    ? LOGGING_CONFIG.LOG_LEVELS.DEVELOPMENT
    : LOGGING_CONFIG.LOG_LEVELS.PRODUCTION;

  log.transports.file.maxSize = LOGGING_CONFIG.MAX_FILE_SIZE;
  log.transports.file.format =
    "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}";
  log.transports.file.fileName = "main.log";

  // Отложенная инициализация пути к файлу
  log.transports.file.resolvePathFn = () => {
    try {
      if (app.isReady()) {
        return path.join(
          app.getPath("userData"),
          DATA_FILES.LOGS_DIR,
          "main.log"
        );
      } else {
        // Используем временный путь в директории проекта, если приложение еще не готово
        return path.join(process.cwd(), "temp-logs", "main.log");
      }
    } catch (_error) {
      // Fallback на локальную директорию
      return path.join(process.cwd(), "temp-logs", "main.log");
    }
  };

  // Настройка консольного транспорта
  log.transports.console.level = isDev ? "debug" : false;
  log.transports.console.format = "{h}:{i}:{s}.{ms} › [{level}] {text}";

  return log;
}

/**
 * Создание специализированного логгера для определенной области
 */
export function createLogger(scope: string) {
  // Создаем отдельный экземпляр логгера вместо использования scope
  const logger = log.create({ logId: scope });

  // Настройка файлового транспорта для каждого логгера
  logger.transports.file.level = isDev
    ? LOGGING_CONFIG.LOG_LEVELS.DEVELOPMENT
    : LOGGING_CONFIG.LOG_LEVELS.PRODUCTION;
  logger.transports.file.maxSize = LOGGING_CONFIG.MAX_FILE_SIZE;
  logger.transports.file.format =
    "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [{scope}] {text}";
  logger.transports.file.fileName = `${scope}.log`;

  // Настройка пути к файлу логов
  logger.transports.file.resolvePathFn = () => {
    try {
      if (app.isReady()) {
        return path.join(
          app.getPath("userData"),
          DATA_FILES.LOGS_DIR,
          `${scope}.log`
        );
      } else {
        // Используем временный путь в директории проекта, если приложение еще не готово
        return path.join(process.cwd(), "temp-logs", `${scope}.log`);
      }
    } catch (_error) {
      // Fallback на локальную директорию
      return path.join(process.cwd(), "temp-logs", `${scope}.log`);
    }
  };

  // Настройка консольного транспорта
  logger.transports.console.level = isDev ? "debug" : false;
  logger.transports.console.format =
    "{h}:{i}:{s}.{ms} › [{level}] [{scope}] {text}";

  return logger;
}

/**
 * Логгер для обработки ошибок с дополнительным контекстом
 */
export class ErrorLogger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private logger: any;

  constructor(scope: string) {
    this.logger = createLogger(scope);
  }

  /**
   * Логирование ошибки с полным контекстом
   */
  logError(error: Error, context?: Record<string, unknown>, action?: string) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      action: action || "unknown",
      timestamp: new Date().toISOString(),
      ...context,
    };

    this.logger.error("Error occurred:", errorInfo);
  }

  /**
   * Логирование предупреждения
   */
  logWarning(message: string, context?: Record<string, unknown>) {
    this.logger.warn(message, context || {});
  }

  /**
   * Логирование информационного сообщения
   */
  logInfo(message: string, context?: Record<string, unknown>) {
    this.logger.info(message, context || {});
  }

  /**
   * Логирование отладочной информации (только в dev режиме)
   */
  logDebug(message: string, context?: Record<string, unknown>) {
    if (isDev) {
      this.logger.debug(message, context || {});
    }
  }
}

/**
 * Утилита для логирования производительности
 */
export class PerformanceLogger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private logger: any;
  private timers: Map<string, number> = new Map();

  constructor(scope: string = "performance") {
    this.logger = createLogger(scope);
  }

  /**
   * Начать измерение времени
   */
  startTimer(operation: string) {
    this.timers.set(operation, Date.now());
    this.logger.debug(`Started timer for: ${operation}`);
  }

  /**
   * Завершить измерение времени и залогировать результат
   */
  endTimer(operation: string, context?: Record<string, unknown>) {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      this.logger.warn(`Timer not found for operation: ${operation}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);

    this.logger.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...context,
    });

    return duration;
  }

  /**
   * Логирование использования памяти
   */
  logMemoryUsage(context?: string) {
    if (process.memoryUsage) {
      const memory = process.memoryUsage();
      this.logger.info(`Memory usage ${context ? `(${context})` : ""}`, {
        rss: `${Math.round(memory.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memory.external / 1024 / 1024)}MB`,
      });
    }
  }
}

/**
 * Утилита для очистки старых логов
 */
export async function cleanupOldLogs() {
  try {
    const { promises: fs } = await import("fs");
    const logsDir = path.join(app.getPath("userData"), DATA_FILES.LOGS_DIR);

    const files = await fs.readdir(logsDir);
    const cutoffDate = new Date(
      Date.now() - LOGGING_CONFIG.CLEANUP_DAYS * 24 * 60 * 60 * 1000
    );

    for (const file of files) {
      if (file.endsWith(".log") || file.includes(".backup.")) {
        const filePath = path.join(logsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          logger.info(`Cleaned up old log file: ${file}`);
        }
      }
    }
  } catch (error) {
    logger.error("Failed to cleanup old logs:", error);
  }
}

// Инициализация основного логгера при импорте модуля
const logger = initializeMainLogger();

// Экспорт специализированных логгеров для разных компонентов
export const mainLogger = logger;
export const timerLogger = createLogger("timer");
export const trayLogger = createLogger("tray");
export const statsLogger = createLogger("stats");
export const settingsLogger = createLogger("settings");
export const notificationLogger = createLogger("notification");
export const soundLogger = createLogger("sound");

// Экспорт экземпляров для специализированного логирования
export const errorLogger = new ErrorLogger("errors");
export const performanceLogger = new PerformanceLogger("performance");

// Логирование запуска приложения (отложенное)
if (app.isReady()) {
  logger.info("Application logger initialized", {
    version: app.getVersion(),
    platform: process.platform,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    environment: isDev ? "development" : "production",
  });
} else {
  app.whenReady().then(() => {
    logger.info("Application logger initialized", {
      version: app.getVersion(),
      platform: process.platform,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      environment: isDev ? "development" : "production",
    });
  });
}

// Планируем очистку старых логов через 5 минут после запуска
setTimeout(
  () => {
    cleanupOldLogs();
  },
  5 * 60 * 1000
);

// Экспорт основного логгера по умолчанию
export default logger;
