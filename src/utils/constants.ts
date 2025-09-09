/**
 * Константы приложения Pomodoro Timer
 */

// Версия приложения
export const APP_VERSION = "1.0.0";

// Названия файлов данных
export const DATA_FILES = {
  SETTINGS: "settings.json",
  STATS: "stats.json",
  LOGS_DIR: "logs",
} as const;

// Настройки таймера по умолчанию (в минутах)
export const DEFAULT_TIMER_DURATIONS = {
  WORK: 25,
  SHORT_BREAK: 5,
  LONG_BREAK: 15,
} as const;

// Настройки по умолчанию
export const DEFAULT_SETTINGS = {
  workDuration: DEFAULT_TIMER_DURATIONS.WORK,
  shortBreakDuration: DEFAULT_TIMER_DURATIONS.SHORT_BREAK,
  longBreakDuration: DEFAULT_TIMER_DURATIONS.LONG_BREAK,
  soundEnabled: true,
  version: APP_VERSION,
} as const;

// Статистика по умолчанию
export const DEFAULT_STATS = {
  workSessions: 0,
  shortBreakSessions: 0,
  longBreakSessions: 0,
  totalWorkTime: 0,
  totalBreakTime: 0,
  lastResetDate: new Date().toISOString(),
  version: APP_VERSION,
} as const;

// Типы таймеров
export const TIMER_TYPES = {
  WORK: "work",
  SHORT_BREAK: "shortBreak",
  LONG_BREAK: "longBreak",
} as const;

// Эмодзи для типов таймеров
export const TIMER_EMOJIS = {
  [TIMER_TYPES.WORK]: "🍅",
  [TIMER_TYPES.SHORT_BREAK]: "☕",
  [TIMER_TYPES.LONG_BREAK]: "🛋️",
} as const;

// Названия типов таймеров на русском языке
export const TIMER_LABELS = {
  [TIMER_TYPES.WORK]: "работа",
  [TIMER_TYPES.SHORT_BREAK]: "короткий перерыв",
  [TIMER_TYPES.LONG_BREAK]: "длинный перерыв",
} as const;

// Сообщения для уведомлений при завершении таймера
export const NOTIFICATION_MESSAGES = {
  [TIMER_TYPES.WORK]: "Время работы закончилось!",
  [TIMER_TYPES.SHORT_BREAK]: "Короткий перерыв окончен!",
  [TIMER_TYPES.LONG_BREAK]: "Длинный перерыв окончен!",
} as const;

// Пути к ресурсам
export const ASSETS_PATHS = {
  ICONS: {
    MAIN: "assets/icons/icon_white.png",
    WORK: "assets/icons/work.png",
    SHORT_BREAK: "assets/icons/break.png",
    LONG_BREAK: "assets/icons/longbreak.png",
  },
  IMAGES: {
    POMODORO: "assets/images/pomodoro.png",
  },
  SOUNDS: {
    NOTIFICATION: "assets/sounds/notification.m4a",
  },
} as const;

// Настройки окон
export const WINDOW_CONFIG = {
  SETTINGS: {
    width: 470,
    height: 550,
    resizable: false,
  },
  STATS: {
    width: 450,
    height: 500,
    resizable: false,
  },
  ABOUT: {
    width: 400,
    height: 450,
    resizable: false,
  },
} as const;

// Интервалы обновления (в миллисекундах)
export const UPDATE_INTERVALS = {
  TIMER: 1000, // Обновление таймера каждую секунду
  TRAY: 1000, // Обновление трея каждую секунду
} as const;

// Пороговые значения
export const THRESHOLDS = {
  CRITICAL_TIME_SECONDS: 60, // Последние 60 секунд - критическое время
  MAX_DURATION_MINUTES: 1440, // Максимальная продолжительность таймера (24 часа)
  MIN_DURATION_MINUTES: 1, // Минимальная продолжительность таймера
} as const;

// Настройки логирования
export const LOGGING_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  LOG_LEVELS: {
    PRODUCTION: "info",
    DEVELOPMENT: "debug",
  },
  CLEANUP_DAYS: 30, // Удалять логи старше 30 дней
} as const;

// IPC каналы для коммуникации между процессами
export const IPC_CHANNELS = {
  // Настройки
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  SETTINGS_RESET: "settings:reset",

  // Статистика
  STATS_GET: "stats:get",
  STATS_RESET: "stats:reset",
  STATS_UPDATE: "stats:update",

  // Таймер
  TIMER_START: "timer:start",
  TIMER_STOP: "timer:stop",
  TIMER_STATUS: "timer:status",

  // Окна
  WINDOW_CLOSE: "window:close",
  WINDOW_SHOW: "window:show",
} as const;

// Названия меню трея
export const TRAY_MENU_LABELS = {
  // Когда таймер не активен
  START_WORK: "Запустить работу (25 мин)",
  START_SHORT_BREAK: "Запустить короткий перерыв (5 мин)",
  START_LONG_BREAK: "Запустить длинный перерыв (15 мин)",

  // Когда таймер активен
  STOP_TIMER: "Остановить таймер",

  // Общие пункты меню
  STATISTICS: "Статистика",
  SETTINGS: "Настройки",
  ABOUT: "О программе",
  QUIT: "Выход",
} as const;

// Кнопки для уведомлений
export const NOTIFICATION_ACTIONS = {
  WORK_COMPLETED: {
    SHORT_BREAK: "Короткий перерыв",
    LONG_BREAK: "Длинный перерыв",
    CLOSE: "Закрыть",
  },
  SHORT_BREAK_COMPLETED: {
    CONTINUE_WORK: "Продолжить работу",
    LONG_BREAK: "Длинный перерыв",
    CLOSE: "Закрыть",
  },
  LONG_BREAK_COMPLETED: {
    START_WORK: "Начать работу",
    CLOSE: "Закрыть",
  },
} as const;

// Сообщения для диалогов
export const DIALOG_MESSAGES = {
  QUIT_WITH_ACTIVE_TIMER:
    "Активен таймер {timerType} (осталось {remainingTime}). Выйти из приложения?",
  RESET_STATS_CONFIRM: "Сбросить всю статистику? Это действие нельзя отменить.",

  BUTTONS: {
    OK: "OK",
    CANCEL: "Отмена",
    SAVE: "Сохранить",
    RESET: "Сбросить",
    STOP_AND_QUIT: "Остановить таймер и выйти",
    RESET_TO_DEFAULTS: "Сброс к настройкам по умолчанию",
  },
} as const;

// Валидация входных данных
export const VALIDATION = {
  DURATION: {
    MIN: THRESHOLDS.MIN_DURATION_MINUTES,
    MAX: THRESHOLDS.MAX_DURATION_MINUTES,
  },
  SETTINGS_VERSION_SUPPORTED: ["1.0.0"],
  STATS_VERSION_SUPPORTED: ["1.0.0"],
} as const;

// Дебаг информация
export const DEBUG = {
  ENABLE_DEV_TOOLS: process.env.NODE_ENV === "development",
  CONSOLE_LOGS: process.env.NODE_ENV === "development",
} as const;
