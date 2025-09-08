/**
 * SettingsService - Сервис для управления настройками приложения
 *
 * Функциональность:
 * - Загрузка и сохранение настроек в settings.json
 * - Валидация структуры данных
 * - Значения по умолчанию
 * - Автосохранение изменений
 * - Резервное копирование
 */

import { EventEmitter } from "events";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  SETTINGS_VALIDATION,
  SettingsKey,
  SettingsUpdateEvent,
} from "../types/settings";
import { DATA_FILES, VALIDATION } from "../utils/constants";
import { fileManager } from "../utils/fileManager";
import { errorLogger, settingsLogger } from "../utils/logger";

export interface SettingsServiceEvents {
  settingsChanged: (event: SettingsUpdateEvent) => void;
  settingsLoaded: (settings: AppSettings) => void;
  settingsReset: (settings: AppSettings) => void;
  settingsError: (error: Error, action: string) => void;
}

export class SettingsService extends EventEmitter {
  private settings: AppSettings;
  private readonly filePath: string;
  private isInitialized: boolean = false;
  private autoSaveEnabled: boolean = true;

  constructor() {
    super();
    this.settings = { ...DEFAULT_SETTINGS };
    this.filePath = fileManager.getUserDataFilePath(DATA_FILES.SETTINGS);

    settingsLogger.info("SettingsService initialized", {
      filePath: this.filePath,
      defaultSettings: this.settings,
    });
  }

  /**
   * Инициализация сервиса - загрузка настроек из файла
   */
  async initialize(): Promise<void> {
    try {
      settingsLogger.info("Initializing SettingsService...");

      await this.loadSettings();
      this.isInitialized = true;

      settingsLogger.info("SettingsService initialized successfully", {
        loadedSettings: this.settings,
      });

      this.emit("settingsLoaded", { ...this.settings });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      errorLogger.logError(
        new Error(`Failed to initialize SettingsService: ${errorMessage}`),
        { filePath: this.filePath },
        "initialize"
      );

      this.emit("settingsError", error as Error, "initialize");
      throw error;
    }
  }

  /**
   * Загрузка настроек из файла
   */
  private async loadSettings(): Promise<void> {
    try {
      settingsLogger.debug("Loading settings from file...", {
        filePath: this.filePath,
      });

      const fileExists = await fileManager.fileExists(this.filePath);

      if (!fileExists) {
        settingsLogger.info(
          "Settings file does not exist, creating with default values"
        );
        await this.saveSettings();
        return;
      }

      const loadedData = await fileManager.readJsonFile<AppSettings>(
        this.filePath,
        this.validateSettingsData.bind(this)
      );

      if (loadedData === null) {
        settingsLogger.warn("Invalid settings file format, using defaults");
        await this.createBackupAndReset();
        return;
      }

      // Мерж с дефолтными настройками для обратной совместимости
      this.settings = this.mergeWithDefaults(loadedData);

      settingsLogger.info("Settings loaded successfully", {
        loadedSettings: this.settings,
      });
    } catch (error) {
      errorLogger.logError(
        error as Error,
        { filePath: this.filePath },
        "loadSettings"
      );

      settingsLogger.warn("Failed to load settings, using defaults");
      await this.createBackupAndReset();
    }
  }

  /**
   * Сохранение настроек в файл
   */
  private async saveSettings(): Promise<void> {
    try {
      settingsLogger.debug("Saving settings to file...", {
        filePath: this.filePath,
        settings: this.settings,
      });

      await fileManager.writeJsonFile(this.filePath, this.settings);

      settingsLogger.info("Settings saved successfully");
    } catch (error) {
      errorLogger.logError(
        error as Error,
        {
          filePath: this.filePath,
          settings: this.settings,
        },
        "saveSettings"
      );
      throw error;
    }
  }

