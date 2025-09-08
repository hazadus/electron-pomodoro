import { EventEmitter } from "events";
import {
  DEFAULT_DURATIONS,
  Timer,
  TimerConfig,
  TimerEventCallbacks,
  TimerState,
  TimerType,
} from "../types/timer";
import { THRESHOLDS, UPDATE_INTERVALS } from "../utils/constants";
import { errorLogger, performanceLogger, timerLogger } from "../utils/logger";

/**
 * Сервис управления таймерами Pomodoro
 *
 * Основные возможности:
 * - Запуск, остановка, пауза и возобновление таймера
 * - Обратный отсчет с обновлением каждую секунду
 * - События завершения, старта, остановки
 * - Логирование всех операций с таймером
 * - Валидация входных параметров
 */
export class TimerService extends EventEmitter {
  private timer: Timer | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callbacks: TimerEventCallbacks = {};

  constructor(callbacks: TimerEventCallbacks = {}) {
    super();
    this.callbacks = callbacks;
    timerLogger.info("TimerService initialized", {
      hasCallbacks: Object.keys(callbacks).length > 0,
    });
  }

  /**
   * Запуск таймера с указанной конфигурацией
   */
  startTimer(config: TimerConfig): void {
    performanceLogger.startTimer("timer-start");

    try {
      // Валидация входных параметров
      this.validateTimerConfig(config);

      // Остановить текущий таймер если он запущен
      if (this.timer && this.timer.state === "running") {
        this.stopTimer();
      }

      // Создание нового таймера
      this.timer = {
        type: config.type,
        duration: config.duration,
        remainingTime: config.duration * 60, // конвертируем минуты в секунды
        state: "running",
        startedAt: new Date(),
      };

      timerLogger.info("Timer started", {
        type: this.timer.type,
        duration: this.timer.duration,
        remainingTime: this.timer.remainingTime,
        startedAt: this.timer.startedAt?.toISOString(),
      });

      // Запуск интервала обновления
      this.startInterval();

      // Вызов callback и emit события
      this.callbacks.onStart?.(config.type, config.duration);
      this.emit("start", config.type, config.duration);

      performanceLogger.endTimer("timer-start", { timerType: config.type });
    } catch (error) {
      errorLogger.logError(error as Error, { config }, "startTimer");
      throw error;
    }
  }

  /**
   * Остановка текущего таймера
   */
  stopTimer(): void {
    try {
      if (!this.timer || this.timer.state === "idle") {
        timerLogger.warn("Attempt to stop timer when no timer is running");
        return;
      }

      const { type, remainingTime } = this.timer;

      // Очистка интервала
      this.clearInterval();

      // Обновление состояния таймера
      this.timer.state = "idle";
      const stoppedTimer = { ...this.timer };
      this.timer = null;

      timerLogger.info("Timer stopped", {
        type,
        remainingTime,
        wasRunning: stoppedTimer.state === "running",
      });

      // Вызов callback и emit события
      this.callbacks.onStop?.(type, remainingTime);
      this.emit("stop", type, remainingTime);
    } catch (error) {
      errorLogger.logError(error as Error, {}, "stopTimer");
      throw error;
    }
  }

  /**
   * Пауза текущего таймера
   */
  pauseTimer(): void {
    try {
      if (!this.timer || this.timer.state !== "running") {
        timerLogger.warn("Attempt to pause timer when timer is not running");
        return;
      }

      this.clearInterval();
      this.timer.state = "paused";
      this.timer.pausedAt = new Date();

      const { type, remainingTime } = this.timer;

      timerLogger.info("Timer paused", {
        type,
        remainingTime,
        pausedAt: this.timer.pausedAt.toISOString(),
      });

      // Вызов callback и emit события
      this.callbacks.onPause?.(type, remainingTime);
      this.emit("pause", type, remainingTime);
    } catch (error) {
      errorLogger.logError(error as Error, {}, "pauseTimer");
      throw error;
    }
  }

  /**
   * Возобновление приостановленного таймера
   */
  resumeTimer(): void {
    try {
      if (!this.timer || this.timer.state !== "paused") {
        timerLogger.warn("Attempt to resume timer when timer is not paused");
        return;
      }

      this.timer.state = "running";
      this.timer.pausedAt = undefined;
      this.startInterval();

      const { type, remainingTime } = this.timer;

      timerLogger.info("Timer resumed", {
        type,
        remainingTime,
      });

      // Вызов callback и emit события
      this.callbacks.onResume?.(type, remainingTime);
      this.emit("resume", type, remainingTime);
    } catch (error) {
      errorLogger.logError(error as Error, {}, "resumeTimer");
      throw error;
    }
  }

  /**
   * Получение текущего состояния таймера
   */
  getCurrentTimer(): Readonly<Timer> | null {
    return this.timer ? { ...this.timer } : null;
  }

  /**
   * Проверка, запущен ли таймер
   */
  isRunning(): boolean {
    return this.timer?.state === "running" || false;
  }

  /**
   * Проверка, приостановлен ли таймер
   */
  isPaused(): boolean {
    return this.timer?.state === "paused" || false;
  }

