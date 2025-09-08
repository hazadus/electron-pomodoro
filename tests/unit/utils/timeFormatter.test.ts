import { describe, expect, it } from 'vitest';
import { TimeFormatter } from '../../../src/utils/timeFormatter';

describe('TimeFormatter', () => {
  describe('formatTimerDisplay', () => {
    it('should format seconds to MM:SS correctly', () => {
      expect(TimeFormatter.formatTimerDisplay(0)).toBe('00:00');
      expect(TimeFormatter.formatTimerDisplay(59)).toBe('00:59');
      expect(TimeFormatter.formatTimerDisplay(60)).toBe('01:00');
      expect(TimeFormatter.formatTimerDisplay(90)).toBe('01:30');
      expect(TimeFormatter.formatTimerDisplay(1500)).toBe('25:00'); // 25 minutes
      expect(TimeFormatter.formatTimerDisplay(3599)).toBe('59:59');
    });
  });

  describe('formatDurationReadable', () => {
    it('should format minutes to readable format', () => {
      expect(TimeFormatter.formatDurationReadable(0)).toBe('0м');
      expect(TimeFormatter.formatDurationReadable(5)).toBe('5м');
      expect(TimeFormatter.formatDurationReadable(25)).toBe('25м');
      expect(TimeFormatter.formatDurationReadable(60)).toBe('1ч');
      expect(TimeFormatter.formatDurationReadable(90)).toBe('1ч 30м');
      expect(TimeFormatter.formatDurationReadable(120)).toBe('2ч');
    });
  });

  describe('minutesToSeconds', () => {
    it('should convert minutes to seconds correctly', () => {
      expect(TimeFormatter.minutesToSeconds(0)).toBe(0);
      expect(TimeFormatter.minutesToSeconds(1)).toBe(60);
      expect(TimeFormatter.minutesToSeconds(25)).toBe(1500);
      expect(TimeFormatter.minutesToSeconds(0.5)).toBe(30);
    });
  });

  describe('secondsToMinutes', () => {
    it('should convert seconds to minutes with ceiling', () => {
      expect(TimeFormatter.secondsToMinutes(0)).toBe(0);
      expect(TimeFormatter.secondsToMinutes(59)).toBe(1);
      expect(TimeFormatter.secondsToMinutes(60)).toBe(1);
      expect(TimeFormatter.secondsToMinutes(90)).toBe(2);
      expect(TimeFormatter.secondsToMinutes(1500)).toBe(25);
    });
  });

  describe('parseTimeComponents', () => {
    it('should parse seconds into time components', () => {
      expect(TimeFormatter.parseTimeComponents(0)).toEqual({
        hours: 0,
        minutes: 0,
        seconds: 0,
      });

      expect(TimeFormatter.parseTimeComponents(90)).toEqual({
        hours: 0,
        minutes: 1,
        seconds: 30,
      });

      expect(TimeFormatter.parseTimeComponents(3661)).toEqual({
        hours: 1,
        minutes: 1,
        seconds: 1,
      });
    });
  });

  describe('formatTrayTitle', () => {
    it('should format tray title with emoji and time', () => {
      expect(TimeFormatter.formatTrayTitle(1500, 'work')).toBe('🍅 25:00');
      expect(TimeFormatter.formatTrayTitle(300, 'shortBreak')).toBe('☕ 05:00');
      expect(TimeFormatter.formatTrayTitle(900, 'longBreak')).toBe('🛋️ 15:00');
      expect(TimeFormatter.formatTrayTitle(90, 'work')).toBe('🍅 01:30');
    });
  });

  describe('isCriticalTime', () => {
    it('should identify critical time (last 60 seconds)', () => {
      expect(TimeFormatter.isCriticalTime(61)).toBe(false);
      expect(TimeFormatter.isCriticalTime(60)).toBe(true);
      expect(TimeFormatter.isCriticalTime(30)).toBe(true);
      expect(TimeFormatter.isCriticalTime(0)).toBe(true);
    });
  });

  describe('formatRemainingTimeNotification', () => {
    it('should format remaining time for notifications', () => {
      expect(TimeFormatter.formatRemainingTimeNotification(30)).toBe('30 сек');
      expect(TimeFormatter.formatRemainingTimeNotification(60)).toBe('1 мин');
      expect(TimeFormatter.formatRemainingTimeNotification(90)).toBe('1 мин 30 сек');
      expect(TimeFormatter.formatRemainingTimeNotification(120)).toBe('2 мин');
    });
  });

  describe('getTimerTypeLabel', () => {
    it('should return correct Russian labels for timer types', () => {
      expect(TimeFormatter.getTimerTypeLabel('work')).toBe('работа');
      expect(TimeFormatter.getTimerTypeLabel('shortBreak')).toBe('короткий перерыв');
      expect(TimeFormatter.getTimerTypeLabel('longBreak')).toBe('длинный перерыв');
    });
  });

  describe('formatSettingsDuration', () => {
    it('should format duration for settings display', () => {
      expect(TimeFormatter.formatSettingsDuration(25)).toBe('25 мин');
      expect(TimeFormatter.formatSettingsDuration(5)).toBe('5 мин');
      expect(TimeFormatter.formatSettingsDuration(15)).toBe('15 мин');
    });
  });

  describe('isValidDuration', () => {
    it('should validate duration values', () => {
      expect(TimeFormatter.isValidDuration(0)).toBe(false);
      expect(TimeFormatter.isValidDuration(1)).toBe(true);
      expect(TimeFormatter.isValidDuration(25)).toBe(true);
      expect(TimeFormatter.isValidDuration(1440)).toBe(true); // 24 hours
      expect(TimeFormatter.isValidDuration(1441)).toBe(false); // > 24 hours
      expect(TimeFormatter.isValidDuration(1.5)).toBe(false); // not integer
      expect(TimeFormatter.isValidDuration(-1)).toBe(false);
    });
  });

  describe('formatDateForLogs', () => {
    it('should return ISO string', () => {
      const formatted = TimeFormatter.formatDateForLogs();
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('getRelativeTime', () => {
    it('should format relative time correctly', () => {
      const now = new Date();
      const today = now.toISOString();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

      expect(TimeFormatter.getRelativeTime(today)).toBe('Сегодня');
      expect(TimeFormatter.getRelativeTime(yesterday)).toBe('Вчера');
      expect(TimeFormatter.getRelativeTime(threeDaysAgo)).toBe('3 дн. назад');
      expect(TimeFormatter.getRelativeTime('invalid-date')).toBe('Неизвестно');
    });
  });
});