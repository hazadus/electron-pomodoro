# Техническое задание: Приложение Pomodoro Timer

## Обзор проекта
Разработка приложения таймера помидора на базе существующего Electron-проекта. Приложение работает исключительно через системный трей без основного окна.

## Функциональные требования

### 1. Типы таймеров
Три типа таймеров с настраиваемой продолжительностью:
- **Работа**: 25 минут (по умолчанию) 🍅
- **Короткий перерыв**: 5 минут (по умолчанию) ☕
- **Длинный перерыв**: 15 минут (по умолчанию) 🛋️

### 2. Меню системного трея

#### Когда таймер не активен:
- Запустить работу (25 мин)
- Запустить короткий перерыв (5 мин)  
- Запустить длинный перерыв (15 мин)
- Статистика
- Настройки
- О программе
- Выход

#### Когда таймер активен:
- Остановить таймер
- Статистика
- Настройки  
- О программе
- Выход

### 3. Отображение времени в трее
- **Формат**: минуты:секунды (например, "24:30")
- **Эмодзи-индикаторы**: 🍅 24:30, ☕ 4:15, 🛋️ 14:45
- **Обновление**: каждую секунду

### 4. Окно настроек
- Четыре элемента управления в одном окне:
  - "Работа (мин): [25]"
  - "Короткий перерыв (мин): [5]"  
  - "Длинный перерыв (мин): [15]"
  - "Звуковые уведомления: [✓]" (чекбокс)
- Кнопки: "Сохранить", "Сброс к настройкам по умолчанию"
- Настройки сохраняются в файл конфигурации
- Настройки загружаются при запуске приложения

### 5. Окно статистики
Простые счетчики:
- "Выполнено рабочих сессий: X"
- "Выполнено коротких перерывов: X"
- "Выполнено длинных перерывов: X"
- "Общее время работы: Xч Xм"
- "Общее время отдыха: Xч Xм"

#### Кнопка сброса статистики
- Кнопка "Сбросить статистику" внизу окна статистики
- При нажатии показывает диалог подтверждения: "Сбросить всю статистику? Это действие нельзя отменить."
- Кнопки диалога: "Сбросить", "Отмена"
- При подтверждении все счетчики обнуляются
- Устанавливается новая дата сброса в `lastResetDate`
- Изменения немедленно сохраняются в `stats.json`
- Окно статистики автоматически обновляется с нулевыми значениями

Данные сохраняются и загружаются при запуске приложения.

### 6. Системные уведомления

#### При завершении таймера:
- **Звуковое оповещение**: настраиваемое (включено по умолчанию)
- **Звуковой файл**: `/assets/sounds/notification.m4a`
- **Разный текст для каждого типа**:
  - Работа: "Время работы закончилось!"
  - Короткий перерыв: "Короткий перерыв окончен!"
  - Длинный перерыв: "Длинный перерыв окончен!"

#### Контекстные кнопки в уведомлениях:
- **После работы**: "Короткий перерыв", "Длинный перерыв", "Закрыть"
- **После короткого перерыва**: "Продолжить работу", "Длинный перерыв", "Закрыть"
- **После длинного перерыва**: "Начать работу", "Закрыть"

### 7. Защита от случайного закрытия
При попытке закрыть приложение с активным таймером показывать предупреждение:
"Активен таймер [тип] (осталось XX:XX). Выйти из приложения?"
- Кнопки: "Остановить таймер и выйти", "Отмена"

## Технические требования

### Настройка среды разработки

#### Линтер и форматирование кода
Настройка ESLint и Prettier для обеспечения качества кода с самого начала разработки:

**ESLint конфигурация:**
- Базовые правила: `@eslint/js/recommended`
- TypeScript правила: `@typescript-eslint/recommended`
- Electron-специфичные правила: `eslint-plugin-electron`
- Настройки безопасности: `eslint-plugin-security`

