export type TimerType = "work" | "shortBreak" | "longBreak";

export type TimerState = "idle" | "running" | "paused" | "completed";

export interface Timer {
  type: TimerType;
  duration: number; // в минутах
  remainingTime: number; // в секундах
  state: TimerState;
  startedAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
}

export interface TimerEmoji {
  work: string;
  shortBreak: string;
  longBreak: string;
}

export const TIMER_EMOJIS: TimerEmoji = {
  work: "🍅",
  shortBreak: "☕",
  longBreak: "🛋️",
};

export const DEFAULT_DURATIONS: Record<TimerType, number> = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
};

export interface TimerNotificationText {
  work: string;
  shortBreak: string;
  longBreak: string;
}

export const TIMER_COMPLETION_MESSAGES: TimerNotificationText = {
  work: "Время работы закончилось!",
  shortBreak: "Короткий перерыв окончен!",
  longBreak: "Длинный перерыв окончен!",
};

export interface TimerConfig {
  type: TimerType;
  duration: number;
}

export interface TimerEventCallbacks {
  onTick?: (remainingTime: number) => void;
  onComplete?: (type: TimerType, actualDuration: number) => void;
  onStart?: (type: TimerType, duration: number) => void;
  onStop?: (type: TimerType, remainingTime: number) => void;
  onPause?: (type: TimerType, remainingTime: number) => void;
  onResume?: (type: TimerType, remainingTime: number) => void;
}
