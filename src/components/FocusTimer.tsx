import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, ChevronDown, Coffee, Brain, Battery, Plus, Trash2, X, Check, Loader2, Zap, Save, RefreshCw, Maximize2, Minimize2, Monitor } from 'lucide-react';
import { TimerState, CategoryType, Category, TimeBlock } from '../types';
import { addCategory, deleteCategory, addTimeBlock } from '../services/api'; // Removed getCategories
import { useAuth } from '../context/AuthContext';
import { getTotalProductiveMinutes } from '../utils/analytics';

type TimerVariant = 'FOCUS_25' | 'FOCUS_50' | 'BREAK_5' | 'BREAK_10';

const MODES: Record<TimerVariant, { label: string; minutes: number; color: string; bg: string; icon: any }> = {
  FOCUS_25: { label: 'Focus', minutes: 25, color: 'text-accent-focus', bg: 'bg-accent-focus', icon: Brain },
  FOCUS_50: { label: 'Deep Focus', minutes: 50, color: 'text-accent-focus', bg: 'bg-accent-focus', icon: Brain },
  BREAK_5: { label: 'Short Break', minutes: 5, color: 'text-accent-break', bg: 'bg-accent-break', icon: Coffee },
  BREAK_10: { label: 'Long Break', minutes: 10, color: 'text-accent-break', bg: 'bg-accent-break', icon: Battery },
};

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

