

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

// --- OPTIMIZATION STATE ---
// Track what we sent last time to avoid sending duplicate heavy objects over IPC
let lastSentCategoriesHash = '';
let lastSentActiveCategoryHash = '';

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
    icon: path.join(__dirname, '../public/icon.png'),
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0f1117',
    titleBarStyle: 'hidden', // Hides title bar but keeps traffic lights on macOS (optional)
    frame: false, // REMOVES Frame (Windows/Linux)
    autoHideMenuBar: true, // REMOVES Menu Bar
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
    broadcastTimerUpdate(true); // Force full update
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
  // Position at TOP Right so dropdown menu can flow downwards
  const yPos = 24; 

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
    broadcastTimerUpdate(true); // Force full update
  });
}

// --- TIMER LOGIC ---

function getTodayStr() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
}

/**
 * Optimized Broadcast
 * @param {boolean} force - If true, sends all data regardless of change detection
 */
function broadcastTimerUpdate(force = false) {
    const today = getTodayStr();
    const todayFocusTime = timerState.dailyStats[today] || 0;

    // 1. Prepare Lightweight Payload (Always Sent)
    const payload = {
        secondsRemaining: timerState.secondsRemaining,
        totalDuration: timerState.totalDuration,
        status: timerState.status,
        mode: timerState.mode,
        totalFocusTime: timerState.totalFocusTime,
        lastFocusEndTime: timerState.lastFocusEndTime,
        todayFocusTime: todayFocusTime
    };

    // 2. Prepare Heavyweight Data (Conditional Send)
    // We use JSON stringify to detect deep changes efficiently for this scale of data
    const currentCategoriesHash = JSON.stringify(timerState.availableCategories);
    const currentActiveCategoryHash = JSON.stringify(timerState.activeCategory);

    let hasHeavyChanges = false;

    if (force || currentCategoriesHash !== lastSentCategoriesHash) {
        payload.availableCategories = timerState.availableCategories;
        lastSentCategoriesHash = currentCategoriesHash;
        hasHeavyChanges = true;
    }

    if (force || currentActiveCategoryHash !== lastSentActiveCategoryHash) {
        payload.activeCategory = timerState.activeCategory;
        lastSentActiveCategoryHash = currentActiveCategoryHash;
        hasHeavyChanges = true;
    }

    // 3. Send to Windows
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
    
    broadcastTimerUpdate(true); // State change often implies full refresh need
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
    
    broadcastTimerUpdate(true);
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
            broadcastTimerUpdate(true);
            
            // Notify Main Window to save session
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('timer-complete', {
                    mode: timerState.mode,
                    duration: timerState.totalDuration / 60
                });
            }
        } else {
            // Standard Tick - pass false to avoid re-sending categories
            broadcastTimerUpdate(false);
        }
    }, 1000);
}

function pauseTimer() {
    if (timerState.handle) {
        clearInterval(timerState.handle);
        timerState.handle = null;
    }
    timerState.status = 'PAUSED';
    broadcastTimerUpdate(true);
    saveUserData();
}

function resumeTimer() {
    if (timerState.status === 'PAUSED' || timerState.status === 'RUNNING') {
        if (timerState.handle) clearInterval(timerState.handle);

        timerState.status = 'RUNNING';
        broadcastTimerUpdate(true);
        
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
                 broadcastTimerUpdate(true);
                 
                 if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('timer-complete', {
                        mode: timerState.mode,
                        duration: timerState.totalDuration / 60
                    });
                 }
            } else {
                broadcastTimerUpdate(false);
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
                broadcastTimerUpdate(true);
                saveUserData();
            }
            break;
        case 'SYNC_CATEGORIES':
            // React app sends list of categories to cache for widget
            const newCats = cmd.payload.categories || [];
            const newActive = cmd.payload.activeCategory;
            
            let hasChanged = false;

            // Update Categories List
            if (JSON.stringify(newCats) !== JSON.stringify(timerState.availableCategories)) {
                timerState.availableCategories = newCats;
                hasChanged = true;
                
                // AUTO-UPDATE ACTIVE CATEGORY if details changed (e.g. rename)
                if (timerState.activeCategory) {
                    const found = newCats.find(c => c.id === timerState.activeCategory.id);
                    if (found && JSON.stringify(found) !== JSON.stringify(timerState.activeCategory)) {
                        timerState.activeCategory = found;
                        // hasChanged is already true
                    }
                }
            }
            
            // Update Active Category from Payload (if explicit)
            if (newActive && JSON.stringify(newActive) !== JSON.stringify(timerState.activeCategory)) {
                timerState.activeCategory = newActive;
                hasChanged = true;
            }

            if (hasChanged) {
                broadcastTimerUpdate(true); // Force update to sync widget
            }
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
                    broadcastTimerUpdate(true);
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
                 broadcastTimerUpdate(true);
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
            broadcastTimerUpdate(true);
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

// --- NEW WINDOW CONTROLS ---
ipcMain.on('window-control', (event, command) => {
    if (!mainWindow) return;
    switch (command) {
        case 'minimize':
            mainWindow.minimize();
            break;
        case 'maximize':
            if (mainWindow.isMaximized()) mainWindow.unmaximize();
            else mainWindow.maximize();
            break;
        case 'close':
            mainWindow.close();
            break;
    }
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
