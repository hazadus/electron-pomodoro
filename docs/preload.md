## Что такое preload скрипт?

Preload скрипт - это файл, который выполняется в рендер-процессе (в окне браузера) **ДО** загрузки веб-страницы, но имеет доступ как к Node.js API, так и к Web API. Он служит "мостом" между главным процессом и рендер-процессом.

## Зачем он нужен?

### 1. **Безопасность (главная причина)**

По умолчанию веб-страницы в Electron могут иметь полный доступ к Node.js, что создаёт огромную дыру в безопасности. Представьте, что ваше приложение загружает внешний контент или у вас есть XSS уязвимость - злоумышленник получит полный доступ к файловой системе!

```typescript
// БЕЗ preload (ОПАСНО! ❌)
// В about.html можно было бы написать:
const fs = require('fs');
fs.readFileSync('/etc/passwd'); // Доступ к любым файлам!
```

### 2. **Context Isolation (изоляция контекста)**

Современный Electron использует изоляцию контекста, которая полностью разделяет JavaScript контексты:

```typescript
// В main.ts
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,  // Включена изоляция
    nodeIntegration: false,   // Node.js API отключён
    preload: path.join(__dirname, 'preload.js')
  }
});
```

## Как работает preload?

Preload скрипт создаёт безопасный "мост" через `contextBridge`:

```typescript
// preload.ts - расширенный пример
import { contextBridge, ipcRenderer } from 'electron';
import * as os from 'os';

// Создаём безопасный API
contextBridge.exposeInMainWorld('electronAPI', {
  // Безопасные данные только для чтения
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron
  },
  
  // Безопасные функции
  getSystemInfo: () => ({
    hostname: os.hostname(),
    memory: os.totalmem(),
    cpus: os.cpus().length
  }),
  
  // Безопасная коммуникация с главным процессом
  sendMessage: (channel: string, data: any) => {
    // Белый список разрешённых каналов
    const validChannels = ['close-about', 'minimize-window'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Безопасное получение данных
  onUpdateAvailable: (callback: Function) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  }
});
```

Теперь в HTML можно безопасно использовать:

```html
<script>
  // ✅ Безопасно - доступ только к тому, что мы явно разрешили
  console.log(window.electronAPI.platform);
  
  const info = window.electronAPI.getSystemInfo();
  console.log(`Система: ${info.hostname}, RAM: ${info.memory}`);
  
  // ❌ Не работает - нет доступа к Node.js
  // const fs = require('fs'); // Ошибка!
</script>
```

## Практические примеры использования

### Пример 1: Работа с файлами

```typescript
// preload.ts
contextBridge.exposeInMainWorld('fileAPI', {
  // Безопасное чтение только определённых файлов
  readConfig: async () => {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    try {
      const data = await fs.promises.readFile(configPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  },
  
  // Безопасное сохранение с валидацией
  saveConfig: async (config: any) => {
    // Валидация данных
    if (typeof config !== 'object') return false;
    
    const configPath = path.join(app.getPath('userData'), 'config.json');
    await fs.promises.writeFile(configPath, JSON.stringify(config));
    return true;
  }
});
```

### Пример 2: IPC коммуникация

```typescript
// preload.ts
contextBridge.exposeInMainWorld('ipc', {
  // Отправка сообщений главному процессу
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  
  // Получение данных с callback
  onThemeChange: (callback: (theme: string) => void) => {
    ipcRenderer.on('theme-changed', (event, theme) => callback(theme));
  },
  
  // Двусторонняя коммуникация с Promise
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings)
});
```

### Пример 3: Системная информация

```typescript
// preload.ts
import * as os from 'os';
import * as path from 'path';

contextBridge.exposeInMainWorld('system', {
  // Только безопасная информация
  info: {
    homeDir: os.homedir(),
    tempDir: os.tmpdir(),
    platform: os.platform(),
    arch: os.arch()
  },
  
  // Безопасные пути
  paths: {
    downloads: app.getPath('downloads'),
    documents: app.getPath('documents'),
    userData: app.getPath('userData')
  }
});
```

## Что НЕ нужно делать в preload

```typescript
// ❌ ПЛОХО - даём слишком много доступа
contextBridge.exposeInMainWorld('bad', {
  fs: require('fs'),  // Никогда не передавайте целые модули!
  exec: require('child_process').exec,  // Опасно!
  eval: (code: string) => eval(code)  // Катастрофа!
});

// ❌ ПЛОХО - нет валидации
contextBridge.exposeInMainWorld('unsafe', {
  runCommand: (cmd: string) => {
    // Выполняет любую команду без проверки
    require('child_process').exec(cmd);
  }
});
```

## Правила безопасности

1. **Минимальные привилегии**: Предоставляйте только необходимый минимум функций
2. **Валидация всего**: Проверяйте все входные данные
3. **Белые списки**: Используйте списки разрешённых значений
4. **Никаких прямых модулей**: Не передавайте целые Node.js модули
5. **Односторонние данные**: По возможности делайте данные только для чтения

## Итог

Preload скрипт - это ваш "охранник безопасности", который:
- Защищает от XSS и других веб-уязвимостей
- Контролирует, какие API доступны веб-странице
- Обеспечивает безопасную коммуникацию между процессами
- Позволяет использовать Node.js функции безопасным способом

Без preload скрипта ваше Electron приложение либо будет небезопасным (с nodeIntegration: true), либо не сможет использовать возможности системы вообще. Preload - это золотая середина между функциональностью и безопасностью!