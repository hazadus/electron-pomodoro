import { describe, expect, it } from 'vitest';
import {
  APP_VERSION,
  ASSETS_PATHS,
  DATA_FILES,
  DEBUG,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  DEFAULT_TIMER_DURATIONS,
  IPC_CHANNELS,
  LOGGING_CONFIG,
  NOTIFICATION_ACTIONS,
  NOTIFICATION_MESSAGES,
  THRESHOLDS,
  TIMER_EMOJIS,
  TIMER_LABELS,
  TIMER_TYPES,
  TRAY_MENU_LABELS,
  UPDATE_INTERVALS,
  VALIDATION,
  WINDOW_CONFIG
} from '../../../src/utils/constants';

describe('Constants', () => {
  describe('App Configuration', () => {
    it('should have correct app version', () => {
      expect(APP_VERSION).toBe('1.0.0');
    });

    it('should have correct data file names', () => {
      expect(DATA_FILES.SETTINGS).toBe('settings.json');
      expect(DATA_FILES.STATS).toBe('stats.json');
      expect(DATA_FILES.LOGS_DIR).toBe('logs');
    });
  });

  describe('Timer Durations', () => {
    it('should have correct default timer durations', () => {
      expect(DEFAULT_TIMER_DURATIONS.WORK).toBe(25);
      expect(DEFAULT_TIMER_DURATIONS.SHORT_BREAK).toBe(5);
      expect(DEFAULT_TIMER_DURATIONS.LONG_BREAK).toBe(15);
    });

    it('should have consistent default settings with durations', () => {
      expect(DEFAULT_SETTINGS.workDuration).toBe(DEFAULT_TIMER_DURATIONS.WORK);
      expect(DEFAULT_SETTINGS.shortBreakDuration).toBe(DEFAULT_TIMER_DURATIONS.SHORT_BREAK);
      expect(DEFAULT_SETTINGS.longBreakDuration).toBe(DEFAULT_TIMER_DURATIONS.LONG_BREAK);
      expect(DEFAULT_SETTINGS.soundEnabled).toBe(true);
      expect(DEFAULT_SETTINGS.version).toBe(APP_VERSION);
    });
  });

  describe('Timer Types', () => {
    it('should have correct timer type values', () => {
      expect(TIMER_TYPES.WORK).toBe('work');
      expect(TIMER_TYPES.SHORT_BREAK).toBe('shortBreak');
      expect(TIMER_TYPES.LONG_BREAK).toBe('longBreak');
    });

    it('should have emojis for all timer types', () => {
      expect(TIMER_EMOJIS[TIMER_TYPES.WORK]).toBe('🍅');
      expect(TIMER_EMOJIS[TIMER_TYPES.SHORT_BREAK]).toBe('☕');
      expect(TIMER_EMOJIS[TIMER_TYPES.LONG_BREAK]).toBe('🛋️');
    });

    it('should have Russian labels for all timer types', () => {
      expect(TIMER_LABELS[TIMER_TYPES.WORK]).toBe('работа');
      expect(TIMER_LABELS[TIMER_TYPES.SHORT_BREAK]).toBe('короткий перерыв');
      expect(TIMER_LABELS[TIMER_TYPES.LONG_BREAK]).toBe('длинный перерыв');
    });

    it('should have notification messages for all timer types', () => {
      expect(NOTIFICATION_MESSAGES[TIMER_TYPES.WORK]).toBe('Время работы закончилось!');
      expect(NOTIFICATION_MESSAGES[TIMER_TYPES.SHORT_BREAK]).toBe('Короткий перерыв окончен!');
      expect(NOTIFICATION_MESSAGES[TIMER_TYPES.LONG_BREAK]).toBe('Длинный перерыв окончен!');
    });
  });

  describe('Assets Paths', () => {
    it('should have correct icon paths', () => {
      expect(ASSETS_PATHS.ICONS.MAIN).toBe('assets/icons/icon.png');
      expect(ASSETS_PATHS.ICONS.WORK).toBe('assets/icons/work.png');
      expect(ASSETS_PATHS.ICONS.SHORT_BREAK).toBe('assets/icons/break.png');
      expect(ASSETS_PATHS.ICONS.LONG_BREAK).toBe('assets/icons/longbreak.png');
    });

    it('should have correct sound paths', () => {
      expect(ASSETS_PATHS.SOUNDS.NOTIFICATION).toBe('assets/sounds/notification.m4a');
    });
  });

  describe('Window Configuration', () => {
    it('should have reasonable window dimensions', () => {
      expect(WINDOW_CONFIG.SETTINGS.width).toBe(470);
      expect(WINDOW_CONFIG.SETTINGS.height).toBe(550);
      expect(WINDOW_CONFIG.SETTINGS.resizable).toBe(false);

      expect(WINDOW_CONFIG.STATS.width).toBe(450);
      expect(WINDOW_CONFIG.STATS.height).toBe(500);
      expect(WINDOW_CONFIG.STATS.resizable).toBe(false);

      expect(WINDOW_CONFIG.ABOUT.width).toBe(400);
      expect(WINDOW_CONFIG.ABOUT.height).toBe(450);
      expect(WINDOW_CONFIG.ABOUT.resizable).toBe(false);
    });
  });

  describe('Update Intervals', () => {
    it('should have correct update intervals in milliseconds', () => {
      expect(UPDATE_INTERVALS.TIMER).toBe(1000); // 1 second
      expect(UPDATE_INTERVALS.TRAY).toBe(1000);  // 1 second
    });
  });

  describe('Thresholds', () => {
    it('should have reasonable threshold values', () => {
      expect(THRESHOLDS.CRITICAL_TIME_SECONDS).toBe(60);
      expect(THRESHOLDS.MAX_DURATION_MINUTES).toBe(1440); // 24 hours
      expect(THRESHOLDS.MIN_DURATION_MINUTES).toBe(1);
    });
  });

  describe('Logging Configuration', () => {
    it('should have correct logging settings', () => {
      expect(LOGGING_CONFIG.MAX_FILE_SIZE).toBe(5 * 1024 * 1024); // 5MB
      expect(LOGGING_CONFIG.LOG_LEVELS.PRODUCTION).toBe('info');
      expect(LOGGING_CONFIG.LOG_LEVELS.DEVELOPMENT).toBe('debug');
      expect(LOGGING_CONFIG.CLEANUP_DAYS).toBe(30);
    });
  });

  describe('IPC Channels', () => {
    it('should have consistent IPC channel naming', () => {
      // Settings channels
      expect(IPC_CHANNELS.SETTINGS_GET).toBe('settings:get');
      expect(IPC_CHANNELS.SETTINGS_SET).toBe('settings:set');
      expect(IPC_CHANNELS.SETTINGS_RESET).toBe('settings:reset');

      // Stats channels
      expect(IPC_CHANNELS.STATS_GET).toBe('stats:get');
      expect(IPC_CHANNELS.STATS_RESET).toBe('stats:reset');
      expect(IPC_CHANNELS.STATS_UPDATE).toBe('stats:update');

      // Timer channels
      expect(IPC_CHANNELS.TIMER_START).toBe('timer:start');
      expect(IPC_CHANNELS.TIMER_STOP).toBe('timer:stop');
      expect(IPC_CHANNELS.TIMER_STATUS).toBe('timer:status');

      // Window channels
      expect(IPC_CHANNELS.WINDOW_CLOSE).toBe('window:close');
      expect(IPC_CHANNELS.WINDOW_SHOW).toBe('window:show');
    });
  });

  describe('Tray Menu Labels', () => {
    it('should have Russian menu labels', () => {
      expect(TRAY_MENU_LABELS.START_WORK).toBe('Запустить работу (25 мин)');
      expect(TRAY_MENU_LABELS.START_SHORT_BREAK).toBe('Запустить короткий перерыв (5 мин)');
      expect(TRAY_MENU_LABELS.START_LONG_BREAK).toBe('Запустить длинный перерыв (15 мин)');
      expect(TRAY_MENU_LABELS.STOP_TIMER).toBe('Остановить таймер');
      expect(TRAY_MENU_LABELS.STATISTICS).toBe('Статистика');
      expect(TRAY_MENU_LABELS.SETTINGS).toBe('Настройки');
      expect(TRAY_MENU_LABELS.ABOUT).toBe('О программе');
      expect(TRAY_MENU_LABELS.QUIT).toBe('Выход');
    });
  });

  describe('Notification Actions', () => {
    it('should have actions for work completion', () => {
      expect(NOTIFICATION_ACTIONS.WORK_COMPLETED.SHORT_BREAK).toBe('Короткий перерыв');
      expect(NOTIFICATION_ACTIONS.WORK_COMPLETED.LONG_BREAK).toBe('Длинный перерыв');
      expect(NOTIFICATION_ACTIONS.WORK_COMPLETED.CLOSE).toBe('Закрыть');
    });

    it('should have actions for short break completion', () => {
      expect(NOTIFICATION_ACTIONS.SHORT_BREAK_COMPLETED.CONTINUE_WORK).toBe('Продолжить работу');
      expect(NOTIFICATION_ACTIONS.SHORT_BREAK_COMPLETED.LONG_BREAK).toBe('Длинный перерыв');
      expect(NOTIFICATION_ACTIONS.SHORT_BREAK_COMPLETED.CLOSE).toBe('Закрыть');
    });

    it('should have actions for long break completion', () => {
      expect(NOTIFICATION_ACTIONS.LONG_BREAK_COMPLETED.START_WORK).toBe('Начать работу');
      expect(NOTIFICATION_ACTIONS.LONG_BREAK_COMPLETED.CLOSE).toBe('Закрыть');
    });
  });

  describe('Validation Rules', () => {
    it('should have consistent validation with thresholds', () => {
      expect(VALIDATION.DURATION.MIN).toBe(THRESHOLDS.MIN_DURATION_MINUTES);
      expect(VALIDATION.DURATION.MAX).toBe(THRESHOLDS.MAX_DURATION_MINUTES);
    });

    it('should have supported versions arrays', () => {
      expect(VALIDATION.SETTINGS_VERSION_SUPPORTED).toContain(APP_VERSION);
      expect(VALIDATION.STATS_VERSION_SUPPORTED).toContain(APP_VERSION);
    });
  });

  describe('Debug Configuration', () => {
    it('should have debug settings based on NODE_ENV', () => {
      // В тестовой среде NODE_ENV обычно не 'development'
      expect(typeof DEBUG.ENABLE_DEV_TOOLS).toBe('boolean');
      expect(typeof DEBUG.CONSOLE_LOGS).toBe('boolean');
    });
  });

  describe('Default Stats', () => {
    it('should have zero values for initial stats', () => {
      expect(DEFAULT_STATS.workSessions).toBe(0);
      expect(DEFAULT_STATS.shortBreakSessions).toBe(0);
      expect(DEFAULT_STATS.longBreakSessions).toBe(0);
      expect(DEFAULT_STATS.totalWorkTime).toBe(0);
      expect(DEFAULT_STATS.totalBreakTime).toBe(0);
      expect(DEFAULT_STATS.version).toBe(APP_VERSION);
    });

    it('should have valid ISO date string for lastResetDate', () => {
      const date = new Date(DEFAULT_STATS.lastResetDate);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).not.toBeNaN();
    });
  });
});