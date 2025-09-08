# 🍅 `electron-learn`

Простейшее приложение на Electron для изучения фреймворка. Показывает значок в трее с выпадающим меню.

Является основой для приложения - таймера помидора.

## Документация

- [preload скрипт](./docs/preload.md)

## Ссылки

- Значки: https://icons8.com/icons/set/tomato

## Запуск и сборка

```bash
# Сборка TypeScript файлов
npm run build

# Запуск приложения
npm start

# Сборка для распространения
# Это создаст готовое приложение в папке out/
npm run make
```

## Инструменты разработки

Проект настроен с современными инструментами для обеспечения качества кода:

### 🔍 ESLint

Статический анализатор кода с правилами для:

- TypeScript (`@typescript-eslint/recommended`)
- Electron (`eslint-plugin-electron`)
- Безопасность (`eslint-plugin-security`)

```bash
# Проверка кода
npm run lint

# Автоматическое исправление ошибок
npm run lint:fix
```

### 💅 Prettier

Автоматическое форматирование кода с едиными стандартами:

- Двойные кавычки
- Точки с запятой
- Максимальная ширина строки: 80 символов

```bash
# Форматирование кода
npm run format

# Проверка форматирования
npm run format:check
```

### 🐶 Husky + lint-staged

Автоматические проверки перед коммитом:

- ESLint анализ и автоисправление
- Prettier форматирование
- TypeScript проверка типов

```bash
# Проверка типов без компиляции
npm run type-check
```

### VS Code интеграция

Настроенное автоматическое форматирование при сохранении файлов в VS Code.

## 🧪 Тестирование

Проект настроен с комплексной системой тестирования для обеспечения качества и стабильности кода:

### Unit тесты (Vitest)

Быстрые изолированные тесты бизнес-логики:

```bash
# Запуск unit тестов
npm run test:unit

# Интерактивный режим тестирования
npm run test:ui

# Запуск с отчетом покрытия
npm run test:coverage
```

**Конфигурация покрытия кода:**
- Минимальные пороги: 70% ветвления, 80% функций/строк/выражений
- Исключения: типы TypeScript, main.ts, preload.ts

### E2E тесты (Playwright)

Полное тестирование пользовательских сценариев:

```bash
# Запуск E2E тестов
npm run test:e2e

# Интеграционные тесты
npm run test:integration
```

### Структура тестов

```
tests/
├── unit/           # Unit тесты (Vitest)
│   ├── services/   # Тесты сервисов
│   ├── utils/      # Тесты утилит
│   └── types/      # Тесты валидации типов
├── integration/    # Интеграционные тесты
├── e2e/           # E2E тесты (Playwright)
├── mocks/         # Моки для Electron API
│   ├── electronMocks.ts
│   ├── fsMocks.ts
│   ├── audioMocks.ts
│   └── systemMocks.ts
└── fixtures/      # Тестовые данные
    ├── settings.json
    ├── stats.json
    └── invalidData.json
```

### Моки и заглушки

Настроены моки для:
- **Electron API**: app, BrowserWindow, Tray, Menu
- **Файловая система**: fs/promises с memfs
- **Аудио**: play-sound библиотека
- **Логирование**: electron-log

### CI/CD команды

```bash
# Полный набор тестов для CI
npm run test:ci

# Быстрая проверка перед коммитом
npm run test:run
```

Все тесты автоматически запускаются перед коммитом через Husky hooks.
