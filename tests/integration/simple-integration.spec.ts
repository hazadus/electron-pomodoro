import { test, expect } from "@playwright/test";

test.describe("Simple Integration Tests", () => {
  test("should validate project files structure", async () => {
    const fs = require("fs");
    const path = require("path");

    const projectRoot = path.join(__dirname, "../..");

    // Проверяем основные файлы конфигурации
    expect(fs.existsSync(path.join(projectRoot, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "tsconfig.json"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "playwright.config.ts"))).toBe(true);

    // Проверяем основные исходные файлы
    expect(fs.existsSync(path.join(projectRoot, "src/main.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/services/TimerService.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/services/SettingsService.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "src/services/StatsService.ts"))).toBe(true);

    // Проверяем тестовую структуру
    expect(fs.existsSync(path.join(projectRoot, "tests/integration"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "tests/unit"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "tests/e2e"))).toBe(true);
  });

  test("should validate package.json configuration", async () => {
    const fs = require("fs");
    const path = require("path");

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8")
    );

    expect(packageJson.name).toBe("electron-pomodoro");
    expect(packageJson.scripts).toHaveProperty("build");
    expect(packageJson.scripts).toHaveProperty("test");
    expect(packageJson.scripts).toHaveProperty("test:integration");
    expect(packageJson.dependencies).toHaveProperty("electron-log");
    expect(packageJson.devDependencies).toHaveProperty("@playwright/test");
  });

  test("should validate TypeScript types structure", async () => {
    const timerTypes = require("../../src/types/timer");
    const settingsTypes = require("../../src/types/settings");
    const statsTypes = require("../../src/types/stats");

    // Проверяем основные экспорты
    expect(timerTypes).toHaveProperty("DEFAULT_DURATIONS");
    expect(settingsTypes).toHaveProperty("DEFAULT_SETTINGS");
    expect(statsTypes).toHaveProperty("DEFAULT_STATS");

    // Проверяем структуру значений по умолчанию
    expect(timerTypes.DEFAULT_DURATIONS.work).toBe(25);
    expect(settingsTypes.DEFAULT_SETTINGS.workDuration).toBe(25);
    expect(statsTypes.DEFAULT_STATS.workSessions).toBe(0);
  });

  test("should validate utils and constants", async () => {
    const timeFormatter = require("../../src/utils/timeFormatter");
    const constants = require("../../src/utils/constants");

    // Проверяем TimeFormatter
    expect(timeFormatter.TimeFormatter).toBeDefined();
    expect(typeof timeFormatter.TimeFormatter.formatTimerDisplay).toBe("function");

    // Проверяем константы
    expect(constants.ASSETS_PATHS).toBeDefined();
    expect(constants.WINDOW_CONFIG).toBeDefined();
    expect(constants.TRAY_MENU_LABELS).toBeDefined();

    // Проверяем форматирование времени
    expect(timeFormatter.TimeFormatter.formatTimerDisplay(0)).toBe("00:00");
    expect(timeFormatter.TimeFormatter.formatTimerDisplay(60)).toBe("01:00");
  });

  test("should validate data flow between timer and stats concepts", async () => {
    // Проверяем, что типы совместимы для интеграции
    const timerTypes = require("../../src/types/timer");
    const statsTypes = require("../../src/types/stats");

    // Проверяем, что типы таймеров соответствуют типам в статистике
    expect(timerTypes.DEFAULT_DURATIONS).toHaveProperty("work");
    expect(timerTypes.DEFAULT_DURATIONS).toHaveProperty("shortBreak");
    expect(timerTypes.DEFAULT_DURATIONS).toHaveProperty("longBreak");

    // Статистика должна поддерживать те же типы сессий
    expect(statsTypes.DEFAULT_STATS).toHaveProperty("workSessions");
    expect(statsTypes.DEFAULT_STATS).toHaveProperty("shortBreakSessions");
    expect(statsTypes.DEFAULT_STATS).toHaveProperty("longBreakSessions");
  });

  test("should validate settings and timer type compatibility", async () => {
    const settingsTypes = require("../../src/types/settings");
    const timerTypes = require("../../src/types/timer");

    // Проверяем, что настройки содержат продолжительности для всех типов таймеров
    expect(settingsTypes.DEFAULT_SETTINGS).toHaveProperty("workDuration");
    expect(settingsTypes.DEFAULT_SETTINGS).toHaveProperty("shortBreakDuration");
    expect(settingsTypes.DEFAULT_SETTINGS).toHaveProperty("longBreakDuration");

    // Значения в настройках должны соответствовать значениям по умолчанию в типах таймера
    expect(settingsTypes.DEFAULT_SETTINGS.workDuration).toBe(timerTypes.DEFAULT_DURATIONS.work);
    expect(settingsTypes.DEFAULT_SETTINGS.shortBreakDuration).toBe(timerTypes.DEFAULT_DURATIONS.shortBreak);
    expect(settingsTypes.DEFAULT_SETTINGS.longBreakDuration).toBe(timerTypes.DEFAULT_DURATIONS.longBreak);
  });

  test("should validate file paths and constants structure", async () => {
    const constants = require("../../src/utils/constants");

    // Проверяем структуру путей к ресурсам
    expect(constants.ASSETS_PATHS.ICONS).toBeDefined();
    expect(constants.ASSETS_PATHS.SOUNDS).toBeDefined();
    
    // Проверяем конфигурацию окон
    expect(constants.WINDOW_CONFIG.ABOUT).toBeDefined();
    expect(constants.WINDOW_CONFIG.SETTINGS).toBeDefined();
    expect(constants.WINDOW_CONFIG.STATS).toBeDefined();

    // Проверяем метки меню трея
    expect(constants.TRAY_MENU_LABELS.QUIT).toBeDefined();
    expect(constants.TRAY_MENU_LABELS.SETTINGS).toBeDefined();
    expect(constants.TRAY_MENU_LABELS.STATISTICS).toBeDefined();

    // Проверяем интервалы обновления
    expect(constants.UPDATE_INTERVALS.TRAY).toBeDefined();
    expect(typeof constants.UPDATE_INTERVALS.TRAY).toBe("number");
  });

  test("should validate test infrastructure is complete", async () => {
    const fs = require("fs");
    const path = require("path");

    const projectRoot = path.join(__dirname, "../..");
    
    // Проверяем конфигурации тестирования
    expect(fs.existsSync(path.join(projectRoot, "vitest.config.ts"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "playwright.config.ts"))).toBe(true);

    // Проверяем наличие мок-файлов
    expect(fs.existsSync(path.join(projectRoot, "tests/mocks"))).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, "tests/mocks/electronMocks.ts"))).toBe(true);
    
    // Проверяем структуру тестов
    const unitTests = fs.readdirSync(path.join(projectRoot, "tests/unit"));
    const integrationTests = fs.readdirSync(path.join(projectRoot, "tests/integration"));
    
    expect(unitTests.length).toBeGreaterThan(0);
    expect(integrationTests.length).toBeGreaterThan(0);
  });

  test("should validate essential npm scripts work", async () => {
    const fs = require("fs");
    const path = require("path");

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../package.json"), "utf8")
    );

    const scripts = packageJson.scripts;
    
    // Основные команды разработки
    expect(scripts.build).toContain("tsc");
    expect(scripts.start).toContain("npm run build");

    // Команды тестирования
    expect(scripts.test).toBeDefined();
    expect(scripts["test:unit"]).toContain("vitest");
    expect(scripts["test:e2e"]).toContain("playwright");
    expect(scripts["test:integration"]).toContain("playwright");

    // Команды линтинга и форматирования
    expect(scripts.lint).toContain("eslint");
    expect(scripts.format).toContain("prettier");
    expect(scripts["type-check"]).toContain("tsc --noEmit");
  });
});