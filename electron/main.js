import { app, BrowserWindow, globalShortcut, screen, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let widgetWindow;

// --- PERSISTENCE CONFIGURATION ---
const DATA_FILE = path.join(app.getPath('userData'), 'user-data.json');

// --- CENTRALIZED TIMER STATE (Single Source of Truth) ---
let timerState = {
    handle: null, // Interval ID (Not saved)
    secondsRemaining: 25 * 60,
    totalDuration: 25 * 60,
    status: 'IDLE', // 'IDLE' | 'RUNNING' | 'PAUSED'
    mode: 'FOCUS_25',
    activeCategory: null, // { id, name, type }
    availableCategories: [], // Cache for widget
    
    // Persistent Data
    totalFocusTime: 0, // Total seconds focused lifetime
    dailyStats: {}, // Format: { "YYYY-MM-DD": seconds }
    lastFocusEndTime: null // Timestamp of when the last FOCUS session ended
};

let autoSaveHandle = null;
let showWidgetTimeout = null;

// --- PERSISTENCE FUNCTIONS ---

function loadUserData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
            const savedData = JSON.parse(rawData);
            
            // Merge saved data into timerState, excluding non-serializable handle
            const { handle, ...dataToRestore } = savedData;
            
            timerState = {
                ...timerState,
                ...dataToRestore
            };
            
            console.log('User data loaded successfully.');
            
            // If timer was running when app closed, resume it
            if (timerState.status === 'RUNNING') {
                resumeTimer();
            }
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
    }
}

function saveUserData() {
    try {
        const { handle, ...dataToSave } = timerState;
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
        console.error('Failed to save user data:', error);
    }
}

function startAutoSave() {
    if (autoSaveHandle) clearInterval(autoSaveHandle);
    // Save every 30 seconds if timer is running
    autoSaveHandle = setInterval(() => {
        if (timerState.status === 'RUNNING') {
            saveUserData();
        }
    }, 30000);
}

// --- WINDOW MANAGEMENT ---

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
    createWidgetWindow();
    broadcastTimerUpdate(); // Send initial state
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (widgetWindow) widgetWindow.close();
  });
}

function createWidgetWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const widgetWidth = 320;
  const widgetHeight = 50;

  const xPos = width - widgetWidth - 24;
  const yPos = height - widgetHeight - 24;

  widgetWindow = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: xPos,
    y: yPos,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: true,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  widgetWindow.loadFile(path.join(__dirname, 'widget.html'));

  widgetWindow.once('ready-to-show', () => {
    widgetWindow.showInactive();
    broadcastTimerUpdate(); // Send initial state
  });
}

// --- TIMER LOGIC ---

function getTodayStr() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
}

function broadcastTimerUpdate() {
    const payload = {
        secondsRemaining: timerState.secondsRemaining,
        totalDuration: timerState.totalDuration,
        status: timerState.status,
        mode: timerState.mode,
        activeCategory: timerState.activeCategory,
        availableCategories: timerState.availableCategories,
        totalFocusTime: timerState.totalFocusTime,
        lastFocusEndTime: timerState.lastFocusEndTime
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('timer-update', payload);
    }
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.webContents.send('timer-update', payload);
    }
}

function stopTimer() {
    if (timerState.handle) {
        clearInterval(timerState.handle);
        timerState.handle = null;
    }
    
    // Calculate elapsed time (how much work was done before stopping)
    const elapsedSeconds = timerState.totalDuration - timerState.secondsRemaining;
    
    // If user focused for at least 60 seconds, create a record
    if (timerState.status !== 'IDLE' && elapsedSeconds >= 60) {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('timer-complete', {
                mode: timerState.mode,
                duration: elapsedSeconds / 60
            });
        }
    }

    // Update last focus time if we were in a focus mode
    if (timerState.mode.includes('FOCUS')) {
        timerState.lastFocusEndTime = Date.now();
    }

    timerState.status = 'IDLE';
    // Reset to full duration of current mode
    timerState.secondsRemaining = timerState.totalDuration;
    
    broadcastTimerUpdate();
    saveUserData(); // Save immediately on stop
}

function startTimer(durationMinutes, mode) {
    if (timerState.handle) clearInterval(timerState.handle);
    
    // Update State
    if (durationMinutes) {
        timerState.totalDuration = durationMinutes * 60;
        timerState.secondsRemaining = durationMinutes * 60;
    }
    if (mode) timerState.mode = mode;
    
    timerState.status = 'RUNNING';
    
    broadcastTimerUpdate();
    saveUserData(); // Save state immediately

    // Start Interval
    timerState.handle = setInterval(() => {
        timerState.secondsRemaining--;

        // Track Statistics (Only for Focus modes, not breaks)
        if (timerState.mode.includes('FOCUS')) {
            timerState.totalFocusTime++;
            const today = getTodayStr();
            timerState.dailyStats[today] = (timerState.dailyStats[today] || 0) + 1;
        }

        if (timerState.secondsRemaining <= 0) {
            // Timer Complete
            clearInterval(timerState.handle);
            timerState.handle = null;
            timerState.status = 'IDLE';
            timerState.secondsRemaining = 0;

            if (timerState.mode.includes('FOCUS')) {
                timerState.lastFocusEndTime = Date.now();
            }
            
            saveUserData();
            broadcastTimerUpdate();
            
            // Notify Main Window to save session
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('timer-complete', {
                    mode: timerState.mode,
                    duration: timerState.totalDuration / 60
                });
            }
        } else {
            broadcastTimerUpdate();
        }
    }, 1000);
}