**Prettier конфигурация:**
- Унификация стиля кода во всем проекте
- Интеграция с ESLint через `eslint-config-prettier`
- Автоматическое форматирование при сохранении

**Husky и lint-staged:**
- Автоматическая проверка кода перед коммитом
- Форматирование измененных файлов
- Предотвращение коммитов с ошибками линтера

**Структура конфигурации:**
```json
// eslint.config.js
{
  "extends": [
    "@eslint/js/recommended",
    "@typescript-eslint/recommended",
    "plugin:electron/recommended",
    "plugin:security/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "security/detect-non-literal-fs-filename": "off"
  }
}

// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

**VS Code настройки (.vscode/settings.json):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

**Скрипты разработки (package.json):**
```json
{
  "scripts": {
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.{ts,html,css,json}",
    "format:check": "prettier --check src/**/*.{ts,html,css,json}",
    "type-check": "tsc --noEmit",
    "prepare": "husky install"
  }
}
```

**Зависимости для разработки:**
```bash
npm install --save-dev \
  eslint \
  @eslint/js \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-electron \
  eslint-plugin-security \
  eslint-config-prettier \
  prettier \
  husky \
  lint-staged
```

**Производственные зависимости:**
```bash
npm install \
  play-sound
```

### Система хранения данных

#### Расположение файлов
Все данные приложения хранятся в стандартной директории userData:
- **macOS**: `~/Library/Application Support/electron-learn/`
- **Windows**: `%APPDATA%/electron-learn/`  
- **Linux**: `~/.config/electron-learn/`

#### Файлы данных

##### 1. settings.json
```json
{
  "workDuration": 25,
  "shortBreakDuration": 5,
  "longBreakDuration": 15,
  "soundEnabled": true,
  "version": "1.0.0"
}
```

##### 2. stats.json  
```json
{
  "workSessions": 0,
  "shortBreakSessions": 0,
  "longBreakSessions": 0,
  "totalWorkTime": 0,
  "totalBreakTime": 0,
  "lastResetDate": "2025-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

#### Стратегия работы с файлами
- Автоматическое создание файлов с настройками по умолчанию
- Валидация структуры при загрузке

### Архитектура кода

#### Файловая структура проекта
```
src/
├── main.ts              # Главный процесс Electron
├── preload.ts           # Скрипт безопасности
├── types/
│   ├── timer.ts         # Типы для таймеров
│   ├── settings.ts      # Типы настроек
│   └── stats.ts         # Типы статистики
├── services/
│   ├── TimerService.ts  # Управление таймерами
│   ├── SettingsService.ts # Работа с настройками
│   ├── StatsService.ts  # Управление статистикой
│   ├── NotificationService.ts # Системные уведомления
│   ├── SoundService.ts  # Воспроизведение звуков
│   └── TrayManager.ts   # Управление системным треем
├── windows/
│   ├── about.html       # Окно "О программе"
│   ├── settings.html    # Окно настроек
│   ├── stats.html       # Окно статистики
│   └── preloads/        # Preload скрипты для каждого окна
│       ├── aboutPreload.ts
│       ├── settingsPreload.ts
│       └── statsPreload.ts
├── utils/
│   ├── fileManager.ts   # Работа с файлами конфигурации
│   ├── timeFormatter.ts # Форматирование времени
│   ├── logger.ts        # Настройка electron-log
│   └── constants.ts     # Константы приложения
└── assets/              # Ресурсы (иконки, звуки)
    ├── icons/
    │   ├── icon.png
    │   ├── work.png
    │   ├── break.png
    │   └── longbreak.png
    └── sounds/
        └── notification.m4a
```

#### Основные компоненты

##### 1. Главный процесс (main.ts)
- Инициализация приложения
- Создание и управление окнами
- Интеграция всех сервисов
- Обработка событий приложения

##### 2. Сервисы
- **TimerService**: управление состоянием таймеров, обратный отсчет
- **SettingsService**: загрузка/сохранение настроек из JSON
- **StatsService**: накопление и сохранение статистики, сброс всех счетчиков с подтверждением
- **NotificationService**: отправка системных уведомлений с кнопками
- **SoundService**: воспроизведение звуковых уведомлений
- **TrayManager**: обновление меню и иконки трея в зависимости от состояния

##### 3. Менеджеры окон
- Создание окон по требованию (lazy loading)
- Единственный экземпляр каждого окна
- Безопасная передача данных через preload скрипты

##### 4. Утилиты
- **fileManager**: работа с userData директорией
- **timeFormatter**: конвертация времени в читаемый формат
- **constants**: все константы приложения в одном месте

#### SoundService - детальная спецификация

##### Основные возможности:
- Воспроизведение звуковых файлов при завершении таймеров
- Поддержка включения/отключения звука через настройки
- Кросс-платформенная совместимость (macOS/Windows/Linux)
- Обработка ошибок при недоступности аудио-устройств

##### Технические детали:
```typescript
export interface SoundConfig {
  enabled: boolean;
  volume: number; // 0.0 - 1.0
  soundFile: string; // путь к файлу
}

export class SoundService {
  private player: any; // play-sound instance
  private settings: SoundConfig;
  private soundFilePath: string;
  
  // Инициализация сервиса воспроизведения звука
  async initialize(): Promise<void>;
  
  // Загрузка звукового файла
  async loadSound(filePath: string): Promise<void>;
  
  // Воспроизведение с учетом настроек
  async playNotificationSound(): Promise<void>;
  
  // Проверка доступности системных аудио утилит
  isAudioAvailable(): boolean;
  
  // Управление громкостью (через play-sound опции)
  setVolume(volume: number): void;
}
```

##### Технологическая основа:
**Использует библиотеку `play-sound`** - Node.js пакет для воспроизведения аудио файлов:
- Работает в main процессе Electron (в отличие от Web Audio API)
- Кроссплатформенная поддержка через системные аудио утилиты
- Автоматическое определение подходящего плеера (afplay, mpg123, etc.)
- Простой API без необходимости работы с буферами и контекстами

##### Интеграция с настройками:
- Чтение состояния `soundEnabled` из SettingsService  
- Автоматическое обновление при изменении настроек
- Fallback на системные звуки при недоступности файла

##### Обработка ошибок:
- Graceful degradation при отсутствии системных аудио утилит
- Логирование ошибок воспроизведения через electron-log
- Альтернативные методы уведомления (системные звуки)
- Проверка существования аудио файлов перед воспроизведением

##### Поддерживаемые форматы:
- **Основной**: M4A (AAC) - лучшее качество/размер
- **Широко поддерживаемые**: MP3, WAV (работают на всех платформах)  
- **Дополнительные**: OGG, FLAC (зависят от системных кодеков)
- **Fallback**: системные звуки при проблемах с файлами

#### StatsService - детальная спецификация

##### Основные возможности:
- Накопление статистики выполненных сессий
- Подсчет общего времени работы и отдыха
- Сохранение данных в JSON файл
- Сброс всей статистики с подтверждением
- Восстановление данных при повреждении файла

##### Технические детали:
```typescript
export interface StatsData {
  workSessions: number;
  shortBreakSessions: number;
  longBreakSessions: number;
  totalWorkTime: number; // в минутах
  totalBreakTime: number; // в минутах
  lastResetDate: string; // ISO 8601 строка
  version: string;
}

export class StatsService {
  private stats: StatsData;
  private filePath: string;
  
  // Загрузка статистики при инициализации
  async loadStats(): Promise<void>;
  
  // Увеличение счетчика сессий
  incrementSession(type: 'work' | 'shortBreak' | 'longBreak'): void;
  
  // Добавление времени к общему счетчику
  addTime(type: 'work' | 'break', minutes: number): void;
  
  // Получение текущей статистики
  getStats(): Readonly<StatsData>;
  
  // Сброс всей статистики
  async resetStats(): Promise<void>;
  
  // Сохранение статистики в файл
  private async saveStats(): Promise<void>;
  
  // Валидация структуры данных
  private validateStatsData(data: any): data is StatsData;
}
```

##### Функция сброса статистики:
- Метод `resetStats()` обнуляет все счетчики
- Устанавливает текущую дату в `lastResetDate`
- Немедленно сохраняет изменения в файл
- Возвращает Promise для обработки ошибок сохранения
- Логирует операцию сброса с временной меткой

##### Интеграция с окном статистики:
- IPC канал `stats:reset` для вызова сброса из renderer процесса
- Диалог подтверждения реализован в renderer процессе
- Автоматическое обновление UI после успешного сброса
- Обработка ошибок сброса с уведомлением пользователя

##### Безопасность операции сброса:
- Двойное подтверждение от пользователя
- Резервное копирование данных перед сбросом (опционально)
- Возможность отмены операции на любом этапе
- Логирование всех операций сброса

#### Взаимодействие компонентов

```
main.ts
├── TrayManager ──── TimerService
│                 └── SettingsService
├── WindowManager
│   ├── SettingsWindow ──── SettingsService
│   ├── StatsWindow ────── StatsService
│   └── AboutWindow
├── NotificationService ── TimerService
└── SoundService ────── TimerService
                      └── SettingsService
```

#### Потоки данных

1. **Настройки**: SettingsService ↔ settings.json ↔ SettingsWindow
2. **Статистика**: StatsService ↔ stats.json ↔ StatsWindow  
3. **Таймер**: TimerService ↔ TrayManager ↔ NotificationService ↔ SoundService
4. **IPC**: MainProcess ↔ PreloadScripts ↔ RendererProcesses

### Совместимость
- Поддержка всех платформ (macOS/Windows/Linux)
- Корректное отображение эмодзи в системном трее
- Соблюдение принципов безопасности Electron

### Производительность  
- Обновление времени в трее каждую секунду
- Специальная индикация в последние 60 секунд таймера
- Минимальное потребление системных ресурсов

## Пользовательский интерфейс

### Локализация
- Интерфейс на русском языке
- Корректная обработка UTF-8 кодировки

### Поведение
- Приложение работает только через системный трей
- Нет главного окна приложения
- Модальные окна для настроек, статистики и "О программе"

### Интерфейс окна статистики
Окно содержит:
- Заголовок: "Статистика работы"
- Список показателей в вертикальном расположении:
  - "Выполнено рабочих сессий: X"
  - "Выполнено коротких перерывов: X"
  - "Выполнено длинных перерывов: X"
  - "Общее время работы: Xч Xм"
  - "Общее время отдыха: Xч Xм"
- Кнопка "Сбросить статистику" внизу окна (красного цвета)
- Диалог подтверждения сброса:
  - Текст: "Сбросить всю статистику? Это действие нельзя отменить."
  - Кнопка "Сбросить" (красная)
  - Кнопка "Отмена" (серая, по умолчанию)
- Размер окна: 350x250 пикселей
- Окно не изменяет размер, центрируется на экране

## Реализация безопасности

### Electron Security
- Включение `contextIsolation: true` для всех окон
- Отключение `nodeIntegration: false` в renderer процессах  
- Использование отдельных preload скриптов для каждого окна
- Валидация всех IPC сообщений между процессами

### Защита данных
- Проверка целостности JSON файлов при загрузке
- Ограничение доступа к файловой системе через preload API
- Санитизация пользовательского ввода в настройках

## Тестирование и качество

### Стратегия тестирования

#### 1. Unit тесты (Vitest)
Покрытие изолированной бизнес-логики:
- **Сервисы**: TimerService, SettingsService, StatsService, NotificationService, SoundService
- **Утилиты**: fileManager, timeFormatter, валидация данных
- **Типы данных**: проверка интерфейсов и типов

**Специальные тесты для StatsService:**
- Корректность обнуления всех счетчиков при сбросе
- Установка новой даты сброса в `lastResetDate`
- Сохранение изменений в файл после сброса
- Обработка ошибок при недоступности файловой системы
- Валидация данных до и после сброса
- Проверка логирования операций сброса

**Конфигурация Vitest (vitest.config.ts):**
```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.ts',
        'src/preload.ts'
      ],
      thresholds: {
        branches: 70,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
```

#### 2. Integration и E2E тесты (Playwright for Electron)
Тестирование взаимодействия между компонентами и пользовательских сценариев:
- Жизненный цикл таймеров
- Сохранение и загрузка данных
- IPC коммуникация между процессами
- Обновление системного трея

**Playwright для Electron:**
```typescript
import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';
import path from 'path';

test.describe('Application launch', () => {
  let electronApp: ElectronApplication;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'dist', 'main.js')],
    });
    await electronApp.firstWindow();
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should have correct app title', async () => {
    const appTitle = await electronApp.evaluate(async ({ app }) => {
      return app.getName();
    });
    expect(appTitle).toBe('electron-learn');
  });
});
```

#### 3. E2E пользовательские сценарии
Тестирование пользовательских сценариев:
- Полный цикл работы с таймером
- Навигация по окнам настроек и статистики
- Системные уведомления и взаимодействие с ними
- Тестирование сброса статистики:
  - Открытие окна статистики с накопленными данными
  - Нажатие кнопки "Сбросить статистику"
  - Проверка появления диалога подтверждения
  - Отмена операции и проверка сохранения данных
  - Подтверждение сброса и проверка обнуления счетчиков
  - Проверка немедленного обновления UI

#### 4. Моки и заглушки

**Системные API:**
```typescript
// tests/mocks/electronMocks.ts
import { vi } from 'vitest';

export const mockApp = {
  getPath: vi.fn().mockReturnValue('/mock/path'),
  quit: vi.fn(),
  on: vi.fn(),
};

export const mockTray = {
  setToolTip: vi.fn(),
  setContextMenu: vi.fn(),
  on: vi.fn(),
};
```

**Файловая система:**
```typescript
// tests/mocks/fsMocks.ts
import { vi } from 'vitest';
import { vol } from 'memfs';

vi.mock('fs/promises');
vi.mock('fs');

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    '/mock/path/settings.json': JSON.stringify({
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      soundEnabled: true,
    }),
  });
});
```

**Play-Sound API:**
```typescript
// tests/mocks/audioMocks.ts
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
vi.mock('fs/promises', async () => ({
  access: vi.fn().mockResolvedValue(undefined), // файл существует
  stat: vi.fn().mockResolvedValue({ isFile: () => true }),
}));
```

#### 5. Структура тестов
```
tests/
├── unit/
│   ├── services/
│   │   ├── TimerService.test.ts
│   │   ├── SettingsService.test.ts
│   │   ├── StatsService.test.ts
│   │   ├── NotificationService.test.ts
│   │   └── SoundService.test.ts
│   ├── utils/
│   │   ├── fileManager.test.ts
│   │   └── timeFormatter.test.ts
│   └── types/
│       └── validation.test.ts
├── integration/
│   ├── timer-workflow.test.ts
│   ├── data-persistence.test.ts
│   └── ipc-communication.test.ts
├── e2e/
│   ├── user-scenarios.test.ts
│   ├── tray-interaction.test.ts
│   └── notifications.test.ts
├── mocks/
│   ├── electronMocks.ts
│   ├── fsMocks.ts
│   ├── audioMocks.ts
│   └── systemMocks.ts
└── fixtures/
    ├── settings.json
    ├── stats.json
    └── invalidData.json
```

#### 6. Тестовые зависимости
```bash
npm install --save-dev \
  vitest \
  @vitest/ui \
  @vitest/coverage-v8 \
  jsdom \
  memfs \
  @playwright/test \
  electron-mock-ipc
```

#### 7. Скрипты тестирования
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:integration": "playwright test tests/integration",
    "test:unit": "vitest run tests/unit",
    "test:ci": "npm run test:coverage && npm run test:e2e"
  }
}
```

### Архитектура для тестирования
- Разделение бизнес-логики на независимые сервисы
- Изоляция работы с файлами в отдельном модуле
- Мокирование системных API для unit тестов
- Dependency Injection для подмены зависимостей в тестах

### Отладка и логирование (electron-log)

#### Библиотека логирования
Использование **electron-log** как основной системы логирования:
- Специализированная библиотека для Electron приложений
- Автоматическая настройка путей к файлам логов
- Встроенная поддержка множественных транспортов
- Простая конфигурация без дополнительных зависимостей
- Оптимизирована для главного и рендер процессов

#### Конфигурация electron-log
```typescript
import log from 'electron-log';
import { app } from 'electron';
import path from 'path';

