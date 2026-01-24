import { app, BrowserWindow, globalShortcut, screen } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  // Get primary display size
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0f1117', // Match your app background
    titleBarStyle: 'hiddenInset', // Native-looking header on Mac
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false, // Don't show until ready
  });

  // Load the React App
  // In dev, we wait for localhost:3000 (handled by 'wait-on' in package.json)
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when content is ready to prevent white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle closing (Mac behavior: keep app running)
  mainWindow.on('closed', () => (mainWindow = null));
}

// --- GLOBAL HOTKEY LOGIC ---
const registerGlobalShortcuts = () => {
  // Register Cmd+K (Mac) or Ctrl+K (Windows)
  const ret = globalShortcut.register('CommandOrControl+K', () => {
    if (!mainWindow) {
        createWindow();
        return;
    }

    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      // If visible and focused, hide it (Rize.io style toggle)
      mainWindow.hide();
    } else {
      // If hidden or background, bring to front
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
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});