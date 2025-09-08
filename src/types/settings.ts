export interface AppSettings {
  workDuration: number; // в минутах
  shortBreakDuration: number; // в минутах
  longBreakDuration: number; // в минутах
  soundEnabled: boolean;
  version: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  soundEnabled: true,
  version: "1.0.0",
};

export interface SettingsValidation {
  workDuration: {
    min: number;
    max: number;
  };
  shortBreakDuration: {
    min: number;
    max: number;
  };
  longBreakDuration: {
    min: number;
    max: number;
  };
}

export const SETTINGS_VALIDATION: SettingsValidation = {
  workDuration: {
    min: 1,
    max: 120,
  },
  shortBreakDuration: {
    min: 1,
    max: 60,
  },
  longBreakDuration: {
    min: 1,
    max: 120,
  },
};

export interface SoundConfig {
  enabled: boolean;
  volume: number; // 0.0 - 1.0
  soundFile: string; // путь к файлу
}

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  enabled: true,
  volume: 1.0,
  soundFile: "/assets/sounds/notification.m4a",
};

export interface SettingsFormData {
  workDuration: string;
  shortBreakDuration: string;
  longBreakDuration: string;
  soundEnabled: boolean;
}

export type SettingsKey = keyof Omit<AppSettings, "version">;

export interface SettingsUpdateEvent {
  key: SettingsKey;
  value: number | boolean;
  previousValue: number | boolean;
}