  /**
   * Валидация структуры данных настроек
   */
  private validateSettingsData(data: unknown): data is AppSettings {
    if (!data || typeof data !== "object") {
      settingsLogger.debug("Settings validation failed: not an object");
      return false;
    }

    const settings = data as Record<string, unknown>;

    // Проверка обязательных полей
    const requiredFields: (keyof AppSettings)[] = [
      "workDuration",
      "shortBreakDuration",
      "longBreakDuration",
      "soundEnabled",
      "version",
    ];

    for (const field of requiredFields) {
      if (!(field in settings)) {
        settingsLogger.debug(
          `Settings validation failed: missing field ${field}`
        );
        return false;
      }
    }

    // Проверка типов
    if (
      typeof settings.workDuration !== "number" ||
      typeof settings.shortBreakDuration !== "number" ||
      typeof settings.longBreakDuration !== "number" ||
      typeof settings.soundEnabled !== "boolean" ||
      typeof settings.version !== "string"
    ) {
      settingsLogger.debug("Settings validation failed: incorrect field types");
      return false;
    }

    // Проверка диапазонов значений
    if (
      !this.validateDurationRange(settings.workDuration, "workDuration") ||
      !this.validateDurationRange(
        settings.shortBreakDuration,
        "shortBreakDuration"
      ) ||
      !this.validateDurationRange(
        settings.longBreakDuration,
        "longBreakDuration"
      )
    ) {
      settingsLogger.debug("Settings validation failed: values out of range");
      return false;
    }

    // Проверка поддерживаемой версии
    if (
      !VALIDATION.SETTINGS_VERSION_SUPPORTED.includes(
        settings.version as (typeof VALIDATION.SETTINGS_VERSION_SUPPORTED)[number]
      )
    ) {
      settingsLogger.debug("Settings validation failed: unsupported version", {
        version: settings.version,
        supported: VALIDATION.SETTINGS_VERSION_SUPPORTED,
      });
      return false;
    }

    settingsLogger.debug("Settings validation successful");
    return true;
  }

  /**
   * Валидация диапазона значений продолжительности
   */
  private validateDurationRange(
    value: number,
    field: keyof typeof SETTINGS_VALIDATION
  ): boolean {
    // eslint-disable-next-line security/detect-object-injection
    const validation = SETTINGS_VALIDATION[field];
    if (!validation) {
      return (
        value >= VALIDATION.DURATION.MIN && value <= VALIDATION.DURATION.MAX
      );
    }

    return value >= validation.min && value <= validation.max;
  }

  /**
   * Слияние загруженных настроек с настройками по умолчанию
   */
  private mergeWithDefaults(loadedSettings: Partial<AppSettings>): AppSettings {
    const merged = {
      ...DEFAULT_SETTINGS,
      ...loadedSettings,
      // Обновляем версию до текущей
      version: DEFAULT_SETTINGS.version,
    };

    settingsLogger.debug("Settings merged with defaults", {
      loaded: loadedSettings,
      merged: merged,
    });

    return merged;
  }

  /**
   * Создание резервной копии и сброс к настройкам по умолчанию
   */
  private async createBackupAndReset(): Promise<void> {
    try {
      if (await fileManager.fileExists(this.filePath)) {
        const backupPath = await fileManager.backupFile(this.filePath);
        settingsLogger.info("Settings file backed up", { backupPath });
      }

      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();

      settingsLogger.info("Settings reset to defaults");
    } catch (error) {
      errorLogger.logError(
        error as Error,
        { filePath: this.filePath },
        "createBackupAndReset"
      );
      throw error;
    }
  }

  /**
   * Получение текущих настроек
   */
  getSettings(): Readonly<AppSettings> {
    if (!this.isInitialized) {
      settingsLogger.warn("Attempted to get settings before initialization");
    }
    return Object.freeze({ ...this.settings });
  }

  /**
   * Получение конкретной настройки
   */
  getSetting<T extends SettingsKey>(key: T): AppSettings[T] {
    if (!this.isInitialized) {
      settingsLogger.warn("Attempted to get setting before initialization", {
        key,
      });
    }
    // eslint-disable-next-line security/detect-object-injection
    return this.settings[key];
  }

  /**
   * Обновление конкретной настройки
   */
  async updateSetting<T extends SettingsKey>(
    key: T,
    value: AppSettings[T]
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("SettingsService not initialized");
    }

    // eslint-disable-next-line security/detect-object-injection
    const previousValue = this.settings[key];

    // Валидация значения
    if (!this.validateSettingValue(key, value)) {
      const error = new Error(`Invalid value for setting ${key}: ${value}`);
      errorLogger.logError(
        error,
        { key, value, previousValue },
        "updateSetting"
      );
      throw error;
    }

    // eslint-disable-next-line security/detect-object-injection
    this.settings[key] = value;

    settingsLogger.info("Setting updated", {
      key,
      value,
      previousValue,
    });

    // Автосохранение
    if (this.autoSaveEnabled) {
      try {
        await this.saveSettings();
      } catch (error) {
        // Откат изменений при ошибке сохранения
        // eslint-disable-next-line security/detect-object-injection
        this.settings[key] = previousValue;
        throw error;
      }
    }

