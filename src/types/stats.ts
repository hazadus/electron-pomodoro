export interface StatsData {
  workSessions: number;
  shortBreakSessions: number;
  longBreakSessions: number;
  totalWorkTime: number; // в минутах
  totalBreakTime: number; // в минутах
  lastResetDate: string; // ISO 8601 строка
  version: string;
}

export const DEFAULT_STATS: StatsData = {
  workSessions: 0,
  shortBreakSessions: 0,
  longBreakSessions: 0,
  totalWorkTime: 0,
  totalBreakTime: 0,
  lastResetDate: new Date().toISOString(),
  version: "1.0.0",
};

export type SessionType = "work" | "shortBreak" | "longBreak";

export interface SessionRecord {
  type: SessionType;
  duration: number; // в минутах
  completedAt: string; // ISO 8601 строка
}

export interface StatsDisplayData {
  workSessions: number;
  shortBreakSessions: number;
  longBreakSessions: number;
  totalWorkTime: {
    hours: number;
    minutes: number;
  };
  totalBreakTime: {
    hours: number;
    minutes: number;
  };
  lastResetDate: string; // локализованная строка даты
}

export interface StatsSummary {
  totalSessions: number;
  totalTime: number; // в минутах
  averageWorkSessionDuration: number; // в минутах
  averageBreakDuration: number; // в минутах
  productivity: number; // в процентах (работа / общее время)
}

export interface StatsUpdateEvent {
  type: SessionType;
  duration: number;
  stats: StatsData;
}

export interface StatsResetEvent {
  previousStats: StatsData;
  resetDate: string; // ISO 8601 строка
  reason?: string;
}

export const STATS_LABELS: Record<
  keyof Omit<
    StatsData,
    "lastResetDate" | "version" | "totalWorkTime" | "totalBreakTime"
  >,
  string
> = {
  workSessions: "Выполнено рабочих сессий",
  shortBreakSessions: "Выполнено коротких перерывов",
  longBreakSessions: "Выполнено длинных перерывов",
};

export const STATS_TIME_LABELS = {
  totalWorkTime: "Общее время работы",
  totalBreakTime: "Общее время отдыха",
};

export interface StatsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
