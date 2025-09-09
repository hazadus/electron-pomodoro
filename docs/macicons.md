# Создание иконок для macOS из PNG файла

Это руководство описывает процесс создания набора иконок `.icns` для macOS приложений из исходного PNG файла.

## Требования

- macOS с установленными инструментами разработчика
- Утилита `sips` (входит в состав macOS)
- Утилита `iconutil` (входит в состав Xcode Command Line Tools)
- Исходный PNG файл высокого разрешения (рекомендуется 1024x1024 или больше)

## Пошаговая инструкция

### 1. Подготовка

Убедитесь, что у вас есть исходный PNG файл. В нашем случае это:
```
assets/images/pomodoro.png
```

### 2. Создание папки iconset

```bash
mkdir -p assets/icons/icon.iconset
```

### 3. Создание всех необходимых размеров

macOS требует следующие размеры иконок:

```bash
# 16x16 пикселей
sips -z 16 16 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_16x16.png

# 32x32 пикселей (для retina 16x16)
sips -z 32 32 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_16x16@2x.png

# 32x32 пикселей
sips -z 32 32 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_32x32.png

# 64x64 пикселей (для retina 32x32)
sips -z 64 64 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_32x32@2x.png

# 128x128 пикселей
sips -z 128 128 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_128x128.png

# 256x256 пикселей (для retina 128x128)
sips -z 256 256 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_128x128@2x.png

# 256x256 пикселей
sips -z 256 256 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_256x256.png

# 512x512 пикселей (для retina 256x256)
sips -z 512 512 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_256x256@2x.png

# 512x512 пикселей
sips -z 512 512 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_512x512.png

# 1024x1024 пикселей (для retina 512x512)
sips -z 1024 1024 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_512x512@2x.png
```

### 4. Создание .icns файла

```bash
iconutil -c icns assets/icons/icon.iconset -o assets/icons/pomodoro.icns
```

### 5. Очистка временных файлов

```bash
rm -rf assets/icons/icon.iconset
```

### 6. Проверка результата

```bash
ls -la assets/icons/pomodoro.icns
```

## Автоматизация

Для удобства можно создать скрипт `scripts/create-icons.sh`:

```bash
#!/bin/bash

# Проверяем наличие исходного файла
if [ ! -f "assets/images/pomodoro.png" ]; then
    echo "Ошибка: файл assets/images/pomodoro.png не найден"
    exit 1
fi

# Создаем папку iconset
mkdir -p assets/icons/icon.iconset

echo "Создание иконок различных размеров..."

# Создаем все размеры
sips -z 16 16 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_16x16.png
sips -z 32 32 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_16x16@2x.png
sips -z 32 32 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_32x32.png
sips -z 64 64 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_32x32@2x.png
sips -z 128 128 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_128x128.png
sips -z 256 256 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_128x128@2x.png
sips -z 256 256 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_256x256.png
sips -z 512 512 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_256x256@2x.png
sips -z 512 512 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_512x512.png
sips -z 1024 1024 assets/images/pomodoro.png --out assets/icons/icon.iconset/icon_512x512@2x.png

echo "Создание .icns файла..."
iconutil -c icns assets/icons/icon.iconset -o assets/icons/pomodoro.icns

echo "Очистка временных файлов..."
rm -rf assets/icons/icon.iconset

echo "Готово! Файл создан: assets/icons/pomodoro.icns"
```

## Использование в Electron

После создания `.icns` файла, обновите конфигурацию в `package.json`:

```json
{
  "config": {
    "forge": {
      "packagerConfig": {
        "icon": "./assets/icons/pomodoro.icns"
      }
    }
  }
}
```

Также обновите скрипт копирования ресурсов:

```json
{
  "scripts": {
    "copy-assets": "mkdir -p dist/assets/icons && cp assets/icons/*.png dist/assets/icons/ && cp assets/icons/*.icns dist/assets/icons/ && ..."
  }
}
```

## Требования к исходному изображению

- **Разрешение**: минимум 1024x1024 пикселей
- **Формат**: PNG с прозрачностью
- **Качество**: векторная графика или высококачественная растровая
- **Дизайн**: учитывайте, что иконка будет масштабироваться до 16x16 пикселей

## Полезные команды

```bash
# Проверить размер .icns файла
ls -lh assets/icons/pomodoro.icns

# Просмотреть содержимое .icns файла
iconutil -l assets/icons/pomodoro.icns

# Извлечь иконки из .icns файла (для отладки)
iconutil -c iconset assets/icons/pomodoro.icns -o debug.iconset
```

## Примечания

- Формат `.icns` является стандартным для macOS приложений
- Retina иконки (@2x) обеспечивают четкое отображение на дисплеях высокого разрешения
- Все размеры важны - macOS использует разные размеры в разных контекстах (Dock, Finder, Spotlight и т.д.)