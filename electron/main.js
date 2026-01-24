import { app, BrowserWindow, globalShortcut, screen, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let widgetWindow;
let lastAppState = null; // Cache to ensure widget gets data on startup

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0f1117',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    createWidgetWindow(); // Create widget after main window
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (widgetWindow) widgetWindow.close(); // Close widget if main app closes
  });
}

function createWidgetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const widgetWidth = 320;
  const widgetHeight = 50;

  // Position at bottom right with some padding
  const xPos = width - widgetWidth - 24;
  const yPos = height - widgetHeight - 24;

  widgetWindow = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: xPos,
    y: yPos,
    frame: false, // Frameless
    resizable: false, // Keep size fixed
    alwaysOnTop: true,
    transparent: true, // Allow rounded corners if needed via CSS
    skipTaskbar: true, // Don't show in dock/taskbar
    backgroundColor: '#00000000', // Transparent bg for CSS control
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  // Load the separate widget HTML file
  widgetWindow.loadFile(path.join(__dirname, 'widget.html'));

  widgetWindow.once('ready-to-show', () => {
    widgetWindow.showInactive(); // Show without taking focus from main window
    
    // Immediate sync if data exists
    if (lastAppState) {
        widgetWindow.webContents.send('widget-update', lastAppState);
    }
  });
}

// --- IPC COMMUNICATION ---

// 1. React App sends state updates (Time, Timer Status) -> Main -> Widget
ipcMain.on('app-state-update', (event, data) => {
  lastAppState = data; // Cache it
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.webContents.send('widget-update', data);
  }
});

// 2. Widget sends commands (Start Timer, Pause, etc) -> Main -> React App
ipcMain.on('widget-command', (event, command) => {
  if (command.type === 'HIDE_WIDGET') {
     // Handle visual hiding directly in main process
     if (widgetWindow) {
         widgetWindow.hide();
         // Auto-show logic
         if (command.payload) { // Payload acts as minutes in this context
             const minutes = typeof command.payload === 'number' ? command.payload : 0;
             if (minutes > 0) {
                 setTimeout(() => {
                     if(widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.showInactive();
                 }, minutes * 60 * 1000);
             }
         }
     }
  } else {
      // Forward other commands to React App to handle logic
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app-command', command);
      }
  }
});

// 3. React App tells Widget to show up (e.g. toggle button in settings)
ipcMain.on('toggle-widget', () => {
    if (widgetWindow) {
        if (widgetWindow.isVisible()) widgetWindow.hide();
        else {
            widgetWindow.showInactive();
            if (lastAppState) {
                widgetWindow.webContents.send('widget-update', lastAppState);
            }
        }
    } else {
        createWidgetWindow();
    }
});


// --- GLOBAL HOTKEY LOGIC ---
const registerGlobalShortcuts = () => {
  const ret = globalShortcut.register('CommandOrControl+K', () => {
    if (!mainWindow) {
        createWindow();
        return;
    }

    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  if (!ret) {
    console.log('Registration of Global Hotkey failed');
  }
};

app.whenReady().then(() => {
  createWindow();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});