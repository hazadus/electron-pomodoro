# Создание иконок для Windows

Для полноценной кроссплатформенной сборки необходимо создать иконку формата .ico для Windows.

## Способы создания .ico файла:

1. **Онлайн конвертеры:**
   - https://convertio.co/png-ico/
   - https://www.icoconverter.com/

2. **С помощью ImageMagick (если установлен):**
   ```bash
   # Установка на macOS
   brew install imagemagick
   
   # Создание .ico файла из PNG
   convert assets/icons/icon.png -resize 256x256 assets/icons/icon.ico
   ```

3. **Использование существующей PNG иконки:**
   Electron Forge может использовать PNG файлы для Windows, но .ico файл предпочтительнее.

## Текущая конфигурация:

- Путь к иконке в package.json: `"./assets/icons/icon"`
- Electron Forge автоматически найдет подходящий формат:
  - macOS: `icon.icns`
  - Windows: `icon.ico` (или `icon.png`)
  - Linux: `icon.png`

## TODO:
Создать файл `assets/icons/icon.ico` из `assets/icons/icon.png` для улучшения внешнего вида приложения в Windows.