interface FocusTimerProps {
    onTimerComplete?: (block?: TimeBlock) => void;
    isDevMode?: boolean;
    categories: Category[]; // Receive from App
    onCategoryChange?: () => void; // Trigger refresh in parent
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ 
    onTimerComplete, 
    isDevMode = false,
    categories,
    onCategoryChange
}) => {
  const { user } = useAuth();
  
  // State
  const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
  const [mode, setMode] = useState<TimerVariant>('FOCUS_25');
  const [timeLeft, setTimeLeft] = useState(MODES.FOCUS_25.minutes * 60);
  const [todaysProductiveMinutes, setTodaysProductiveMinutes] = useState(0);
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);
  
  // Active Category State
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('focus');

  // View State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullScreenRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Memory State
  const [lastFocusMode, setLastFocusMode] = useState<TimerVariant>('FOCUS_25');
  const [lastBreakMode, setLastBreakMode] = useState<TimerVariant>('BREAK_5');

  const isFocus = mode.startsWith('FOCUS');
  const isTimerActive = timerState !== TimerState.IDLE;

  // Refs for Event Listener Access
  const stateRef = useRef({
      timerState,
      mode,
      timeLeft,
      activeCategory,
      categories,
      user
  });

  // Update ref whenever state changes
  useEffect(() => {
      stateRef.current = { timerState, mode, timeLeft, activeCategory, categories, user };
  }, [timerState, mode, timeLeft, activeCategory, categories, user]);

  // Initialize Active Category when categories load
  useEffect(() => {
      if (categories.length > 0) {
          // If no active category, or current one is not in list, set to first
          if (!activeCategory || !categories.find(c => c.id === activeCategory.id)) {
              setActiveCategory(categories[0]);
          }
      } else {
          setActiveCategory(null);
      }
  }, [categories]); // Only run when categories prop updates

  // Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        fullScreenRef.current?.requestFullscreen().catch((err) => {
             console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  // --- HELPER FUNCTIONS ---

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const showFeedback = (msg: string) => {
      setLastSavedMessage(msg);
      setTimeout(() => setLastSavedMessage(null), 3000);
  };

  const getCurrentTimeStr = (date: Date) => {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getLocalDateStr = (date: Date) => {
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset*60*1000));
      return localDate.toISOString().split('T')[0];
  };

  const saveSession = async (actualMinutes?: number) => {
    const { mode: currentMode, activeCategory: currentCat, user: currentUser } = stateRef.current;
    
    const now = new Date();
    const rawMinutes = actualMinutes ?? MODES[currentMode].minutes;
    const durationMinutes = Math.max(1, Math.round(rawMinutes));
    
    if (durationMinutes < 1) return;

    const startDate = new Date(now.getTime() - durationMinutes * 60000);
    const isModeFocus = currentMode.startsWith('FOCUS');

    let categoryId = 'custom';
    let type: CategoryType = isModeFocus ? 'focus' : 'break';
    let title = MODES[currentMode].label;

    if (isModeFocus && currentCat) {
        categoryId = currentCat.id;
        title = currentCat.name;
        type = currentCat.type;
    }

    const newBlock: TimeBlock = {
        id: generateUUID(),
        title: title,
        app: 'Timer',
        startTime: getCurrentTimeStr(startDate),
        endTime: getCurrentTimeStr(now),
        durationMinutes: durationMinutes,
        type: type,
        categoryId: categoryId,
        isPlanned: false, 
        date: getLocalDateStr(now) 
    };

    if (type !== 'break') {
        setTodaysProductiveMinutes(prev => prev + durationMinutes);
    }

    if (currentUser?.isGuest) {
        showFeedback(`Saved ${durationMinutes}m (Guest)`);
        if (onTimerComplete) onTimerComplete(newBlock);
        return;
    }

    try {
        await addTimeBlock(newBlock, false);
        showFeedback(`Saved ${durationMinutes}m session`);
        if (onTimerComplete) onTimerComplete();
    } catch (error) {
        console.error("Failed to save timer session", error);
        showFeedback("Failed to save session");
    }
  };

  const handleSimulateSession = async () => {
    const now = new Date();
    const durationMinutes = 25;
    const startDate = new Date(now.getTime() - durationMinutes * 60000);
    
    let categoryId = 'custom';
    let type: CategoryType = 'focus';
    let title = 'Simulated Focus';

    if (activeCategory) {
        categoryId = activeCategory.id;
        title = activeCategory.name;
        type = activeCategory.type;
    }

    const newBlock: TimeBlock = {
        id: generateUUID(), 
        title: title,
        app: 'Dev Simulation',
        startTime: getCurrentTimeStr(startDate),
        endTime: getCurrentTimeStr(now),
        durationMinutes: durationMinutes,
        type: type,
        categoryId: categoryId,
        isPlanned: false, 
        date: getLocalDateStr(now)
    };

    if (user?.isGuest) {
        showFeedback("Simulated 25m (Guest)");
        if (onTimerComplete) onTimerComplete(newBlock);
        return;
    }

    try {
        await addTimeBlock(newBlock, false);
        showFeedback("Simulated 25m Saved");
        if (onTimerComplete) onTimerComplete();
    } catch (error) {
        console.error("Failed to save simulated session", error);
    }
  };

  const handleStop = () => {
    const { mode: currentMode, timeLeft: currentTimeLeft } = stateRef.current;
    const totalSeconds = MODES[currentMode].minutes * 60;
    const elapsedSeconds = totalSeconds - currentTimeLeft;
    
    setTimerState(TimerState.IDLE);
    setTimeLeft(MODES[currentMode].minutes * 60);

    if (elapsedSeconds >= 59) {
        const minutes = elapsedSeconds / 60;
        saveSession(minutes);
    }
  };

  // --- WIDGET INTEGRATION ---

  // 1. Listen for Commands (Once on mount)
  useEffect(() => {
    if (!(window as any).electron) return;

    const handleCommand = (command: any) => {
        console.log("Received widget command:", command);
        const currentState = stateRef.current;

        if (command.type === 'START_FOCUS') {
            const duration = command.payload; 
            const newMode: TimerVariant = duration === 50 ? 'FOCUS_50' : 'FOCUS_25';
            setMode(newMode);
            setLastFocusMode(newMode);
            setTimeLeft(duration * 60);
            setTimerState(TimerState.RUNNING);
        }
        else if (command.type === 'START_BREAK') {
            const duration = command.payload;
            const newMode: TimerVariant = duration === 10 ? 'BREAK_10' : 'BREAK_5';
            setMode(newMode);
            setLastBreakMode(newMode);
            setTimeLeft(duration * 60);
            setTimerState(TimerState.RUNNING);
        }
        else if (command.type === 'STOP_TIMER') {
            handleStop(); 
        }
        else if (command.type === 'SET_CATEGORY') {
            const catId = command.payload;
            const cat = currentState.categories.find(c => c.id === catId);
            if (cat) {
                setActiveCategory(cat);
                showFeedback(`Category: ${cat.name}`);
            }
        }
    };

    const listenerId = (window as any).electron.receive('app-command', handleCommand);

    return () => {
        if ((window as any).electron.removeListener) {
            (window as any).electron.removeListener(listenerId);
        }
    };
  }, []); // Run ONCE

  // 2. Send Updates to Widget
  useEffect(() => {
    if ((window as any).electron) {
        const payload = {
            timerState,
            timeLeft,
            totalDuration: MODES[mode].minutes,
            totalProductiveMinutes: todaysProductiveMinutes,
            activeCategoryName: activeCategory?.name || 'No Category',
            activeCategoryId: activeCategory?.id || '',
            availableCategories: categories.map(c => ({ id: c.id, name: c.name, type: c.type }))
        };
        (window as any).electron.send('app-state-update', payload);
    }
  }, [timeLeft, timerState, mode, todaysProductiveMinutes, activeCategory, categories]);

  // --- TIMER TICK ---

  useEffect(() => {
    if (timerState === TimerState.RUNNING) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { 
            clearInterval(timerRef.current!);
            setTimerState(TimerState.IDLE);
            saveSession(); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerState]); 

  // --- UI HANDLERS ---

  const switchTab = (tab: 'FOCUS' | 'BREAK') => {
    if (isTimerActive) return;
    const newMode: TimerVariant = tab === 'FOCUS' ? lastFocusMode : lastBreakMode;
    setMode(newMode);
    setTimerState(TimerState.IDLE);
    setTimeLeft(MODES[newMode].minutes * 60);
  };

  const toggleDuration = () => {
      if (isTimerActive) return;
      let newMode: TimerVariant = mode;
      if (mode === 'FOCUS_25') newMode = 'FOCUS_50';
      else if (mode === 'FOCUS_50') newMode = 'FOCUS_25';
      else if (mode === 'BREAK_5') newMode = 'BREAK_10';
      else if (mode === 'BREAK_10') newMode = 'BREAK_5';
      
      setMode(newMode);
      if (newMode.startsWith('FOCUS')) setLastFocusMode(newMode);
      else setLastBreakMode(newMode);
      
      setTimerState(TimerState.IDLE);
      setTimeLeft(MODES[newMode].minutes * 60);
  };

  const handleMainAction = () => {
      if (timerState === TimerState.IDLE) setTimerState(TimerState.RUNNING);
      else handleStop();
  };

  const toggleTimerPause = () => {
      if (timerState === TimerState.RUNNING) setTimerState(TimerState.PAUSED);
      else if (timerState === TimerState.PAUSED) setTimerState(TimerState.RUNNING);
  };

  const handleAddCategory = async () => {
    if (newCategoryTitle.trim()) {
        const titleToAdd = newCategoryTitle.trim();
        const typeToAdd = newCategoryType;
        
        try {
            if (user?.isGuest) {
                // Mock local addition
            } else {
                await addCategory(titleToAdd, typeToAdd);
            }
            if (onCategoryChange) onCategoryChange();
            setNewCategoryTitle('');
            setIsAddingCategory(false);
        } catch (e) {
            console.error(e);
        }
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
      try {
          if (!user?.isGuest) {
              await deleteCategory(cat.id);
          }
          if (onCategoryChange) onCategoryChange();
      } catch (e) { console.error(e); }
  };

  const CurrentIcon = MODES[mode].icon;

  const handleToggleWidget = () => {
      if ((window as any).electron) (window as any).electron.send('toggle-widget');
  };

  return (
    <div 
        ref={fullScreenRef}
        className="bg-card border border-border rounded-xl p-8 flex flex-col h-full max-w-2xl mx-auto relative shadow-2xl overflow-y-auto custom-scrollbar"
    >
      <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-20 transition-all duration-700 pointer-events-none ${isFocus ? 'bg-accent-focus' : 'bg-accent-break'} ${timerState === TimerState.RUNNING ? 'scale-125 opacity-30' : ''}`} />

      <div className="absolute top-6 right-6 z-40 flex gap-2">
           <button onClick={handleToggleWidget} className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5" title="Toggle Mini Widget"><Monitor size={20} /></button>
           <button onClick={toggleFullscreen} className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5" title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}>{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
      </div>

      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${lastSavedMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <div className="bg-accent-focus/10 border border-accent-focus/30 text-accent-focus px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg backdrop-blur-md">
              <Save size={14} />{lastSavedMessage}
          </div>
      </div>

      <div className="flex flex-col items-center mb-8 z-10 relative mt-4">
        <div className="flex p-1 bg-[#0f1117] rounded-lg border border-[#2a2d36] mb-6">
            <button onClick={() => switchTab('FOCUS')} disabled={isTimerActive} className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isFocus ? 'bg-[#2a2d36] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'} ${isTimerActive ? 'opacity-50 cursor-not-allowed' : ''}`}>Focus</button>
            <button onClick={() => switchTab('BREAK')} disabled={isTimerActive} className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${!isFocus ? 'bg-[#2a2d36] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'} ${isTimerActive ? 'opacity-50 cursor-not-allowed' : ''}`}>Break</button>
        </div>
        
        <button onClick={toggleDuration} disabled={isTimerActive} className={`group flex items-center gap-2 px-4 py-1.5 rounded-full border bg-opacity-10 transition-all active:scale-95 ${isFocus ? 'bg-green-500/10 border-green-500/20 text-accent-focus hover:bg-green-500/20' : 'bg-orange-500/10 border-orange-500/20 text-accent-break hover:bg-orange-500/20'} ${isTimerActive ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
            <CurrentIcon size={14} />
            <span className="text-xs font-semibold tracking-wide uppercase">{isFocus ? 'Focus' : 'Break'} ({MODES[mode].minutes}m)</span>
            {!isTimerActive && <RefreshCw size={10} className="opacity-50 group-hover:rotate-180 transition-transform duration-500" />}
        </button>
      </div>

      <div className={`relative mb-8 z-30 transition-all duration-300 ${isFocus && !isTimerActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none h-0 mb-0'}`}>
        <label className={`text-xs text-gray-500 mb-1 block uppercase tracking-wider text-center ${isTimerActive ? 'opacity-50' : ''}`}>Current Category</label>
            <div className="flex gap-2 max-w-sm mx-auto">
                <div className="relative flex-1">
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        disabled={isTimerActive}
                        className={`w-full bg-[#2a2d36] hover:bg-[#323640] border border-[#3f434e] rounded-lg p-3 flex justify-between items-center text-white transition-colors group disabled:opacity-70 ${isTimerActive ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                         {activeCategory ? (
                             <>
                                <span className="font-medium truncate">{activeCategory.name}</span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                             </>
                         ) : (
                             <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /><span className="font-medium text-gray-400">Loading...</span></div>
                         )}
                    </button>
                    {isDropdownOpen && !isTimerActive && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-[#3f434e] rounded-xl shadow-xl overflow-hidden z-50">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {categories.map(cat => (
                                    <button key={cat.id} onClick={() => { setActiveCategory(cat); setIsDropdownOpen(false); }} className="w-full text-left p-3 hover:bg-[#2a2d36] text-sm text-gray-200 truncate border-b border-[#2a2d36] last:border-0">{cat.name}</button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => { setIsAddingCategory(true); setIsDropdownOpen(false); setNewCategoryTitle(''); setNewCategoryType('focus'); }}
                    disabled={isTimerActive}
                    className={`bg-[#2a2d36] hover:bg-[#323640] border border-[#3f434e] rounded-lg px-3 flex items-center justify-center text-gray-400 hover:text-accent-focus transition-colors ${isTimerActive ? 'cursor-not-allowed opacity-50' : ''}`}
                    title="Add new category"
                >
                    <Plus size={20} />
                </button>
            </div>
      </div>

      <div onClick={toggleTimerPause} className={`flex-1 flex flex-col items-center justify-center mb-8 z-10 min-h-[120px] shrink-0 relative group ${timerState !== TimerState.IDLE ? 'cursor-pointer' : ''}`}>
        <div className={`text-7xl sm:text-8xl font-mono font-bold tracking-wider mb-4 transition-all duration-500 select-none ${timerState === TimerState.RUNNING ? `${MODES[mode].color} drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]` : timerState === TimerState.PAUSED ? 'text-gray-500' : 'text-white'}`}>
          {formatTime(timeLeft)}
        </div>
        <p className="text-gray-400 text-base font-medium text-center">{timerState === TimerState.PAUSED ? 'Timer Paused' : timerState === TimerState.RUNNING ? (isFocus ? 'Stay focused.' : 'Take a breath.') : 'Ready to start?'}</p>
      </div>

      <div className="flex justify-center w-full z-40 mt-auto relative">
         <button onClick={handleMainAction} className={`px-10 py-3 rounded-xl font-bold transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center gap-2 ${timerState === TimerState.IDLE ? MODES[mode].bg + ' text-black' : 'bg-[#2a2d36] text-white border border-[#3f434e] hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400'}`}>
            {timerState === TimerState.IDLE ? <><Play size={18} fill="currentColor" /> Start</> : <><Square size={18} fill="currentColor" /> Stop</>}
         </button>
      </div>
      
       {isDevMode && <button onClick={handleSimulateSession} className="absolute bottom-4 left-4 z-50 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs font-mono rounded hover:bg-yellow-500/20 transition-colors flex items-center gap-2"><Zap size={12} /> DEV: SIM 25M</button>}
    </div>
  );
};