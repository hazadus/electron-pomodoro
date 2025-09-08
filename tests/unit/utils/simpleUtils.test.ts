import { describe, it, expect } from 'vitest';
import { TimeFormatter } from '../../../src/utils/timeFormatter';
import * as constants from '../../../src/utils/constants';

describe('Simple Utils Tests (No Mocking)', () => {
  describe('TimeFormatter Static Methods', () => {
    it('should format timer display correctly', () => {
      expect(TimeFormatter.formatTimerDisplay(0)).toBe('00:00');
      expect(TimeFormatter.formatTimerDisplay(59)).toBe('00:59');
      expect(TimeFormatter.formatTimerDisplay(60)).toBe('01:00');
      expect(TimeFormatter.formatTimerDisplay(90)).toBe('01:30');
      expect(TimeFormatter.formatTimerDisplay(1500)).toBe('25:00');
    });

    it('should format readable duration correctly', () => {
      expect(TimeFormatter.formatDurationReadable(0)).toBe('0м');
      expect(TimeFormatter.formatDurationReadable(5)).toBe('5м');
      expect(TimeFormatter.formatDurationReadable(25)).toBe('25м');
      expect(TimeFormatter.formatDurationReadable(60)).toBe('1ч');
      expect(TimeFormatter.formatDurationReadable(90)).toBe('1ч 30м');
    });

    it('should convert minutes to seconds', () => {
      expect(TimeFormatter.minutesToSeconds(0)).toBe(0);
      expect(TimeFormatter.minutesToSeconds(1)).toBe(60);
      expect(TimeFormatter.minutesToSeconds(25)).toBe(1500);
      expect(TimeFormatter.minutesToSeconds(0.5)).toBe(30);
    });

    it('should validate durations correctly', () => {
      expect(TimeFormatter.isValidDuration(0)).toBe(false);
      expect(TimeFormatter.isValidDuration(1)).toBe(true);
      expect(TimeFormatter.isValidDuration(25)).toBe(true);
      expect(TimeFormatter.isValidDuration(1440)).toBe(true);
      expect(TimeFormatter.isValidDuration(1441)).toBe(false);
      expect(TimeFormatter.isValidDuration(1.5)).toBe(false);
    });

    it('should identify critical time', () => {
      expect(TimeFormatter.isCriticalTime(61)).toBe(false);
      expect(TimeFormatter.isCriticalTime(60)).toBe(true);
      expect(TimeFormatter.isCriticalTime(30)).toBe(true);
      expect(TimeFormatter.isCriticalTime(0)).toBe(true);
    });

    it('should return correct timer type labels', () => {
      expect(TimeFormatter.getTimerTypeLabel('work')).toBe('работа');
      expect(TimeFormatter.getTimerTypeLabel('shortBreak')).toBe('короткий перерыв');
      expect(TimeFormatter.getTimerTypeLabel('longBreak')).toBe('длинный перерыв');
    });

    it('should format tray titles with emojis', () => {
      expect(TimeFormatter.formatTrayTitle(1500, 'work')).toBe('🍅 25:00');
      expect(TimeFormatter.formatTrayTitle(300, 'shortBreak')).toBe('☕ 05:00');
      expect(TimeFormatter.formatTrayTitle(900, 'longBreak')).toBe('🛋️ 15:00');
    });
  });

  describe('Constants Values', () => {
    it('should have correct app configuration', () => {
      expect(constants.APP_VERSION).toBe('1.0.0');
      expect(constants.DEFAULT_TIMER_DURATIONS.WORK).toBe(25);
      expect(constants.DEFAULT_TIMER_DURATIONS.SHORT_BREAK).toBe(5);
      expect(constants.DEFAULT_TIMER_DURATIONS.LONG_BREAK).toBe(15);
    });

    it('should have correct timer types', () => {
      expect(constants.TIMER_TYPES.WORK).toBe('work');
      expect(constants.TIMER_TYPES.SHORT_BREAK).toBe('shortBreak');
      expect(constants.TIMER_TYPES.LONG_BREAK).toBe('longBreak');
    });

    it('should have consistent emojis and labels', () => {
      expect(constants.TIMER_EMOJIS[constants.TIMER_TYPES.WORK]).toBe('🍅');
      expect(constants.TIMER_EMOJIS[constants.TIMER_TYPES.SHORT_BREAK]).toBe('☕');
      expect(constants.TIMER_EMOJIS[constants.TIMER_TYPES.LONG_BREAK]).toBe('🛋️');

      expect(constants.TIMER_LABELS[constants.TIMER_TYPES.WORK]).toBe('работа');
      expect(constants.TIMER_LABELS[constants.TIMER_TYPES.SHORT_BREAK]).toBe('короткий перерыв');
      expect(constants.TIMER_LABELS[constants.TIMER_TYPES.LONG_BREAK]).toBe('длинный перерыв');
    });

    it('should have correct file paths', () => {
      expect(constants.DATA_FILES.SETTINGS).toBe('settings.json');
      expect(constants.DATA_FILES.STATS).toBe('stats.json');
      expect(constants.DATA_FILES.LOGS_DIR).toBe('logs');
    });

    it('should have reasonable thresholds', () => {
      expect(constants.THRESHOLDS.CRITICAL_TIME_SECONDS).toBe(60);
      expect(constants.THRESHOLDS.MAX_DURATION_MINUTES).toBe(1440);
      expect(constants.THRESHOLDS.MIN_DURATION_MINUTES).toBe(1);
    });
  });

  describe('Utils Module Exports', () => {
    it('should have all expected exports', () => {
      expect(TimeFormatter).toBeDefined();
      expect(typeof TimeFormatter.formatTimerDisplay).toBe('function');
      expect(typeof TimeFormatter.formatDurationReadable).toBe('function');
      
      expect(constants.APP_VERSION).toBeDefined();
      expect(constants.DEFAULT_TIMER_DURATIONS).toBeDefined();
      expect(constants.TIMER_TYPES).toBeDefined();
    });
  });
});