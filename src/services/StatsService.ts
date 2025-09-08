/**
 * Сервис управления статистикой Pomodoro Timer
 * Обеспечивает накопление, сохранение и сброс статистики сессий
 */

import {
  DEFAULT_STATS,
  SessionType,
  StatsData,
  StatsResetEvent,
  StatsUpdateEvent,
  StatsValidationResult,
} from "@/types/stats";
import { APP_VERSION, DATA_FILES } from "@/utils/constants";
import { fileManager } from "@/utils/fileManager";
import { errorLogger, performanceLogger, statsLogger } from "@/utils/logger";

export class StatsService {
  private stats: StatsData;
  private filePath: string;
  private isInitialized = false;

  constructor() {
    this.stats = { ...DEFAULT_STATS };
    this.filePath = fileManager.getUserDataFilePath(DATA_FILES.STATS);
  }

  /**
   * Инициализация сервиса с загрузкой статистики
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      statsLogger.debug("StatsService already initialized");
      return;
    }

    try {
      performanceLogger.startTimer("stats-initialization");
      await this.loadStats();
      this.isInitialized = true;

      const duration = performanceLogger.endTimer("stats-initialization");
      statsLogger.info("StatsService initialized successfully", {
        loadTime: `${duration}ms`,
        currentStats: this.getStatsSummary(),
      });
    } catch (error) {
      errorLogger.logError(
        error as Error,
        { filePath: this.filePath },
        "StatsService initialization"
      );
      throw error;
    }
  }

  /**
   * Загрузка статистики из файла
   */
  async loadStats(): Promise<void> {
    try {
      const exists = await fileManager.fileExists(this.filePath);
      if (!exists) {
        statsLogger.info("Stats file does not exist, creating default", {
          filePath: this.filePath,
        });
        await this.saveStats();
        return;
      }

      const data = await fileManager.readJsonFile(
        this.filePath,
        this.validateStatsData
      );

      if (!data) {
        statsLogger.warn("Invalid stats data, using defaults", {
          filePath: this.filePath,
        });
        this.stats = { ...DEFAULT_STATS };
        await this.saveStats();
        return;
      }

      // Проверяем версию и выполняем миграцию если нужно
      if (data.version !== APP_VERSION) {
        statsLogger.info("Migrating stats data", {
          fromVersion: data.version,
          toVersion: APP_VERSION,
        });
        data.version = APP_VERSION;
      }

      this.stats = data;
      statsLogger.info("Stats loaded successfully", {
        statsData: this.getStatsSummary(),
        lastResetDate: this.stats.lastResetDate,
      });
    } catch (error) {
      errorLogger.logError(
        error as Error,
        { filePath: this.filePath },
        "Loading stats"
      );

      // Fallback к дефолтным настройкам
      this.stats = { ...DEFAULT_STATS };
      await this.saveStats();
    }
  }

  /**
   * Увеличение счетчика сессий
   */
  incrementSession(type: SessionType): void {
    if (!this.isInitialized) {
      throw new Error("StatsService not initialized");
    }

    const previousValue = this.getSessionCount(type);

    switch (type) {
      case "work":
        this.stats.workSessions++;
        break;
      case "shortBreak":
        this.stats.shortBreakSessions++;
        break;
      case "longBreak":
        this.stats.longBreakSessions++;
        break;
      default:
        throw new Error(`Unknown session type: ${type}`);
    }

    statsLogger.info(`Session incremented: ${type}`, {
      previousValue,
      newValue: this.getSessionCount(type),
      totalSessions: this.getTotalSessions(),
    });

    // Асинхронно сохраняем изменения
    this.saveStats().catch((error) => {
      errorLogger.logError(error as Error, { type }, "Saving after increment");
    });

    // Эмитируем событие обновления
    this.emitStatsUpdate(type, 0);
  }