const isDev = process.env.NODE_ENV === 'development';

// Настройка основного логгера
log.transports.file.level = isDev ? 'debug' : 'info';
log.transports.file.maxSize = 5 * 1024 * 1024; // 5MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.file.fileName = 'main.log';
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs', 'main.log');

// Настройка консольного транспорта
log.transports.console.level = isDev ? 'debug' : false;
log.transports.console.format = '{h}:{i}:{s}.{ms} › [{level}] {text}';

// Создание специализированных логгеров
export const createLogger = (scope: string) => {
  const logger = log.scope(scope);
  
  // Настройка файлового транспорта для каждого скоупа
  if (scope !== 'main') {
    logger.transports.file.fileName = `${scope}.log`;
    logger.transports.file.resolvePathFn = () => 
      path.join(app.getPath('userData'), 'logs', `${scope}.log`);
  }
  
  return logger;
};
```

#### Специализированные логгеры
```typescript
// Основные логгеры приложения
export const logger = log; // основной логгер
export const timerLogger = createLogger('timer');
export const trayLogger = createLogger('tray');
export const statsLogger = createLogger('stats');
export const settingsLogger = createLogger('settings');
export const notificationLogger = createLogger('notification');
```

#### Структура логирования

##### Уровни логирования:
- **error**: критические ошибки, исключения, сбои системы
- **warn**: предупреждения, неожиданные ситуации
- **info**: важные события приложения (запуск/остановка таймера, сохранение настроек)
- **debug**: детальная информация для отладки (только в development)

##### Расположение логов:
- **macOS**: `~/Library/Application Support/electron-learn/logs/`
- **Windows**: `%APPDATA%/electron-learn/logs/`
- **Linux**: `~/.config/electron-learn/logs/`

##### Файлы логов:
- `main.log` - основные логи приложения (до 5MB)
- `timer.log` - логи работы с таймерами
- `stats.log` - логи статистики
- `settings.log` - логи настроек
- `notification.log` - логи уведомлений
- `tray.log` - логи системного трея

#### Интеграция в сервисы

##### TimerService логирование:
```typescript
export class TimerService {
  private logger = timerLogger;

