import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationHandler, NotificationService } from '../../../src/services/NotificationService';

// Мокируем electron-log
vi.mock('electron-log', () => ({
  default: {
    scope: vi.fn().mockReturnValue({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Мокируем модуль logger
vi.mock('../../../src/utils/logger', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Мокируем Electron с фабричной функцией
vi.mock('electron', () => {
  const mockTray = {
    setContextMenu: vi.fn(),
    setToolTip: vi.fn(),
    displayBalloon: vi.fn(),
  };

  const mockMenuInstance = { mock: 'menu' };

  const mockMenu = {
    buildFromTemplate: vi.fn(() => mockMenuInstance),
  };

  const mockMenuItem = vi.fn();

  return {
    Tray: vi.fn(() => mockTray),
    Menu: mockMenu,
    MenuItem: mockMenuItem,
  };
});

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockHandler: NotificationHandler;
  let mockTray: any;
  let mockMenu: any;
  let mockMenuInstance: any;

  beforeAll(async () => {
    const electron = await import('electron');
    mockMenu = electron.Menu;
    mockMenuInstance = { mock: 'menu' };
    mockTray = {
      setContextMenu: vi.fn(),
      setToolTip: vi.fn(),
      displayBalloon: vi.fn(),
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();

    notificationService = new NotificationService(mockTray as any);
    mockHandler = {
      onNotificationAction: vi.fn(),
    };
  });

  describe('constructor', () => {
    it('should initialize with tray', () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });
  });

  describe('setHandler', () => {
    it('should set notification handler', () => {
      expect(() => {
        notificationService.setHandler(mockHandler);
      }).not.toThrow();
    });
  });

  describe('setOriginalMenu', () => {
    it('should set original menu for restoration', () => {
      const originalMenu = { mock: 'original-menu' } as any;

      expect(() => {
        notificationService.setOriginalMenu(originalMenu);
      }).not.toThrow();
    });
  });

  describe('showInteractiveNotification', () => {
    beforeEach(() => {
      notificationService.setHandler(mockHandler);
    });

    it('should show work timer notification', async () => {
      await notificationService.showInteractiveNotification('work');

      expect(mockTray.setContextMenu).toHaveBeenCalledWith(mockMenuInstance);
      expect(mockTray.setToolTip).toHaveBeenCalledWith('🍅 Время работы закончилось!');
      expect(mockMenu.buildFromTemplate).toHaveBeenCalledOnce();
    });

    it('should show short break timer notification', async () => {
      await notificationService.showInteractiveNotification('shortBreak');

      expect(mockTray.setContextMenu).toHaveBeenCalledWith(mockMenuInstance);
      expect(mockTray.setToolTip).toHaveBeenCalledWith('☕ Короткий перерыв окончен!');
    });

    it('should show long break timer notification', async () => {
      await notificationService.showInteractiveNotification('longBreak');

      expect(mockTray.setContextMenu).toHaveBeenCalledWith(mockMenuInstance);
      expect(mockTray.setToolTip).toHaveBeenCalledWith('🛋️ Длинный перерыв окончен!');
    });

    it('should show balloon notification on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      await notificationService.showInteractiveNotification('work');

      expect(mockTray.displayBalloon).toHaveBeenCalledWith({
        title: '🍅 Pomodoro Timer',
        content: 'Время работы закончилось!',
        icon: undefined,
        iconType: 'info',
        respectQuietTime: false,
      });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should not show balloon on non-Windows platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      await notificationService.showInteractiveNotification('work');

      expect(mockTray.displayBalloon).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle tray unavailable', async () => {
      const serviceWithoutTray = new NotificationService(null as any);

      await expect(
        serviceWithoutTray.showInteractiveNotification('work')
      ).resolves.toBeUndefined();
    });
  });

  describe('getActionsForTimerType', () => {
    it('should return correct actions for work timer', () => {
      const actions = notificationService.getActionsForTimerType('work');

      expect(actions).toEqual([
        { type: 'start-short-break', text: 'Короткий перерыв' },
        { type: 'start-long-break', text: 'Длинный перерыв' },
        { type: 'dismiss', text: 'Закрыть' },
      ]);
    });

    it('should return correct actions for short break timer', () => {
      const actions = notificationService.getActionsForTimerType('shortBreak');

      expect(actions).toEqual([
        { type: 'start-work', text: 'Продолжить работу' },
        { type: 'start-long-break', text: 'Длинный перерыв' },
        { type: 'dismiss', text: 'Закрыть' },
      ]);
    });

    it('should return correct actions for long break timer', () => {
      const actions = notificationService.getActionsForTimerType('longBreak');

      expect(actions).toEqual([
        { type: 'start-work', text: 'Начать работу' },
        { type: 'dismiss', text: 'Закрыть' },
      ]);
    });
  });

  describe('restoreOriginalMenu', () => {
    it('should restore original menu and tooltip', () => {
      const originalMenu = { mock: 'original' } as any;
      notificationService.setOriginalMenu(originalMenu);

      notificationService.restoreOriginalMenu();

      expect(mockTray.setContextMenu).toHaveBeenCalledWith(originalMenu);
      expect(mockTray.setToolTip).toHaveBeenCalledWith('Pomodoro Timer');
    });

    it('should handle missing original menu gracefully', () => {
      expect(() => notificationService.restoreOriginalMenu()).not.toThrow();
    });
  });

  describe('isBalloonSupported', () => {
    it('should return true on Windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const result = notificationService.isBalloonSupported();

      expect(result).toBe(true);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return false on non-Windows platforms', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const result = notificationService.isBalloonSupported();

      expect(result).toBe(false);

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });

  describe('dismissNotification', () => {
    it('should dismiss notification and restore menu', () => {
      const originalMenu = { mock: 'original' } as any;
      notificationService.setOriginalMenu(originalMenu);

      notificationService.dismissNotification();

      expect(mockTray.setContextMenu).toHaveBeenCalledWith(originalMenu);
      expect(mockTray.setToolTip).toHaveBeenCalledWith('Pomodoro Timer');
    });
  });

  describe('timeout handling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should auto-restore menu after timeout', async () => {
      const originalMenu = { mock: 'original' } as any;
      notificationService.setOriginalMenu(originalMenu);

      await notificationService.showInteractiveNotification('work');

      // Перематываем время на 30 секунд
      vi.advanceTimersByTime(30000);

      expect(mockTray.setContextMenu).toHaveBeenCalledWith(originalMenu);
      expect(mockTray.setToolTip).toHaveBeenCalledWith('Pomodoro Timer');
    });
  });
});