  /**
   * Добавление времени к общему счетчику
   */
  addTime(type: "work" | "break", minutes: number): void {
    if (!this.isInitialized) {
      throw new Error("StatsService not initialized");
    }

    if (minutes <= 0) {
      statsLogger.warn("Invalid time value", { type, minutes });
      return;
    }

    const previousValue =
      type === "work" ? this.stats.totalWorkTime : this.stats.totalBreakTime;

    if (type === "work") {
      this.stats.totalWorkTime += minutes;
    } else {
      this.stats.totalBreakTime += minutes;
    }

    const newValue =
      type === "work" ? this.stats.totalWorkTime : this.stats.totalBreakTime;

    statsLogger.info(`Time added: ${type}`, {
      addedMinutes: minutes,
      previousTotal: previousValue,
      newTotal: newValue,
    });

    // Асинхронно сохраняем изменения
    this.saveStats().catch((error) => {
      errorLogger.logError(
        error as Error,
        { type, minutes },
        "Saving after time add"
      );
    });

    // Эмитируем событие обновления
    this.emitStatsUpdate(
      type === "work" ? "work" : "shortBreak", // Используем shortBreak как представитель break
      minutes
    );
  }

  /**
   * Получение текущей статистики (readonly)
   */
  getStats(): Readonly<StatsData> {
    return { ...this.stats };
  }

  /**
   * Сброс всей статистики
   */
  async resetStats(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("StatsService not initialized");
    }

    const previousStats = { ...this.stats };
    const resetDate = new Date().toISOString();

