import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsService } from '../../../src/services/SettingsService';
import { AppSettings, DEFAULT_SETTINGS } from '../../../src/types/settings';
import { DATA_FILES, VALIDATION } from '../../../src/utils/constants';

// Мокируем файловую систему
vi.mock('../../../src/utils/fileManager', () => ({
  fileManager: {
    getUserDataFilePath: vi.fn(),
    fileExists: vi.fn(),
    readJsonFile: vi.fn(),
    writeJsonFile: vi.fn(),
    backupFile: vi.fn()
  }
}));

// Мокируем логгеры
vi.mock('../../../src/utils/logger', () => ({
  settingsLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  errorLogger: {
    logError: vi.fn()
  }
}));

describe('SettingsService', () => {
  let settingsService: SettingsService;
  let mockFileManager: any;
  let mockSettingsLogger: any;
  let mockErrorLogger: any;
  const mockFilePath = '/mock/path/settings.json';

  beforeEach(async () => {
    // Получаем ссылки на моки
    const { fileManager } = await import('../../../src/utils/fileManager');
    const { settingsLogger, errorLogger } = await import('../../../src/utils/logger');

    mockFileManager = fileManager as any;
    mockSettingsLogger = settingsLogger as any;
    mockErrorLogger = errorLogger as any;

    // Сброс всех моков
    vi.clearAllMocks();

    // Настройка моков по умолчанию
    mockFileManager.getUserDataFilePath.mockReturnValue(mockFilePath);
    mockFileManager.fileExists.mockResolvedValue(false);
    mockFileManager.writeJsonFile.mockResolvedValue(undefined);

    settingsService = new SettingsService();
  });

  afterEach(() => {
    // Очистка всех слушателей событий
    settingsService.removeAllListeners();
  });

  describe('Constructor', () => {
    it('should create SettingsService instance with default settings', () => {
      expect(settingsService).toBeInstanceOf(SettingsService);
      expect(mockFileManager.getUserDataFilePath).toHaveBeenCalledWith(DATA_FILES.SETTINGS);
      expect(mockSettingsLogger.info).toHaveBeenCalledWith('SettingsService initialized', {
        filePath: mockFilePath,
        defaultSettings: DEFAULT_SETTINGS
      });
    });
  });

  describe('initialize', () => {
    it('should initialize successfully when no file exists', async () => {
      const settingsLoadedHandler = vi.fn();
      settingsService.on('settingsLoaded', settingsLoadedHandler);

      mockFileManager.fileExists.mockResolvedValue(false);

      await settingsService.initialize();

      expect(settingsService.getSettingsStats().isInitialized).toBe(true);
      expect(mockFileManager.writeJsonFile).toHaveBeenCalledWith(mockFilePath, DEFAULT_SETTINGS);
      expect(settingsLoadedHandler).toHaveBeenCalledWith(DEFAULT_SETTINGS);
      expect(mockSettingsLogger.info).toHaveBeenCalledWith('Settings file does not exist, creating with default values');
    });

    it('should load valid settings from existing file', async () => {
      const validSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        workDuration: 30,
        soundEnabled: false
      };

      mockFileManager.fileExists.mockResolvedValue(true);
      mockFileManager.readJsonFile.mockResolvedValue(validSettings);

      await settingsService.initialize();

      const currentSettings = settingsService.getSettings();
      expect(currentSettings.workDuration).toBe(30);
      expect(currentSettings.soundEnabled).toBe(false);
      expect(mockSettingsLogger.info).toHaveBeenCalledWith('Settings loaded successfully', {
        loadedSettings: expect.objectContaining({
          workDuration: 30,
          soundEnabled: false
        })
      });
    });

    it('should handle invalid settings file and create backup', async () => {
      mockFileManager.fileExists.mockResolvedValue(true);
      mockFileManager.readJsonFile.mockResolvedValue(null); // Невалидные данные
      mockFileManager.backupFile.mockResolvedValue('/mock/backup/path');

      await settingsService.initialize();

      expect(mockFileManager.backupFile).toHaveBeenCalledWith(mockFilePath);
      expect(mockFileManager.writeJsonFile).toHaveBeenCalledWith(mockFilePath, DEFAULT_SETTINGS);
      expect(mockSettingsLogger.warn).toHaveBeenCalledWith('Invalid settings file format, using defaults');
    });

    it('should emit settingsError on initialization failure', async () => {
      const settingsErrorHandler = vi.fn();
      settingsService.on('settingsError', settingsErrorHandler);

      const error = new Error('File read error');
      mockFileManager.fileExists.mockRejectedValue(error);

      await expect(settingsService.initialize()).rejects.toThrow('File read error');
      expect(settingsErrorHandler).toHaveBeenCalledWith(error, 'initialize');
    });
  });

  describe('getSettings', () => {
    it('should return readonly copy of current settings', async () => {
      await settingsService.initialize();
      const settings = settingsService.getSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(Object.isFrozen(settings)).toBe(true);
    });

    it('should warn when called before initialization', () => {
      settingsService.getSettings();
      expect(mockSettingsLogger.warn).toHaveBeenCalledWith('Attempted to get settings before initialization');
    });
  });

  describe('getSetting', () => {
    it('should return specific setting value', async () => {
      await settingsService.initialize();

      expect(settingsService.getSetting('workDuration')).toBe(DEFAULT_SETTINGS.workDuration);
      expect(settingsService.getSetting('soundEnabled')).toBe(DEFAULT_SETTINGS.soundEnabled);
    });

    it('should warn when called before initialization', () => {
      settingsService.getSetting('workDuration');
      expect(mockSettingsLogger.warn).toHaveBeenCalledWith('Attempted to get setting before initialization', {
        key: 'workDuration'
      });
    });
  });

  describe('updateSetting', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should update valid setting and emit event', async () => {
      const settingsChangedHandler = vi.fn();
      settingsService.on('settingsChanged', settingsChangedHandler);

      await settingsService.updateSetting('workDuration', 30);

      expect(settingsService.getSetting('workDuration')).toBe(30);
      expect(mockFileManager.writeJsonFile).toHaveBeenCalledWith(
        mockFilePath,
        expect.objectContaining({ workDuration: 30 })
      );
      expect(settingsChangedHandler).toHaveBeenCalledWith({
        key: 'workDuration',
        value: 30,
        previousValue: DEFAULT_SETTINGS.workDuration
      });
    });

    it('should reject invalid setting value', async () => {
      await expect(settingsService.updateSetting('workDuration', -5)).rejects.toThrow(
        'Invalid value for setting workDuration: -5'
      );

      expect(settingsService.getSetting('workDuration')).toBe(DEFAULT_SETTINGS.workDuration);
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });

    it('should reject update when not initialized', async () => {
      const uninitializedService = new SettingsService();

      await expect(uninitializedService.updateSetting('workDuration', 30)).rejects.toThrow(
        'SettingsService not initialized'
      );
    });

    it('should rollback changes if save fails', async () => {
      mockFileManager.writeJsonFile.mockRejectedValue(new Error('Save failed'));

      await expect(settingsService.updateSetting('workDuration', 30)).rejects.toThrow('Save failed');

      expect(settingsService.getSetting('workDuration')).toBe(DEFAULT_SETTINGS.workDuration);
    });
  });

  describe('updateSettings', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should update multiple settings', async () => {
      const settingsChangedHandler = vi.fn();
      settingsService.on('settingsChanged', settingsChangedHandler);

      const updates = {
        workDuration: 30,
        shortBreakDuration: 10,
        soundEnabled: false
      };

      await settingsService.updateSettings(updates);

      expect(settingsService.getSetting('workDuration')).toBe(30);
      expect(settingsService.getSetting('shortBreakDuration')).toBe(10);
      expect(settingsService.getSetting('soundEnabled')).toBe(false);
      expect(settingsChangedHandler).toHaveBeenCalledTimes(3);
    });

    it('should ignore undefined values', async () => {
      const updates = {
        workDuration: 30,
        shortBreakDuration: undefined,
        soundEnabled: false
      };

      await settingsService.updateSettings(updates);

      expect(settingsService.getSetting('workDuration')).toBe(30);
      expect(settingsService.getSetting('shortBreakDuration')).toBe(DEFAULT_SETTINGS.shortBreakDuration);
      expect(settingsService.getSetting('soundEnabled')).toBe(false);
    });

    it('should rollback all changes if save fails', async () => {
      mockFileManager.writeJsonFile.mockRejectedValue(new Error('Save failed'));

      const updates = {
        workDuration: 30,
        soundEnabled: false
      };

      await expect(settingsService.updateSettings(updates)).rejects.toThrow('Save failed');

      expect(settingsService.getSetting('workDuration')).toBe(DEFAULT_SETTINGS.workDuration);
      expect(settingsService.getSetting('soundEnabled')).toBe(DEFAULT_SETTINGS.soundEnabled);
    });
  });

  describe('resetToDefaults', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should reset all settings to defaults', async () => {
      const settingsResetHandler = vi.fn();
      settingsService.on('settingsReset', settingsResetHandler);

      // Сначала изменим некоторые настройки
      await settingsService.updateSetting('workDuration', 30);
      await settingsService.updateSetting('soundEnabled', false);

      // Затем сбросим
      await settingsService.resetToDefaults();

      expect(settingsService.getSettings()).toEqual(DEFAULT_SETTINGS);
      expect(settingsResetHandler).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    });

    it('should emit change events for each reset setting', async () => {
      const settingsChangedHandler = vi.fn();
      settingsService.on('settingsChanged', settingsChangedHandler);

      // Изменим настройки
      await settingsService.updateSetting('workDuration', 30);
      await settingsService.updateSetting('soundEnabled', false);

      // Сбросим события
      settingsChangedHandler.mockClear();

      await settingsService.resetToDefaults();

      expect(settingsChangedHandler).toHaveBeenCalledWith({
        key: 'workDuration',
        value: DEFAULT_SETTINGS.workDuration,
        previousValue: 30
      });

      expect(settingsChangedHandler).toHaveBeenCalledWith({
        key: 'soundEnabled',
        value: DEFAULT_SETTINGS.soundEnabled,
        previousValue: false
      });
    });
  });

  describe('validation', () => {
    it('should validate duration ranges correctly', async () => {
      await settingsService.initialize();

      // Валидные значения
      await expect(settingsService.updateSetting('workDuration', 25)).resolves.not.toThrow();
      await expect(settingsService.updateSetting('shortBreakDuration', 5)).resolves.not.toThrow();
      await expect(settingsService.updateSetting('longBreakDuration', 15)).resolves.not.toThrow();

      // Невалидные значения
      await expect(settingsService.updateSetting('workDuration', 0)).rejects.toThrow();
      await expect(settingsService.updateSetting('workDuration', 121)).rejects.toThrow();
      await expect(settingsService.updateSetting('shortBreakDuration', 0)).rejects.toThrow();
      await expect(settingsService.updateSetting('shortBreakDuration', 61)).rejects.toThrow();
    });

    it('should validate boolean settings', async () => {
      await settingsService.initialize();

      await expect(settingsService.updateSetting('soundEnabled', true)).resolves.not.toThrow();
      await expect(settingsService.updateSetting('soundEnabled', false)).resolves.not.toThrow();
    });

    it('should validate settings structure', () => {
      const validSettings = {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        soundEnabled: true,
        version: '1.0.0'
      };

      const invalidSettings = [
        null,
        undefined,
        'string',
        [],
        {},
        { workDuration: 25 }, // missing fields
        { ...validSettings, workDuration: 'invalid' }, // wrong type
        { ...validSettings, workDuration: 0 }, // out of range
        { ...validSettings, version: '2.0.0' } // unsupported version
      ];

      expect(settingsService.validateCurrentSettings()).toBe(true);

      // Тестируем приватный метод через рефлексию
      const validateMethod = (settingsService as any).validateSettingsData.bind(settingsService);

      expect(validateMethod(validSettings)).toBe(true);

      invalidSettings.forEach(settings => {
        expect(validateMethod(settings)).toBe(false);
      });
    });
  });

  describe('autoSave functionality', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should disable and enable auto-save', async () => {
      settingsService.setAutoSave(false);

      await settingsService.updateSetting('workDuration', 30);

      // Автосохранение отключено, файл не должен быть записан
      expect(mockFileManager.writeJsonFile).toHaveBeenCalledTimes(1); // только при инициализации

      settingsService.setAutoSave(true);

      await settingsService.updateSetting('workDuration', 35);

      // Теперь должно быть автосохранение
      expect(mockFileManager.writeJsonFile).toHaveBeenCalledTimes(2);
    });

    it('should allow forced save when auto-save is disabled', async () => {
      settingsService.setAutoSave(false);

      await settingsService.updateSetting('workDuration', 30);
      await settingsService.forceSave();

      expect(mockFileManager.writeJsonFile).toHaveBeenCalledWith(
        mockFilePath,
        expect.objectContaining({ workDuration: 30 })
      );
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      const error = new Error('File system error');
      mockFileManager.fileExists.mockRejectedValue(error);

      const settingsErrorHandler = vi.fn();
      settingsService.on('settingsError', settingsErrorHandler);

      await expect(settingsService.initialize()).rejects.toThrow('File system error');
      expect(settingsErrorHandler).toHaveBeenCalledWith(error, 'initialize');
      expect(mockErrorLogger.logError).toHaveBeenCalled();
    });

    it('should create backup on corrupted file', async () => {
      mockFileManager.fileExists.mockResolvedValue(true);
      mockFileManager.readJsonFile.mockImplementation(() => {
        throw new Error('JSON parse error');
      });
      mockFileManager.backupFile.mockResolvedValue('/backup/path');

      await settingsService.initialize();

      expect(mockFileManager.backupFile).toHaveBeenCalledWith(mockFilePath);
      expect(mockSettingsLogger.warn).toHaveBeenCalledWith('Failed to load settings, using defaults');
    });
  });

  describe('getSettingsStats', () => {
    it('should return correct stats after initialization', async () => {
      await settingsService.initialize();

      const stats = settingsService.getSettingsStats();

      expect(stats).toEqual({
        isInitialized: true,
        autoSaveEnabled: true,
        filePath: mockFilePath,
        currentVersion: DEFAULT_SETTINGS.version,
        supportedVersions: VALIDATION.SETTINGS_VERSION_SUPPORTED,
        isValid: true
      });
    });

    it('should return correct stats before initialization', () => {
      const stats = settingsService.getSettingsStats();

      expect(stats.isInitialized).toBe(false);
      expect(stats.autoSaveEnabled).toBe(true);
      expect(stats.filePath).toBe(mockFilePath);
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      await settingsService.initialize();
    });

    it('should emit settingsChanged for each setting update', async () => {
      const handler = vi.fn();
      settingsService.on('settingsChanged', handler);

      await settingsService.updateSetting('workDuration', 30);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        key: 'workDuration',
        value: 30,
        previousValue: DEFAULT_SETTINGS.workDuration
      });
    });

    it('should emit settingsLoaded on initialization', async () => {
      const newService = new SettingsService();
      const handler = vi.fn();

      newService.on('settingsLoaded', handler);
      await newService.initialize();

      expect(handler).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    });

    it('should emit settingsReset on reset', async () => {
      const handler = vi.fn();
      settingsService.on('settingsReset', handler);

      await settingsService.resetToDefaults();

      expect(handler).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    });
  });
});