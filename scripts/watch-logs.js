#!/usr/bin/env node

/**
 * Скрипт для мониторинга логов Pomodoro Timer в реальном времени
 * Отслеживает все файлы логов и выводит новые записи с цветовым кодированием
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

// ANSI цветовые коды для терминала
const colors = {
  red: "\x1b[31m",
  orange: "\x1b[33m",
  yellow: "\x1b[93m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  purple: "\x1b[35m",
  brown: "\x1b[90m",
  gray: "\x1b[90m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

// Цветовая схема для разных файлов логов
const logColors = {
  "main.log": colors.red,
  "timer.log": colors.orange,
  "tray.log": colors.yellow,
  "stats.log": colors.green,
  "settings.log": colors.blue,
  "notification.log": colors.purple,
  "sound.log": colors.brown,
  "performance.log": colors.gray,
  "errors.log": colors.red,
};

// Определение пути к директории логов
function getLogsDirectory() {
  const platform = process.platform;
  let logsDir;

  if (platform === "darwin") {
    logsDir = path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Pomodoro Timer",
      "logs"
    );
  } else if (platform === "win32") {
    logsDir = path.join(
      os.homedir(),
      "AppData",
      "Roaming",
      "Pomodoro Timer",
      "logs"
    );
  } else {
    logsDir = path.join(os.homedir(), ".config", "Pomodoro Timer", "logs");
  }

  return logsDir;
}

// Форматирование временной метки
function formatTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString("ru-RU", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

// Форматирование вывода лога
function formatLogOutput(filename, line) {
  const color = logColors[filename] || colors.gray;
  const timestamp = formatTimestamp();
  const filenamePart = `[${filename}]`.padEnd(18);

  return `${colors.dim}${timestamp}${colors.reset} ${color}${filenamePart}${colors.reset} ${line}`;
}

// Класс для мониторинга одного файла лога
class LogWatcher {
  constructor(filepath) {
    this.filepath = filepath;
    this.filename = path.basename(filepath);
    this.lastSize = 0;
    this.watcher = null;
    this.init();
  }

  init() {
    // Проверяем существование файла и получаем его размер
    if (fs.existsSync(this.filepath)) {
      const stats = fs.statSync(this.filepath);
      this.lastSize = stats.size;
    }

    // Создаем watcher для файла
    this.setupWatcher();
  }

  setupWatcher() {
    try {
      this.watcher = fs.watchFile(
        this.filepath,
        { interval: 100 },
        (curr, prev) => {
          if (curr.mtime > prev.mtime && curr.size > this.lastSize) {
            this.readNewLines(curr.size);
          } else if (curr.size < this.lastSize) {
            // Файл был усечен (возможно, ротация логов)
            this.lastSize = 0;
            this.readNewLines(curr.size);
          }
        }
      );
    } catch (error) {
      console.error(
        `${colors.red}Ошибка создания watcher для ${this.filename}: ${error.message}${colors.reset}`
      );
    }
  }

  readNewLines(newSize) {
    if (!fs.existsSync(this.filepath)) {
      return;
    }

    try {
      const fd = fs.openSync(this.filepath, "r");
      const bufferSize = newSize - this.lastSize;

      if (bufferSize > 0) {
        const buffer = Buffer.alloc(bufferSize);
        fs.readSync(fd, buffer, 0, bufferSize, this.lastSize);
        fs.closeSync(fd);

        const content = buffer.toString("utf8");
        const lines = content.split("\n").filter((line) => line.trim());

        lines.forEach((line) => {
          console.log(formatLogOutput(this.filename, line));
        });
      }

      this.lastSize = newSize;
    } catch (error) {
      console.error(
        `${colors.red}Ошибка чтения файла ${this.filename}: ${error.message}${colors.reset}`
      );
    }
  }

  destroy() {
    if (this.watcher) {
      fs.unwatchFile(this.filepath);
      this.watcher = null;
    }
  }
}

// Главный класс для мониторинга всех логов
class LogsMonitor {
  constructor() {
    this.logsDir = getLogsDirectory();
    this.watchers = new Map();
    this.isRunning = false;
  }

  start() {
    console.log(
      `${colors.bold}🍅 Мониторинг логов Pomodoro Timer${colors.reset}`
    );
    console.log(
      `${colors.dim}Директория логов: ${this.logsDir}${colors.reset}`
    );
    console.log(`${colors.dim}Для остановки нажмите Ctrl+C${colors.reset}\n`);

    // Проверяем существование директории логов
    if (!fs.existsSync(this.logsDir)) {
      console.log(
        `${colors.yellow}⚠️  Директория логов не найдена. Создаю...${colors.reset}`
      );
      try {
        fs.mkdirSync(this.logsDir, { recursive: true });
      } catch (error) {
        console.error(
          `${colors.red}❌ Не удалось создать директорию логов: ${error.message}${colors.reset}`
        );
        process.exit(1);
      }
    }

    this.isRunning = true;
    this.scanLogFiles();
    this.setupDirectoryWatcher();
  }

  scanLogFiles() {
    try {
      const files = fs.readdirSync(this.logsDir);
      const logFiles = files.filter((file) => file.endsWith(".log"));

      logFiles.forEach((filename) => {
        const filepath = path.join(this.logsDir, filename);
        if (!this.watchers.has(filename)) {
          console.log(
            `${colors.green}📁 Найден файл лога: ${filename}${colors.reset}`
          );
          this.watchers.set(filename, new LogWatcher(filepath));
        }
      });

      if (logFiles.length === 0) {
        console.log(
          `${colors.yellow}⏳ Файлы логов не найдены, ожидаю их создания...${colors.reset}`
        );
      }
    } catch (error) {
      console.error(
        `${colors.red}❌ Ошибка сканирования директории логов: ${error.message}${colors.reset}`
      );
    }
  }

  setupDirectoryWatcher() {
    try {
      fs.watch(this.logsDir, (eventType, filename) => {
        if (filename && filename.endsWith(".log")) {
          const filepath = path.join(this.logsDir, filename);

          if (eventType === "rename") {
            if (fs.existsSync(filepath) && !this.watchers.has(filename)) {
              console.log(
                `${colors.green}📄 Новый файл лога: ${filename}${colors.reset}`
              );
              this.watchers.set(filename, new LogWatcher(filepath));
            } else if (
              !fs.existsSync(filepath) &&
              this.watchers.has(filename)
            ) {
              console.log(
                `${colors.yellow}🗑️  Файл лога удален: ${filename}${colors.reset}`
              );
              this.watchers.get(filename).destroy();
              this.watchers.delete(filename);
            }
          }
        }
      });
    } catch (error) {
      console.error(
        `${colors.red}❌ Ошибка создания watcher директории: ${error.message}${colors.reset}`
      );
    }
  }

  stop() {
    if (!this.isRunning) return;

    console.log(
      `\n${colors.yellow}🛑 Остановка мониторинга логов...${colors.reset}`
    );

    this.watchers.forEach((watcher, filename) => {
      watcher.destroy();
    });
    this.watchers.clear();

    this.isRunning = false;
    console.log(`${colors.green}✅ Мониторинг остановлен${colors.reset}`);
  }
}

// Обработчики сигналов для graceful shutdown
function setupSignalHandlers(monitor) {
  const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];

  signals.forEach((signal) => {
    process.on(signal, () => {
      monitor.stop();
      process.exit(0);
    });
  });

  // Обработка необработанных исключений
  process.on("uncaughtException", (error) => {
    console.error(
      `${colors.red}❌ Необработанное исключение: ${error.message}${colors.reset}`
    );
    monitor.stop();
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error(
      `${colors.red}❌ Необработанное отклонение Promise: ${reason}${colors.reset}`
    );
    monitor.stop();
    process.exit(1);
  });
}

// Показать справку
function showHelp() {
  console.log(`${colors.bold}🍅 Мониторинг логов Pomodoro Timer${colors.reset}

${colors.bold}Использование:${colors.reset}
  node scripts/watch-logs.js    Запустить мониторинг логов
  npm run logs                  Альтернативный способ запуска

${colors.bold}Описание:${colors.reset}
  Скрипт отслеживает все файлы логов приложения Pomodoro Timer
  и выводит новые записи в реальном времени с цветовым кодированием.

${colors.bold}Цветовая схема:${colors.reset}
  ${colors.red}main.log${colors.reset}         - основные логи приложения
  ${colors.orange}timer.log${colors.reset}        - логи таймеров
  ${colors.yellow}tray.log${colors.reset}         - логи системного трея
  ${colors.green}stats.log${colors.reset}        - логи статистики
  ${colors.blue}settings.log${colors.reset}     - логи настроек
  ${colors.purple}notification.log${colors.reset} - логи уведомлений
  ${colors.brown}sound.log${colors.reset}        - логи воспроизведения звуков

${colors.bold}Управление:${colors.reset}
  Ctrl+C    Остановить мониторинг
`);
}

// Основная функция
function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  const monitor = new LogsMonitor();
  setupSignalHandlers(monitor);

  try {
    monitor.start();
  } catch (error) {
    console.error(
      `${colors.red}❌ Ошибка запуска мониторинга: ${error.message}${colors.reset}`
    );
    process.exit(1);
  }
}

// Запуск приложения
if (require.main === module) {
  main();
}

module.exports = { LogsMonitor, LogWatcher };
