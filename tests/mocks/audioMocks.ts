import { vi } from 'vitest';

export const mockPlaySoundPlayer = {
  play: vi.fn(),
};

export const mockPlaySound = vi.fn(() => mockPlaySoundPlayer);

export const mockFsPromises = {
  access: vi.fn(),
  stat: vi.fn(),
};

export const mockExecSync = vi.fn();

export const mockSoundLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Мокирование play-sound библиотеки
vi.mock('play-sound', () => ({
  default: mockPlaySound,
}));

// Дополнительные моки для файловой системы
vi.mock('fs/promises', async () => {
  return {
    access: mockFsPromises.access,
    stat: mockFsPromises.stat,
  };
});

// Мокирование child_process
vi.mock('child_process', async () => ({
  execSync: mockExecSync,
}));

// Мокирование логгера
vi.mock('../../src/utils/logger', () => ({
  soundLogger: mockSoundLogger,
  createLogger: vi.fn(() => mockSoundLogger),
}));

export function resetMocks() {
  mockPlaySoundPlayer.play.mockClear();
  mockPlaySound.mockClear();
  mockFsPromises.access.mockClear();
  mockFsPromises.stat.mockClear();
  mockExecSync.mockClear();
  mockSoundLogger.info.mockClear();
  mockSoundLogger.error.mockClear();
  mockSoundLogger.warn.mockClear();
  mockSoundLogger.debug.mockClear();
}

export const setupSuccessfulMocks = () => {
  mockPlaySoundPlayer.play.mockImplementation((_filePath: string, _options: any, callback?: Function) => {
    if (callback) {
      setTimeout(() => callback(null), 10);
    }
  });
  mockFsPromises.access.mockResolvedValue(undefined);
  mockExecSync.mockReturnValue('');
};

export const setupFailingMocks = () => {
  mockPlaySoundPlayer.play.mockImplementation((_filePath: string, _options: any, callback?: Function) => {
    if (callback) {
      setTimeout(() => callback(new Error('Playback failed')), 10);
    }
  });
  mockFsPromises.access.mockRejectedValue(new Error('File not found'));
  mockExecSync.mockImplementation(() => {
    throw new Error('Command failed');
  });
};