    // Уведомление о изменении
    const updateEvent: SettingsUpdateEvent = {
      key,
      value,
      previousValue,
    };

    this.emit("settingsChanged", updateEvent);
  }

  /**
   * Массовое обновление настроек
   */
  async updateSettings(
    updates: Partial<Omit<AppSettings, "version">>
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("SettingsService not initialized");
    }

    const previousSettings = { ...this.settings };
    const changes: SettingsUpdateEvent[] = [];

    try {
      // Применяем изменения и валидируем
      for (const [key, value] of Object.entries(updates)) {
        const settingsKey = key as SettingsKey;

        if (
          value !== undefined &&
          this.validateSettingValue(settingsKey, value)
        ) {
          // eslint-disable-next-line security/detect-object-injection
          if (this.settings[settingsKey] !== value) {
            changes.push({
              key: settingsKey,
              value,
              // eslint-disable-next-line security/detect-object-injection
              previousValue: this.settings[settingsKey],
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any, security/detect-object-injection
            (this.settings as any)[settingsKey] = value;
          }
        }
      }

      // Сохранение
      if (this.autoSaveEnabled && changes.length > 0) {
        await this.saveSettings();
      }

      // Уведомления о изменениях
      for (const change of changes) {
        settingsLogger.info("Setting updated in batch", change);
        this.emit("settingsChanged", change);
      }
    } catch (error) {
      // Откат всех изменений
      this.settings = previousSettings;
      errorLogger.logError(
        error as Error,
        { updates, changes },
        "updateSettings"
      );
      throw error;
    }
  }

  /**
   * Валидация значения настройки
   */
  private validateSettingValue<T extends SettingsKey>(
    key: T,
    value: AppSettings[T]
  ): boolean {
    switch (key) {
      case "workDuration":
      case "shortBreakDuration":
      case "longBreakDuration":
        return this.validateDurationRange(
          value as number,
          key as keyof typeof SETTINGS_VALIDATION
        );

      case "soundEnabled":
        return typeof value === "boolean";

      default:
        return true;
    }
  }

  /**
   * Сброс настроек к значениям по умолчанию
   */
  async resetToDefaults(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("SettingsService not initialized");
    }

    settingsLogger.info("Resetting settings to defaults...");

    const previousSettings = { ...this.settings };
    this.settings = { ...DEFAULT_SETTINGS };

    try {
      if (this.autoSaveEnabled) {
        await this.saveSettings();
      }

      settingsLogger.info("Settings reset to defaults successfully");
      this.emit("settingsReset", { ...this.settings });

      // Генерируем события изменений для каждой настройки
      for (const key of Object.keys(DEFAULT_SETTINGS) as SettingsKey[]) {
        // eslint-disable-next-line security/detect-object-injection
        if (previousSettings[key] !== this.settings[key]) {
          const updateEvent: SettingsUpdateEvent = {
            key,
            // eslint-disable-next-line security/detect-object-injection
            value: this.settings[key],
            // eslint-disable-next-line security/detect-object-injection
            previousValue: previousSettings[key],
          };
          this.emit("settingsChanged", updateEvent);
        }
      }
    } catch (error) {
      // Откат изменений
      this.settings = previousSettings;
      errorLogger.logError(
        error as Error,
        { previousSettings },
        "resetToDefaults"
      );
      throw error;
    }
  }

  /**
   * Управление автосохранением
   */
  setAutoSave(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    settingsLogger.info("Auto-save settings changed", { enabled });
  }

  /**
   * Принудительное сохранение настроек
   */
  async forceSave(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("SettingsService not initialized");
    }

    await this.saveSettings();
  }

  /**
   * Проверка валидности текущих настроек
   */
  validateCurrentSettings(): boolean {
    return this.validateSettingsData(this.settings);
  }

  /**
   * Получение статистики использования настроек
   */
  getSettingsStats() {
    return {
      isInitialized: this.isInitialized,
      autoSaveEnabled: this.autoSaveEnabled,
      filePath: this.filePath,
      currentVersion: this.settings.version,
      supportedVersions: VALIDATION.SETTINGS_VERSION_SUPPORTED,
      isValid: this.validateCurrentSettings(),
    };
  }
}

// Экспорт единственного экземпляра (Singleton)
export const settingsService = new SettingsService();