  startTimer(type: TimerType, duration: number) {
    this.logger.info('Timer started', { 
      type, 
      duration, 
      timestamp: Date.now() 
    });
  }

  stopTimer() {
    this.logger.info('Timer stopped', { 
      remaining: this.remainingTime,
      type: this.currentTimerType 
    });
  }

  onTimerComplete() {
    this.logger.info('Timer completed', { 
      type: this.currentTimerType,
      actualDuration: this.elapsed 
    });
  }
}
```

##### Обработка ошибок:
```typescript
try {
  await this.settingsService.saveSettings(settings);
  settingsLogger.info('Settings saved successfully', { settings });
} catch (error) {
  settingsLogger.error('Failed to save settings', { 
    error: error.message,
    stack: error.stack,
    settings 
  });
  throw error;
}
```

##### SoundService логирование:
```typescript
import * as playSound from 'play-sound';
import { createLogger } from '../utils/logger';

export class SoundService {
  private logger = createLogger('sound');
  private player = playSound({});
  private settings: SoundConfig;

  async playNotificationSound() {
    if (!this.settings.soundEnabled) {
      this.logger.debug('Sound disabled, skipping playback');
      return;
    }

    try {
      await this.playSound();
      this.logger.info('Notification sound played successfully');
    } catch (error) {
      this.logger.error('Failed to play notification sound:', error.message, {
        soundFile: this.settings.soundFile,
        audioAvailable: this.isAudioAvailable()
      });
      // Fallback к системному звуку
      this.playSystemSound();
    }
  }

