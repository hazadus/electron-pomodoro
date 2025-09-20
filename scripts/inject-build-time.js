#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Скрипт для внедрения времени сборки в приложение.
 * Генерирует buildinfo.json с информацией о времени сборки.
 */

function createBuildInfo() {
  try {
    // Читаем версию из package.json
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Создаем объект с информацией о сборке
    const buildInfo = {
      version: packageData.version,
      buildTime: new Date().toISOString(),
      buildTimestamp: Date.now(),
      // Добавляем информацию о среде сборки, если доступна
      environment: process.env.NODE_ENV || 'development',
      // GitHub Actions информация
      gitRef: process.env.GITHUB_REF || 'unknown',
      gitSha: process.env.GITHUB_SHA || 'unknown',
      runId: process.env.GITHUB_RUN_ID || 'unknown'
    };

    // Путь для сохранения файла
    const outputPath = path.join(__dirname, '..', 'buildinfo.json');

    // Записываем файл с красивым форматированием
    fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2), 'utf8');

    console.log('Build info generated successfully:');
    console.log(`Version: ${buildInfo.version}`);
    console.log(`Build time: ${buildInfo.buildTime}`);
    console.log(`Environment: ${buildInfo.environment}`);
    console.log(`Output: ${outputPath}`);

  } catch (error) {
    console.error('Error generating build info:', error.message);
    process.exit(1);
  }
}

// Запускаем генерацию
createBuildInfo();