    try {
      performanceLogger.startTimer("stats-reset");

      // Создаем резервную копию перед сбросом
      const backupPath = await fileManager.backupFile(this.filePath);
      statsLogger.info("Created backup before reset", { backupPath });

      // Сбрасываем все счетчики
      this.stats = {
        workSessions: 0,
        shortBreakSessions: 0,
        longBreakSessions: 0,
        totalWorkTime: 0,
        totalBreakTime: 0,
        lastResetDate: resetDate,
        version: APP_VERSION,
      };

      // Немедленно сохраняем изменения
      await this.saveStats();

      const duration = performanceLogger.endTimer("stats-reset");

      statsLogger.info("Stats reset successfully", {
        resetDate,
        previousStats: this.getStatsSummaryFromData(previousStats),
        resetDuration: `${duration}ms`,
      });

      // Эмитируем событие сброса
      this.emitStatsReset(previousStats, resetDate);
    } catch (error) {
      errorLogger.logError(
        error as Error,
        {
          previousStats: this.getStatsSummaryFromData(previousStats),
          resetDate,
        },
        "Resetting stats"
      );

      // Восстанавливаем предыдущие данные при ошибке
      this.stats = previousStats;
      throw error;
    }
  }

  /**
   * Валидация структуры данных статистики
   */
  validateStatsData(data: unknown): data is StatsData {
    if (!data || typeof data !== "object") {
      return false;
    }

    const stats = data as Record<string, unknown>;

    const requiredFields = [
      "workSessions",
      "shortBreakSessions",
      "longBreakSessions",
      "totalWorkTime",
      "totalBreakTime",
      "lastResetDate",
      "version",
    ];

    // Проверяем наличие всех обязательных полей
    for (const field of requiredFields) {
      if (!(field in stats)) {
        statsLogger.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    // Проверяем типы данных
    const numericFields = [
      "workSessions",
      "shortBreakSessions",
      "longBreakSessions",
      "totalWorkTime",
      "totalBreakTime",
    ];

    for (const field of numericFields) {
      // eslint-disable-next-line security/detect-object-injection
      const value = stats[field];
      if (typeof value !== "number" || value < 0) {
        statsLogger.warn(`Invalid numeric field: ${field}`, {
          value: value,
          type: typeof value,
        });
        return false;
      }
    }

    // Проверяем строковые поля
    if (typeof stats.lastResetDate !== "string") {
      statsLogger.warn("Invalid lastResetDate field", {
        value: stats.lastResetDate,
        type: typeof stats.lastResetDate,
      });
      return false;
    }

    if (typeof stats.version !== "string") {
      statsLogger.warn("Invalid version field", {
        value: stats.version,
        type: typeof stats.version,
      });
      return false;
    }

    // Проверяем валидность даты
    try {
      const date = new Date(stats.lastResetDate as string);
      if (isNaN(date.getTime())) {
        statsLogger.warn("Invalid date format in lastResetDate", {
          value: stats.lastResetDate,
        });
        return false;
      }
    } catch {
      statsLogger.warn("Invalid date format in lastResetDate", {
        value: stats.lastResetDate,
      });
      return false;
    }

    return true;
  }

  /**
   * Детальная валидация с отчетом об ошибках
   */
  validateStatsDetailed(data: unknown): StatsValidationResult {
    const result: StatsValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!data || typeof data !== "object") {
      result.isValid = false;
      result.errors.push("Data is not an object");
      return result;
    }

    const stats = data as Record<string, unknown>;

    // Проверка версии
    if (stats.version !== APP_VERSION) {
      result.warnings.push(
        `Version mismatch: ${stats.version} vs ${APP_VERSION}`
      );
    }

    // Проверка разумности значений
    const numericFields = [
      "workSessions",
      "shortBreakSessions",
      "longBreakSessions",
      "totalWorkTime",
      "totalBreakTime",
    ];

    for (const field of numericFields) {
      // eslint-disable-next-line security/detect-object-injection
      const value = stats[field];
      if (typeof value === "number" && value > 100000) {
        // Разумный максимум
        result.warnings.push(`Unusually high value for ${field}: ${value}`);
      }
    }

    // Проверка согласованности данных
    const totalSessions =
      (stats.workSessions as number) +
      (stats.shortBreakSessions as number) +
      (stats.longBreakSessions as number);

    if (
      totalSessions === 0 &&
      ((stats.totalWorkTime as number) > 0 ||
        (stats.totalBreakTime as number) > 0)
    ) {
      result.warnings.push("Time recorded but no sessions found");
    }

    return result;
  }

  /**
   * Приватное сохранение статистики в файл
   */
  private async saveStats(): Promise<void> {
    try {
      await fileManager.writeJsonFile(this.filePath, this.stats);
      statsLogger.debug("Stats saved successfully", {
        filePath: this.filePath,
        stats: this.getStatsSummary(),
      });
    } catch (error) {
      errorLogger.logError(
        error as Error,
        {
          filePath: this.filePath,
          stats: this.stats,
        },
        "Saving stats"
      );
      throw error;
    }
  }

  /**
   * Получение краткой сводки статистики для логирования
   */
  private getStatsSummary() {
    return this.getStatsSummaryFromData(this.stats);
  }

  /**
   * Получение краткой сводки из данных
   */
  private getStatsSummaryFromData(data: StatsData) {
    return {
      totalSessions:
        data.workSessions + data.shortBreakSessions + data.longBreakSessions,
      workSessions: data.workSessions,
      breakSessions: data.shortBreakSessions + data.longBreakSessions,
      totalTime: data.totalWorkTime + data.totalBreakTime,
      lastReset: data.lastResetDate,
    };
  }

  /**
   * Получение количества сессий по типу
   */
  private getSessionCount(type: SessionType): number {
    switch (type) {
      case "work":
        return this.stats.workSessions;
      case "shortBreak":
        return this.stats.shortBreakSessions;
      case "longBreak":
        return this.stats.longBreakSessions;
      default:
        return 0;
    }
  }

  /**
   * Получение общего количества сессий
   */
  private getTotalSessions(): number {
    return (
      this.stats.workSessions +
      this.stats.shortBreakSessions +
      this.stats.longBreakSessions
    );
  }

  /**
   * Эмиссия события обновления статистики
   */
  private emitStatsUpdate(type: SessionType, duration: number): void {
    const event: StatsUpdateEvent = {
      type,
      duration,
      stats: { ...this.stats },
    };

    // В реальном приложении здесь был бы EventEmitter
    statsLogger.debug("Stats update event", event);
  }

  /**
   * Эмиссия события сброса статистики
   */
  private emitStatsReset(previousStats: StatsData, resetDate: string): void {
    const event: StatsResetEvent = {
      previousStats,
      resetDate,
      reason: "user_initiated",
    };

    // В реальном приложении здесь был бы EventEmitter
    statsLogger.info("Stats reset event", event);
  }

  /**
   * Получение информации о производительности
   */
  getPerformanceInfo() {
    return {
      isInitialized: this.isInitialized,
      filePath: this.filePath,
      memoryFootprint: JSON.stringify(this.stats).length,
      lastAccess: new Date().toISOString(),
    };
  }
}

// Экспорт синглтона для использования в приложении
export const statsService = new StatsService();
