# Создание иконок для трея macOS

Это руководство описывает процесс создания оптимизированных иконок для системного трея (menu bar) в macOS с использованием встроенной утилиты `sips`.

## Отличия иконок трея от обычных иконок приложений

Иконки системного трея имеют специфические требования:

- **Размер**: 16x16 пикселей для обычных дисплеев, 32x32 для Retina
- **Цвет**: только черный цвет, macOS автоматически инвертирует в светлой/темной теме
- **Template режим**: должны быть помечены как template images
- **Паддинг**: внутренние отступы 2-3 пикселя для соответствия системным иконкам

## Требования

- macOS с установленной утилитой `sips` (входит в состав системы)
- Исходный PNG файл (рекомендуется 22x22 или выше)
- Electron приложение с настроенной поддержкой Retina

## Особенности трей-иконок в macOS

### Template Images

macOS автоматически адаптирует template images под текущую тему:

- **Светлая тема**: черная иконка
- **Темная тема**: белая иконка с полупрозрачностью

### Размеры и масштабирование

- **Стандартные дисплеи**: 16x16 пикселей
- **Retina дисплеи**: 32x32 пикселей (автоматически выбирается macOS)

## Пошаговая инструкция

### 1. Подготовка исходного файла

Убедитесь, что у вас есть исходная иконка. В нашем случае:

```
assets/icons/icon.png (22x22 пикселей)
```

### 2. Создание иконки для обычных дисплеев

```bash
# Создание 16x16 версии для обычных дисплеев
sips -z 16 16 assets/icons/icon.png --out assets/icons/icon-tray.png
```

### 3. Создание Retina версии

```bash
# Создание 32x32 версии для Retina дисплеев
sips -z 32 32 assets/icons/icon.png --out assets/icons/icon-tray@2x.png
```

### 4. Проверка результата

```bash
# Проверить размеры созданных файлов
sips -g pixelWidth -g pixelHeight assets/icons/icon-tray.png
sips -g pixelWidth -g pixelHeight assets/icons/icon-tray@2x.png

# Просмотреть список созданных файлов
ls -la assets/icons/icon-tray*.png
```

## Интеграция с Electron

### 1. Обновление путей в константах

В файле `src/utils/constants.ts`:

```typescript
export const ASSETS_PATHS = {
  ICONS: {
    MAIN: "assets/icons/icon-tray.png", // Обновленный путь
    // ... другие иконки
  },
  // ...
} as const;
```

### 2. Автоматическая поддержка Retina

В `TrayManager.ts` добавьте метод для создания иконки с Retina поддержкой:

```typescript
import { nativeImage, NativeImage } from "electron";
import * as fs from "fs";

private createTrayIcon(): NativeImage {
  const iconPath = path.join(app.getAppPath(), ASSETS_PATHS.ICONS.MAIN);
  const icon = nativeImage.createFromPath(iconPath);

  // Автоматическое добавление Retina версии
  const retinaPath = iconPath.replace('.png', '@2x.png');
  if (fs.existsSync(retinaPath)) {
    try {
      icon.addRepresentation({
        scaleFactor: 2.0,
        buffer: fs.readFileSync(retinaPath)
      });
      console.log("Добавлена Retina версия иконки трея");
    } catch (error) {
      console.warn("Не удалось добавить Retina версию:", error);
    }
  }

  // Включаем template режим для macOS
  if (process.platform === "darwin") {
    icon.setTemplateImage(true);
  }

  return icon;
}
```

### 3. Использование в коде

```typescript
// В методе initialize()
const icon = this.createTrayIcon();
this.tray = new Tray(icon);

// В методе setTrayIcon()
if (visible) {
  const icon = this.createTrayIcon();
  this.tray.setImage(icon);
}
```

## Рекомендации по дизайну

### Цветовая схема

- **Используйте только черный цвет** на прозрачном фоне
- **Избегайте градиентов** и сложных цветовых переходов
- **Не используйте цветные элементы** - они не будут корректно отображаться в template режиме

### Композиция

- **Оставляйте паддинг** 2-3 пикселя со всех сторон
- **Упрощайте детали** при масштабировании до 16x16
- **Делайте контуры четкими** для хорошей читаемости

### Тестирование

- **Проверяйте в светлой и темной теме** macOS
- **Тестируйте на обычных и Retina дисплеях**
- **Сравнивайте с системными иконками** для соответствия стилю

## Полезные команды sips

```bash
# Получить информацию о файле
sips -g all assets/icons/icon.png

# Изменить размер с сохранением пропорций
sips -Z 16 assets/icons/icon.png --out assets/icons/icon-small.png

# Изменить размер до точных размеров (может исказить пропорции)
sips -z 16 16 assets/icons/icon.png --out assets/icons/icon-exact.png

# Конвертировать в другой формат
sips -s format jpeg assets/icons/icon.png --out assets/icons/icon.jpg

# Повернуть изображение
sips -r 90 assets/icons/icon.png

# Изменить качество JPEG (1-100)
sips -s formatOptions 80 assets/icons/icon.jpg
```

## Примеры команд из проекта

В нашем проекте мы использовали следующие команды:

```bash
# Создание основной иконки трея (было 22x22, стало 16x16)
sips -z 16 16 assets/icons/icon.png --out assets/icons/icon-tray.png

# Создание Retina версии
sips -z 32 32 assets/icons/icon.png --out assets/icons/icon-tray@2x.png

# Проверка результата
sips -g pixelWidth -g pixelHeight assets/icons/icon-tray.png
# Результат: pixelWidth: 16, pixelHeight: 16
```

## Интеграция в процесс сборки

Добавьте создание трей-иконок в процесс сборки, обновив `scripts/copy-assets.js`:

```javascript
// Копирование всех иконок включая трей-иконки
const iconFiles = glob.sync("assets/icons/*.png");
iconFiles.forEach((file) => {
  const filename = path.basename(file);
  copyFile(file, `dist/assets/icons/${filename}`);
});
```

Или обновите npm скрипт:

```json
{
  "scripts": {
    "build": "tsc && npm run copy-assets",
    "copy-assets": "scripts/copy-assets.js",
    "create-tray-icons": "scripts/create-tray-icons.sh"
  }
}
```
