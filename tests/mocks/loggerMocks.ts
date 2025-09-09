import { vi } from 'vitest';

export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Мокирование всего модуля логгера
vi.mock('../../src/utils/logger', () => ({
  soundLogger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
  mainLogger: mockLogger,
  timerLogger: mockLogger,
  trayLogger: mockLogger,
  statsLogger: mockLogger,
  settingsLogger: mockLogger,
  notificationLogger: mockLogger,
  errorLogger: {
    logError: vi.fn(),
    logWarning: vi.fn(),
    logInfo: vi.fn(),
    logDebug: vi.fn(),
  },
  performanceLogger: {
    startTimer: vi.fn(),
    endTimer: vi.fn(),
    logMemoryUsage: vi.fn(),
  },
  cleanupOldLogs: vi.fn(),
  ErrorLogger: vi.fn(() => ({
    logError: vi.fn(),
    logWarning: vi.fn(),
    logInfo: vi.fn(),
    logDebug: vi.fn(),
  })),
  PerformanceLogger: vi.fn(() => ({
    startTimer: vi.fn(),
    endTimer: vi.fn(),
    logMemoryUsage: vi.fn(),
  })),
  default: mockLogger,
}));

// Мокирование electron-log
vi.mock('electron-log', () => ({
  default: {
    ...mockLogger,
    create: vi.fn(() => mockLogger),
    scope: vi.fn(() => mockLogger),
    transports: {
      file: {
        level: 'info',
        maxSize: 5242880,
        format: '',
        fileName: '',
        resolvePathFn: vi.fn(),
      },
      console: {
        level: 'debug',
        format: '',
      },
    },
  },
  scope: vi.fn(() => mockLogger),
  transports: {
    file: {
      level: 'info',
      maxSize: 5242880,
      format: '',
      fileName: '',
      resolvePathFn: vi.fn(),
    },
    console: {
      level: 'debug',
      format: '',
    },
  },
}));