function pauseTimer() {
    if (timerState.handle) {
        clearInterval(timerState.handle);
        timerState.handle = null;
    }
    timerState.status = 'PAUSED';
    broadcastTimerUpdate();
    saveUserData();
}

function resumeTimer() {
    if (timerState.status === 'PAUSED' || timerState.status === 'RUNNING') {
        if (timerState.handle) clearInterval(timerState.handle);

        timerState.status = 'RUNNING';
        broadcastTimerUpdate();
        
        timerState.handle = setInterval(() => {
            timerState.secondsRemaining--;
            
            // Track Statistics
            if (timerState.mode.includes('FOCUS')) {
                timerState.totalFocusTime++;
                const today = getTodayStr();
                timerState.dailyStats[today] = (timerState.dailyStats[today] || 0) + 1;
            }

            if (timerState.secondsRemaining <= 0) {
                 clearInterval(timerState.handle);
                 timerState.handle = null;
                 timerState.status = 'IDLE';
                 timerState.secondsRemaining = 0;

                 if (timerState.mode.includes('FOCUS')) {
                    timerState.lastFocusEndTime = Date.now();
                 }
                 
                 saveUserData();
                 broadcastTimerUpdate();
                 
                 if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('timer-complete', {
                        mode: timerState.mode,
                        duration: timerState.totalDuration / 60
                    });
                 }
            } else {
                broadcastTimerUpdate();
            }
        }, 1000);
    }
}

// --- IPC HANDLERS ---

ipcMain.on('timer-command', (event, cmd) => {
    switch (cmd.type) {
        case 'START':
            startTimer(cmd.payload.minutes, cmd.payload.mode);
            break;
        case 'STOP':
            stopTimer();
            break;
        case 'PAUSE':
            pauseTimer();
            break;
        case 'RESUME':
            resumeTimer();
            break;
        case 'SET_CATEGORY':
            // Update active category
            const catId = cmd.payload;
            const cat = timerState.availableCategories.find(c => c.id === catId);
            if (cat) {
                timerState.activeCategory = cat;
                broadcastTimerUpdate();
                saveUserData();
            }
            break;
        case 'SYNC_CATEGORIES':
            // React app sends list of categories to cache for widget
            timerState.availableCategories = cmd.payload.categories || [];
            if (cmd.payload.activeCategory) {
                timerState.activeCategory = cmd.payload.activeCategory;
            }
            broadcastTimerUpdate();
            break;
    }
});

// Widget visibility commands
ipcMain.on('widget-command', (event, command) => {
    if (command.type === 'HIDE_WIDGET') {
        if (widgetWindow) widgetWindow.hide();
        
        // Handle "Hide for X minutes" logic
        if (command.payload && typeof command.payload === 'number') {
            if (showWidgetTimeout) clearTimeout(showWidgetTimeout);
            
            showWidgetTimeout = setTimeout(() => {
                if (widgetWindow && !widgetWindow.isDestroyed()) {
                    widgetWindow.showInactive();
                    broadcastTimerUpdate();
                }
            }, command.payload * 60 * 1000); // payload is in minutes
        }

    } else {
        // Forward timer commands from widget to the logic above
        if (command.type === 'START_FOCUS') startTimer(command.payload, command.payload === 50 ? 'FOCUS_50' : 'FOCUS_25');
        else if (command.type === 'START_BREAK') startTimer(command.payload, command.payload === 10 ? 'BREAK_10' : 'BREAK_5');
        else if (command.type === 'STOP_TIMER') stopTimer();
        else if (command.type === 'SET_CATEGORY') {
             const cat = timerState.availableCategories.find(c => c.id === command.payload);
             if (cat) {
                 timerState.activeCategory = cat;
                 broadcastTimerUpdate();
                 saveUserData();
             }
        }
    }
});

ipcMain.on('toggle-widget', () => {
    if (widgetWindow) {
        if (widgetWindow.isVisible()) widgetWindow.hide();
        else {
            widgetWindow.showInactive();
            broadcastTimerUpdate();
        }
    } else {
        createWidgetWindow();
    }
});

ipcMain.on('widget-resize', (event, { width, height, align }) => {
    if (!widgetWindow || widgetWindow.isDestroyed()) return;
    const bounds = widgetWindow.getBounds();
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

    let newWidth = bounds.width;
    let newHeight = bounds.height;
    let newX = bounds.x;
    let newY = bounds.y;

    // Handle Width Resize
    if (width && width !== bounds.width) {
        newWidth = width;
        // Keep right alignment
        newX = screenWidth - newWidth - 24;
    }

    // Handle Height Resize
    if (height && height !== bounds.height) {
        newHeight = height;
        
        if (align === 'top') {
            // Keep top Y constant, let it grow downwards
            newY = bounds.y;
        } else {
            // Default: Keep bottom alignment (grows upwards)
            const bottomY = bounds.y + bounds.height;
            newY = bottomY - newHeight;
        }
    }

    widgetWindow.setBounds({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
    });
});

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
};

app.whenReady().then(() => {
  loadUserData(); // LOAD
  startAutoSave(); // AUTO-SAVE
  
  createWindow();
  registerGlobalShortcuts();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  saveUserData(); // SAVE
  globalShortcut.unregisterAll();
  if (autoSaveHandle) clearInterval(autoSaveHandle);
  if (showWidgetTimeout) clearTimeout(showWidgetTimeout);
});

app.on('window-all-closed', () => {
  saveUserData(); // SAVE
  if (process.platform !== 'darwin') app.quit();
});