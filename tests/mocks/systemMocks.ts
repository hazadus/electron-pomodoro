import { vi } from 'vitest';

// Мокирование electron-log в тестах
export const mockElectronLog = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  scope: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    transports: {
      file: {
        fileName: '',
        resolvePathFn: vi.fn()
      }
    }
  })),
  transports: {
    file: {
      level: 'info',
      maxSize: 5242880,
      format: '',
      fileName: '',
      resolvePathFn: vi.fn()
    },
    console: {
      level: 'debug',
      format: ''
    }
  }
};

vi.mock('electron-log', () => ({
  default: mockElectronLog
}));