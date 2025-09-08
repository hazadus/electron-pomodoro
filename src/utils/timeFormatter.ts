/**
 * Утилиты для форматирования времени в приложении Pomodoro Timer
 */

export interface TimeComponents {
  hours: number;
  minutes: number;
  seconds: number;
}

export class TimeFormatter {
  /**
   * Форматирует секунды в формат MM:SS для отображения в системном трее
   */
  static formatTimerDisplay(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  /**
   * Форматирует минуты в читаемый формат "Xч Xм" для статистики
   */
  static formatDurationReadable(totalMinutes: number): string {
    if (totalMinutes === 0) {
      return "0м";
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes}м`;
    }

    if (minutes === 0) {
      return `${hours}ч`;
    }

    return `${hours}ч ${minutes}м`;
  }

  /**
   * Конвертирует минуты в секунды
   */
  static minutesToSeconds(minutes: number): number {
    return minutes * 60;
  }

  /**
   * Конвертирует секунды в минуты (округление вверх)
   */
  static secondsToMinutes(seconds: number): number {
    return Math.ceil(seconds / 60);
  }

  /**
   * Разбирает время в секундах на компоненты
   */
  static parseTimeComponents(totalSeconds: number): TimeComponents {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { hours, minutes, seconds };
  }

  /**
   * Форматирует время для отображения в трее с эмодзи
   */
  static formatTrayTitle(
    seconds: number,
    timerType: "work" | "shortBreak" | "longBreak"
  ): string {
    const timeStr = this.formatTimerDisplay(seconds);

    const emojis = {
      work: "🍅",
      shortBreak: "☕",
      longBreak: "🛋️",
    };

    const emoji =
      timerType === "work"
        ? emojis.work
        : timerType === "shortBreak"
          ? emojis.shortBreak
          : emojis.longBreak;
    return `${emoji} ${timeStr}`;
  }

  /**
   * Проверяет, является ли время в "критической зоне" (последние 60 секунд)
   */
  static isCriticalTime(seconds: number): boolean {
    return seconds <= 60;
  }

  /**
   * Форматирует оставшееся время для уведомлений
   */
  static formatRemainingTimeNotification(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} сек`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) {
      return `${minutes} мин`;
    }

    return `${minutes} мин ${remainingSeconds} сек`;
  }

  /**
   * Получает текстовое описание типа таймера на русском языке
   */
  static getTimerTypeLabel(
    timerType: "work" | "shortBreak" | "longBreak"
  ): string {
    const labels = {
      work: "работа",
      shortBreak: "короткий перерыв",
      longBreak: "длинный перерыв",
    };

    const label =
      timerType === "work"
        ? labels.work
        : timerType === "shortBreak"
          ? labels.shortBreak
          : labels.longBreak;
    return label;
  }

  /**
   * Форматирует продолжительность в минутах для отображения в настройках
   */
  static formatSettingsDuration(minutes: number): string {
    return `${minutes} мин`;
  }

  /**
   * Проверяет валидность времени в минутах для настроек
   */
  static isValidDuration(minutes: number): boolean {
    return minutes > 0 && minutes <= 1440 && Number.isInteger(minutes); // максимум 24 часа
  }

  /**
   * Форматирует дату для логов и статистики
   */
  static formatDateForLogs(): string {
    return new Date().toISOString();
  }

  /**
   * Форматирует дату последнего сброса статистики
   */
  static formatLastResetDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Неизвестно";
    }
  }

  /**
   * Получает относительное время (например, "2 дня назад")
   */
  static getRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Неизвестно";
      }
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return "Сегодня";
      } else if (diffDays === 1) {
        return "Вчера";
      } else if (diffDays < 7) {
        return `${diffDays} дн. назад`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? "1 нед. назад" : `${weeks} нед. назад`;
      } else {
        const months = Math.floor(diffDays / 30);
        return months === 1 ? "1 мес. назад" : `${months} мес. назад`;
      }
    } catch {
      return "Неизвестно";
    }
  }
}
