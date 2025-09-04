import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import * as path from 'path';

let tray: Tray | null = null;
let aboutWindow: BrowserWindow | null = null;

// Предотвращаем закрытие приложения при закрытии всех окон
app.on('window-all-closed', () => {
  // На macOS приложения обычно остаются активными даже когда все окна закрыты
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Функция создания окна "О программе"
function createAboutWindow(): void {
  if (aboutWindow) {
    aboutWindow.show();
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 400,
    height: 300,
    title: 'О программе',
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  aboutWindow.loadFile(path.join(__dirname, 'about.html'));

  // Убираем меню в окне (только для Windows/Linux)
  aboutWindow.setMenu(null);

  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });
}

// Функция создания системного трея
function createTray(): void {
  // Загружаем иконку
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  
  // Создаём трей
  tray = new Tray(icon);
  
  // Устанавливаем подсказку
  tray.setToolTip('My Tray App');
  
  // Создаём контекстное меню
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'О программе',
      click: () => {
        createAboutWindow();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Выход',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  // Устанавливаем меню для трея
  tray.setContextMenu(contextMenu);
  
  // На macOS клик по иконке обычно открывает меню
  tray.on('click', () => {
    tray?.popUpContextMenu();
  });
}

// Когда приложение готово
app.whenReady().then(() => {
  // Скрываем иконку из дока на macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide();
  }
  
  createTray();
});

// Обрабатываем событие активации (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createAboutWindow();
  }
});

// Предотвращаем выход при закрытии окна на macOS
app.on('before-quit', () => {
  // Очищаем трей перед выходом
  if (tray) {
    tray.destroy();
  }
});