import { vol } from 'memfs';
import { beforeEach, vi } from 'vitest';

vi.mock('fs/promises');
vi.mock('fs');

export const setupFsMocks = () => {
  beforeEach(() => {
    vol.reset();
    vol.fromJSON({
      '/mock/path/settings.json': JSON.stringify({
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        soundEnabled: true,
        version: '1.0.0'
      }),
      '/mock/path/stats.json': JSON.stringify({
        workSessions: 0,
        shortBreakSessions: 0,
        longBreakSessions: 0,
        totalWorkTime: 0,
        totalBreakTime: 0,
        lastResetDate: '2025-01-01T00:00:00.000Z',
        version: '1.0.0'
      })
    });
  });
};