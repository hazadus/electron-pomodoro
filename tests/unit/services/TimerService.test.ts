import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimerService } from "../../../src/services/TimerService";
import { TimerEventCallbacks, TimerType } from "../../../src/types/timer";

// Мокируем логгеры
vi.mock("../../../src/utils/logger", () => ({
  timerLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  errorLogger: {
    logError: vi.fn(),
  },
  performanceLogger: {
    startTimer: vi.fn(),
    endTimer: vi.fn(),
  },
}));

describe("TimerService", () => {
  let timerService: TimerService;
  let callbacks: TimerEventCallbacks;

  beforeEach(() => {
    // Очищаем все таймеры
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Создаем моки для callback'ов
    callbacks = {
      onTick: vi.fn(),
      onComplete: vi.fn(),
      onStart: vi.fn(),
      onStop: vi.fn(),
      onPause: vi.fn(),
      onResume: vi.fn(),
    };

    timerService = new TimerService(callbacks);
  });

  afterEach(() => {
    timerService.destroy();
    vi.useRealTimers();
  });

  describe("Constructor", () => {
    it("should create TimerService instance", () => {
      expect(timerService).toBeInstanceOf(TimerService);
    });

    it("should initialize with empty callbacks if none provided", () => {
      const service = new TimerService();
      expect(service).toBeInstanceOf(TimerService);
      service.destroy();
    });

    it("should store provided callbacks", () => {
      expect(timerService.setCallbacks).toBeDefined();
    });
  });

  describe("startTimer", () => {
    it("should start work timer with default duration", () => {
      const config = { type: "work" as TimerType, duration: 25 };

      timerService.startTimer(config);

      expect(timerService.isRunning()).toBe(true);
      expect(timerService.getCurrentType()).toBe("work");
      expect(timerService.getRemainingTime()).toBe(25 * 60); // 25 минут в секундах
      expect(callbacks.onStart).toHaveBeenCalledWith("work", 25);
    });

    it("should start short break timer", () => {
      const config = { type: "shortBreak" as TimerType, duration: 5 };

      timerService.startTimer(config);

      expect(timerService.isRunning()).toBe(true);
      expect(timerService.getCurrentType()).toBe("shortBreak");
      expect(timerService.getRemainingTime()).toBe(5 * 60);
      expect(callbacks.onStart).toHaveBeenCalledWith("shortBreak", 5);
    });

    it("should start long break timer", () => {
      const config = { type: "longBreak" as TimerType, duration: 15 };

      timerService.startTimer(config);

      expect(timerService.isRunning()).toBe(true);
      expect(timerService.getCurrentType()).toBe("longBreak");
      expect(timerService.getRemainingTime()).toBe(15 * 60);
      expect(callbacks.onStart).toHaveBeenCalledWith("longBreak", 15);
    });

    it("should stop previous timer when starting new one", () => {
      // Запускаем первый таймер
      timerService.startTimer({ type: "work", duration: 25 });
      expect(timerService.getCurrentType()).toBe("work");

      // Запускаем второй таймер
      timerService.startTimer({ type: "shortBreak", duration: 5 });
      expect(timerService.getCurrentType()).toBe("shortBreak");
      expect(timerService.getRemainingTime()).toBe(5 * 60);
    });

    it("should emit start event", () => {
      const eventSpy = vi.fn();
      timerService.on("start", eventSpy);

      timerService.startTimer({ type: "work", duration: 25 });

      expect(eventSpy).toHaveBeenCalledWith("work", 25);
    });

    it("should validate timer config", () => {
      expect(() => {
        timerService.startTimer(null as any);
      }).toThrow("Timer config is required");

      expect(() => {
        timerService.startTimer({ type: null as any, duration: 25 });
      }).toThrow("Timer type is required");

      expect(() => {
        timerService.startTimer({ type: "invalid" as any, duration: 25 });
      }).toThrow("Invalid timer type: invalid");

      expect(() => {
        timerService.startTimer({ type: "work", duration: 0 });
      }).toThrow("Timer duration must be a positive number");

      expect(() => {
        timerService.startTimer({ type: "work", duration: -5 });
      }).toThrow("Timer duration must be a positive number");

      expect(() => {
        timerService.startTimer({ type: "work", duration: 2000 });
      }).toThrow(
        "Timer duration must be between 1 and 1440 minutes"
      );
    });
  });

  describe("stopTimer", () => {
    it("should stop running timer", () => {
      timerService.startTimer({ type: "work", duration: 25 });
      expect(timerService.isRunning()).toBe(true);

      timerService.stopTimer();

      expect(timerService.isRunning()).toBe(false);
      expect(timerService.getCurrentTimer()).toBeNull();
      expect(callbacks.onStop).toHaveBeenCalledWith("work", 25 * 60);
    });

    it("should emit stop event", () => {
      const eventSpy = vi.fn();
      timerService.on("stop", eventSpy);

      timerService.startTimer({ type: "work", duration: 25 });
      timerService.stopTimer();

      expect(eventSpy).toHaveBeenCalledWith("work", 25 * 60);
    });

    it("should do nothing if no timer is running", () => {
      timerService.stopTimer(); // Не должно вызывать ошибку
      expect(callbacks.onStop).not.toHaveBeenCalled();
    });
  });

  describe("pauseTimer", () => {
    it("should pause running timer", () => {
      timerService.startTimer({ type: "work", duration: 25 });
      expect(timerService.isRunning()).toBe(true);

      timerService.pauseTimer();

      expect(timerService.isPaused()).toBe(true);
      expect(timerService.isRunning()).toBe(false);
      expect(callbacks.onPause).toHaveBeenCalledWith("work", 25 * 60);
    });

    it("should emit pause event", () => {
      const eventSpy = vi.fn();
      timerService.on("pause", eventSpy);

      timerService.startTimer({ type: "work", duration: 25 });
      timerService.pauseTimer();

      expect(eventSpy).toHaveBeenCalledWith("work", 25 * 60);
    });

    it("should do nothing if timer is not running", () => {
      timerService.pauseTimer(); // Не должно вызывать ошибку
      expect(callbacks.onPause).not.toHaveBeenCalled();
    });
  });

  describe("resumeTimer", () => {
    it("should resume paused timer", () => {
      timerService.startTimer({ type: "work", duration: 25 });
      timerService.pauseTimer();
      expect(timerService.isPaused()).toBe(true);

      timerService.resumeTimer();

      expect(timerService.isRunning()).toBe(true);
      expect(timerService.isPaused()).toBe(false);
      expect(callbacks.onResume).toHaveBeenCalledWith("work", 25 * 60);
    });

    it("should emit resume event", () => {
      const eventSpy = vi.fn();
      timerService.on("resume", eventSpy);

      timerService.startTimer({ type: "work", duration: 25 });
      timerService.pauseTimer();
      timerService.resumeTimer();

      expect(eventSpy).toHaveBeenCalledWith("work", 25 * 60);
    });

    it("should do nothing if timer is not paused", () => {
      timerService.resumeTimer(); // Не должно вызывать ошибку
      expect(callbacks.onResume).not.toHaveBeenCalled();
    });
  });

  describe("Timer countdown", () => {
    it("should countdown every second", () => {
      timerService.startTimer({ type: "work", duration: 1 }); // 1 минута = 60 секунд

      expect(timerService.getRemainingTime()).toBe(60);

      // Продвигаем время на 1 секунду
      vi.advanceTimersByTime(1000);
      expect(callbacks.onTick).toHaveBeenCalledWith(59);
      expect(timerService.getRemainingTime()).toBe(59);

      // Продвигаем время еще на 5 секунд
      vi.advanceTimersByTime(5000);
      expect(timerService.getRemainingTime()).toBe(54);
    });

    it("should emit tick events", () => {
      const eventSpy = vi.fn();
      timerService.on("tick", eventSpy);

      timerService.startTimer({ type: "work", duration: 1 });
      vi.advanceTimersByTime(1000);

      expect(eventSpy).toHaveBeenCalledWith(59);
    });

    it("should complete timer when countdown reaches zero", () => {
      timerService.startTimer({ type: "work", duration: 1 });

      // Продвигаем время на 60 секунд (полная минута)
      vi.advanceTimersByTime(60000);

      expect(timerService.getRemainingTime()).toBe(0);
      expect(timerService.getCurrentTimer()).toBeNull();
      expect(callbacks.onComplete).toHaveBeenCalledWith("work", expect.any(Number));
    });

    it("should emit complete event", () => {
      const eventSpy = vi.fn();
      timerService.on("complete", eventSpy);

      timerService.startTimer({ type: "work", duration: 1 });
      vi.advanceTimersByTime(60000);

      expect(eventSpy).toHaveBeenCalledWith("work", expect.any(Number));
    });

    it("should not countdown when paused", () => {
      timerService.startTimer({ type: "work", duration: 1 });
      timerService.pauseTimer();

      const remainingBeforePause = timerService.getRemainingTime();
      vi.advanceTimersByTime(5000);

      expect(timerService.getRemainingTime()).toBe(remainingBeforePause);
      expect(callbacks.onTick).not.toHaveBeenCalledTimes(5);
    });
  });

  describe("State management", () => {
    it("should return correct current timer state", () => {
      expect(timerService.getCurrentTimer()).toBeNull();
      expect(timerService.getState()).toBe("idle");

      timerService.startTimer({ type: "work", duration: 25 });
      const currentTimer = timerService.getCurrentTimer();

      expect(currentTimer).not.toBeNull();
      expect(currentTimer?.type).toBe("work");
      expect(currentTimer?.duration).toBe(25);
      expect(currentTimer?.state).toBe("running");
      expect(timerService.getState()).toBe("running");
    });

    it("should return correct timer progress", () => {
      timerService.startTimer({ type: "work", duration: 2 }); // 2 минуты = 120 секунд

      expect(timerService.getProgress()).toBe(0);

      // Продвигаем время на 60 секунд (50%)
      vi.advanceTimersByTime(60000);
      expect(timerService.getProgress()).toBe(50);

      // Продвигаем время еще на 30 секунд (75%)
      vi.advanceTimersByTime(30000);
      expect(timerService.getProgress()).toBe(75);
    });

    it("should return correct elapsed time", () => {
      timerService.startTimer({ type: "work", duration: 2 });

      expect(timerService.getElapsedTime()).toBe(0);

      vi.advanceTimersByTime(30000); // 30 секунд
      expect(timerService.getElapsedTime()).toBe(30);

      vi.advanceTimersByTime(30000); // еще 30 секунд
      expect(timerService.getElapsedTime()).toBe(60);
    });
  });

  describe("Static methods", () => {
    it("should create default config", () => {
      const workConfig = TimerService.createDefaultConfig("work");
      expect(workConfig).toEqual({ type: "work", duration: 25 });

      const shortBreakConfig = TimerService.createDefaultConfig("shortBreak");
      expect(shortBreakConfig).toEqual({ type: "shortBreak", duration: 5 });

      const longBreakConfig = TimerService.createDefaultConfig("longBreak");
      expect(longBreakConfig).toEqual({ type: "longBreak", duration: 15 });
    });

    it("should format time correctly", () => {
      expect(TimerService.formatTime(0)).toBe("00:00");
      expect(TimerService.formatTime(60)).toBe("01:00");
      expect(TimerService.formatTime(125)).toBe("02:05");
      expect(TimerService.formatTime(3661)).toBe("61:01");
    });
  });

  describe("Callback management", () => {
    it("should allow setting new callbacks", () => {
      const newCallbacks = {
        onTick: vi.fn(),
        onStart: vi.fn(),
      };

      timerService.setCallbacks(newCallbacks);
      timerService.startTimer({ type: "work", duration: 1 });

      expect(newCallbacks.onStart).toHaveBeenCalledWith("work", 1);

      vi.advanceTimersByTime(1000);
      expect(newCallbacks.onTick).toHaveBeenCalledWith(59);
    });

    it("should merge callbacks with existing ones", () => {
      const newCallbacks = {
        onTick: vi.fn(),
      };

      timerService.setCallbacks(newCallbacks);
      timerService.startTimer({ type: "work", duration: 1 });

      // Старый callback должен все еще работать
      expect(callbacks.onStart).toHaveBeenCalledWith("work", 1);

      vi.advanceTimersByTime(1000);
      // Новый callback должен заменить старый для onTick
      expect(newCallbacks.onTick).toHaveBeenCalledWith(59);
      expect(callbacks.onTick).not.toHaveBeenCalled();
    });
  });

  describe("Resource cleanup", () => {
    it("should clear timer interval on stop", () => {
      timerService.startTimer({ type: "work", duration: 1 });
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      timerService.stopTimer();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("should clear timer interval on pause", () => {
      timerService.startTimer({ type: "work", duration: 1 });
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      timerService.pauseTimer();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("should clean up resources on destroy", () => {
      timerService.startTimer({ type: "work", duration: 1 });
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      timerService.destroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(timerService.getCurrentTimer()).toBeNull();
      expect(timerService.isRunning()).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle multiple start calls correctly", () => {
      timerService.startTimer({ type: "work", duration: 25 });
      const firstType = timerService.getCurrentType();

      timerService.startTimer({ type: "shortBreak", duration: 5 });
      const secondType = timerService.getCurrentType();

      expect(firstType).toBe("work");
      expect(secondType).toBe("shortBreak");
      expect(callbacks.onStart).toHaveBeenCalledTimes(2);
    });

    it("should handle stop after complete", () => {
      timerService.startTimer({ type: "work", duration: 1 });

      // Дожидаемся завершения таймера
      vi.advanceTimersByTime(60000);
      expect(callbacks.onComplete).toHaveBeenCalled();

      // Попытка остановить уже завершенный таймер
      timerService.stopTimer(); // Не должно вызывать ошибку
      expect(timerService.getCurrentTimer()).toBeNull();
    });

    it("should handle rapid pause/resume cycles", () => {
      timerService.startTimer({ type: "work", duration: 2 });

      timerService.pauseTimer();
      expect(timerService.isPaused()).toBe(true);

      timerService.resumeTimer();
      expect(timerService.isRunning()).toBe(true);

      timerService.pauseTimer();
      expect(timerService.isPaused()).toBe(true);

      expect(callbacks.onPause).toHaveBeenCalledTimes(2);
      expect(callbacks.onResume).toHaveBeenCalledTimes(1);
    });

    it("should handle invalid timer states gracefully", () => {
      // Попытки управления таймером когда он не запущен
      timerService.stopTimer();
      timerService.pauseTimer();
      timerService.resumeTimer();

      // Не должно вызывать ошибок
      expect(timerService.getCurrentTimer()).toBeNull();
      expect(timerService.isRunning()).toBe(false);
      expect(timerService.isPaused()).toBe(false);
    });

    it("should maintain accuracy over long periods", () => {
      timerService.startTimer({ type: "work", duration: 5 }); // 5 минут = 300 секунд

      // Продвигаем время большими шагами
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(30000); // 30 секунд
      }

      expect(timerService.getRemainingTime()).toBe(0);
      expect(callbacks.onComplete).toHaveBeenCalledWith("work", expect.any(Number));
    });

    it("should handle system sleep/resume simulation", () => {
      timerService.startTimer({ type: "work", duration: 2 });

      // Симулируем "засыпание" системы - пауза
      timerService.pauseTimer();
      const remainingBeforeSleep = timerService.getRemainingTime();

      // Симулируем большой пропуск времени (как будто система спала)
      vi.advanceTimersByTime(300000); // 5 минут

      // "Пробуждение" - возобновление
      timerService.resumeTimer();

      // Время должно остаться тем же, что было при паузе
      expect(timerService.getRemainingTime()).toBe(remainingBeforeSleep);
    });
  });
});