  /**
   * Получение оставшегося времени в секундах
   */
  getRemainingTime(): number {
    return this.timer?.remainingTime ?? 0;
  }

  /**
   * Получение типа текущего таймера
   */
  getCurrentType(): TimerType | null {
    return this.timer?.type ?? null;
  }

  /**
   * Получение состояния таймера
   */
  getState(): TimerState {
    return this.timer?.state ?? "idle";
  }

  /**
   * Уничтожение сервиса и очистка ресурсов
   */
  destroy(): void {
    try {
      this.clearInterval();
      this.timer = null;
      this.callbacks = {};
      this.removeAllListeners();

      timerLogger.info("TimerService destroyed");
    } catch (error) {
      errorLogger.logError(error as Error, {}, "destroy");
    }
  }

  /**
   * Запуск интервала для обратного отсчета
   */
  private startInterval(): void {
    this.clearInterval();

    this.intervalId = setInterval(() => {
      if (!this.timer || this.timer.state !== "running") {
        this.clearInterval();
        return;
      }

      this.timer.remainingTime--;

      // Проверка критического времени (последние 60 секунд)
      const isCriticalTime =
        this.timer.remainingTime <= THRESHOLDS.CRITICAL_TIME_SECONDS &&
        this.timer.remainingTime > 0;

      if (isCriticalTime) {
        timerLogger.debug("Critical time reached", {
          type: this.timer.type,
          remainingTime: this.timer.remainingTime,
        });
      }

      // Вызов callback обновления времени
      this.callbacks.onTick?.(this.timer.remainingTime);
      this.emit("tick", this.timer.remainingTime);

      // Проверка завершения таймера
      if (this.timer.remainingTime <= 0) {
        this.onTimerComplete();
      }
    }, UPDATE_INTERVALS.TIMER);
  }

  /**
   * Очистка интервала обновления
   */
  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Обработка завершения таймера
   */
  private onTimerComplete(): void {
    if (!this.timer) return;

    performanceLogger.startTimer("timer-complete");

    try {
      const { type, duration, startedAt } = this.timer;
      const actualDuration = startedAt
        ? Math.floor((Date.now() - startedAt.getTime()) / 1000 / 60)
        : duration;

      // Остановка интервала
      this.clearInterval();

      // Обновление состояния таймера
      this.timer.state = "completed";
      this.timer.completedAt = new Date();
      this.timer.remainingTime = 0;

      timerLogger.info("Timer completed", {
        type,
        duration,
        actualDuration,
        completedAt: this.timer.completedAt.toISOString(),
      });

      // Вызов callback и emit события
      this.callbacks.onComplete?.(type, actualDuration);
      this.emit("complete", type, actualDuration);

      // Сброс состояния
      this.timer = null;

      performanceLogger.endTimer("timer-complete", {
        timerType: type,
        actualDuration,
      });
    } catch (error) {
      errorLogger.logError(error as Error, {}, "onTimerComplete");
    }
  }

  /**
   * Валидация конфигурации таймера
   */
  private validateTimerConfig(config: TimerConfig): void {
    if (!config) {
      throw new Error("Timer config is required");
    }

    if (!config.type) {
      throw new Error("Timer type is required");
    }

    if (!["work", "shortBreak", "longBreak"].includes(config.type)) {
      throw new Error(`Invalid timer type: ${config.type}`);
    }

    if (typeof config.duration !== "number" || config.duration <= 0) {
      throw new Error("Timer duration must be a positive number");
    }

    if (
      config.duration < THRESHOLDS.MIN_DURATION_MINUTES ||
      config.duration > THRESHOLDS.MAX_DURATION_MINUTES
    ) {
      throw new Error(
        `Timer duration must be between ${THRESHOLDS.MIN_DURATION_MINUTES} and ${THRESHOLDS.MAX_DURATION_MINUTES} minutes`
      );
    }
  }

  /**
   * Создание конфигурации таймера с настройками по умолчанию
   */
  static createDefaultConfig(type: TimerType): TimerConfig {
    return {
      type,
      duration: DEFAULT_DURATIONS[type as keyof typeof DEFAULT_DURATIONS],
    };
  }

  /**
   * Форматирование времени в удобочитаемый формат
   */
  static formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * Получение прогресса таймера в процентах
   */
  getProgress(): number {
    if (!this.timer) return 0;

    const totalSeconds = this.timer.duration * 60;
    const elapsedSeconds = totalSeconds - this.timer.remainingTime;
    return Math.max(0, Math.min(100, (elapsedSeconds / totalSeconds) * 100));
  }

  /**
   * Получение времени, прошедшего с начала таймера
   */
  getElapsedTime(): number {
    if (!this.timer || !this.timer.startedAt) return 0;

    const totalSeconds = this.timer.duration * 60;
    return totalSeconds - this.timer.remainingTime;
  }

  /**
   * Установка новых callback'ов
   */
  setCallbacks(callbacks: TimerEventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    timerLogger.debug("Timer callbacks updated", {
      callbackCount: Object.keys(this.callbacks).length,
    });
  }
}