  private async playSound(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        timeout: 10000, // 10 секунд таймаут
      };
      
      this.player.play(this.settings.soundFile, options, (err: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async loadSound(filePath: string) {
    try {
      // Проверяем существование файла
      await fs.access(filePath);
      this.settings.soundFile = filePath;
      this.logger.info('Sound file loaded:', filePath);
    } catch (error) {
      this.logger.warn('Failed to load sound file:', error.message, { filePath });
      throw error;
    }
  }

  isAudioAvailable(): boolean {
    // Проверяем наличие системных аудио утилит
    try {
      // play-sound автоматически определяет доступные плееры
      return true; 
    } catch (error) {
      this.logger.warn('Audio utilities not available:', error.message);
      return false;
    }
  }
}
```

#### Телеметрия и аналитика
- Логирование пользовательских действий (анонимно)
- Метрики производительности (время запуска, использование памяти)
- Статистика использования функций
- Ошибки и исключения с контекстом

#### Development режим
- Консольный вывод с цветной подсветкой
- Детальные debug логи
- Логирование IPC сообщений
- Профилирование производительности

#### Production режим
- Только файловое логирование
- Минимальный уровень: info и выше
- Компактный JSON формат
- Автоматическая очистка старых логов

#### Зависимости логирования
```bash
npm install electron-log play-sound
```

#### Тестирование логирования
```typescript
// Мокирование electron-log в тестах
import { vi } from 'vitest';

vi.mock('electron-log', () => ({
  default: {
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
  }
}));
```

#### Пример теста SoundService с play-sound
```typescript
// tests/unit/services/SoundService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SoundService } from '../../../src/services/SoundService';

// Мокируем play-sound
vi.mock('play-sound', () => ({
  default: vi.fn(() => ({
    play: vi.fn(),
  })),
}));

vi.mock('fs/promises', () => ({
  access: vi.fn(),
}));

describe('SoundService', () => {
  let soundService: SoundService;
  let mockPlayer: any;

  beforeEach(() => {
    soundService = new SoundService();
    mockPlayer = soundService['player'];
  });

  it('should play sound when enabled', async () => {
    // Arrange
    const mockCallback = vi.fn((_, callback) => callback(null));
    mockPlayer.play = mockCallback;
    soundService['settings'] = {
      enabled: true,
      soundFile: '/path/to/sound.m4a',
      volume: 1.0,
    };

    // Act
    await soundService.playNotificationSound();

    // Assert
    expect(mockPlayer.play).toHaveBeenCalledWith(
      '/path/to/sound.m4a',
      { timeout: 10000 },
      expect.any(Function)
    );
  });

  it('should skip playback when sound disabled', async () => {
    // Arrange
    soundService['settings'] = { enabled: false, soundFile: '', volume: 1.0 };

    // Act
    await soundService.playNotificationSound();

    // Assert
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('should handle playback errors gracefully', async () => {
    // Arrange
    const mockCallback = vi.fn((_, callback) => callback(new Error('Playback failed')));
    mockPlayer.play = mockCallback;
    soundService['settings'] = { enabled: true, soundFile: '/path/to/sound.m4a', volume: 1.0 };
    
    // Act & Assert
    await expect(soundService.playNotificationSound()).rejects.toThrow('Playback failed');
  });
});
```