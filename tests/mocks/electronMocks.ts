import { vi } from 'vitest';

export const mockApp = {
  getPath: vi.fn().mockReturnValue('/mock/path'),
  quit: vi.fn(),
  on: vi.fn(),
  getName: vi.fn().mockReturnValue('electron-learn'),
  getVersion: vi.fn().mockReturnValue('1.0.0'),
  whenReady: vi.fn().mockResolvedValue(undefined),
  isReady: vi.fn().mockReturnValue(true),
  requestSingleInstanceLock: vi.fn().mockReturnValue(true),
  focus: vi.fn(),
  hide: vi.fn(),
  show: vi.fn(),
};

export const mockTray = {
  setToolTip: vi.fn(),
  setContextMenu: vi.fn(),
  setImage: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn().mockReturnValue(false),
};

export const mockBrowserWindow = {
  loadFile: vi.fn().mockResolvedValue(undefined),
  loadURL: vi.fn().mockResolvedValue(undefined),
  show: vi.fn(),
  hide: vi.fn(),
  close: vi.fn(),
  destroy: vi.fn(),
  isDestroyed: vi.fn().mockReturnValue(false),
  on: vi.fn(),
  webContents: {
    send: vi.fn(),
    on: vi.fn(),
  },
  setResizable: vi.fn(),
  center: vi.fn(),
};

export const mockMenu = {
  buildFromTemplate: vi.fn(),
  setApplicationMenu: vi.fn(),
};

export const mockNotification = {
  show: vi.fn(),
  on: vi.fn(),
  close: vi.fn(),
};

export const mockIpcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn(),
};