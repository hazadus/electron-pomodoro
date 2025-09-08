export interface NotificationAction {
  type: NotificationActionType;
  text: string;
}

// Действия для разных типов таймеров после завершения
export const NOTIFICATION_ACTIONS = {
  afterWork: [
    { type: "start-short-break", text: "Короткий перерыв" },
    { type: "start-long-break", text: "Длинный перерыв" },
    { type: "dismiss", text: "Закрыть" },
  ],
  afterShortBreak: [
    { type: "start-work", text: "Продолжить работу" },
    { type: "start-long-break", text: "Длинный перерыв" },
    { type: "dismiss", text: "Закрыть" },
  ],
  afterLongBreak: [
    { type: "start-work", text: "Начать работу" },
    { type: "dismiss", text: "Закрыть" },
  ],
} as const;

export type NotificationActionType =
  | "start-work"
  | "start-short-break"
  | "start-long-break"
  | "dismiss";
