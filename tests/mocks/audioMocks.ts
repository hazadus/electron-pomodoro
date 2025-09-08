import { vi } from 'vitest';

// Мокирование play-sound библиотеки
vi.mock('play-sound', () => ({
  default: vi.fn(() => ({
    play: vi.fn((filePath: string, options: any, callback?: Function) => {
      // Имитируем успешное воспроизведение
      if (callback) {
        setTimeout(() => callback(null), 100);
      }
      return {
        kill: vi.fn(), // метод для остановки воспроизведения
        pid: 12345,    // ID процесса
      };
    }),
  })),
}));

// Дополнительные моки для файловой системы (проверка существования файлов)
export const setupAudioMocks = () => {
  vi.mock('fs/promises', async () => ({
    access: vi.fn().mockResolvedValue(undefined), // файл существует
    stat: vi.fn().mockResolvedValue({ isFile: () => true }),
  }));
};