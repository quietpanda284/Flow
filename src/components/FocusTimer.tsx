import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, ChevronDown, Coffee, Brain, Battery, Plus, Trash2, X, Check, Loader2, Zap, Save, RefreshCw, Maximize2, Minimize2, Monitor } from 'lucide-react';
import { TimerState, CategoryType, Category, TimeBlock } from '../types';
import { getCategories, addCategory, deleteCategory, addTimeBlock, getFocusHistory } from '../services/api';
import { MASTER_CATEGORIES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { getTotalProductiveMinutes } from '../utils/analytics';

type TimerVariant = 'FOCUS_25' | 'FOCUS_50' | 'BREAK_5' | 'BREAK_10';

const MODES: Record<TimerVariant, { label: string; minutes: number; color: string; bg: string; icon: any }> = {
  FOCUS_25: { label: 'Focus', minutes: 25, color: 'text-accent-focus', bg: 'bg-accent-focus', icon: Brain },
  FOCUS_50: { label: 'Deep Focus', minutes: 50, color: 'text-accent-focus', bg: 'bg-accent-focus', icon: Brain },
  BREAK_5: { label: 'Short Break', minutes: 5, color: 'text-accent-break', bg: 'bg-accent-break', icon: Coffee },
  BREAK_10: { label: 'Long Break', minutes: 10, color: 'text-accent-break', bg: 'bg-accent-break', icon: Battery },
};

// Polyfill for randomUUID in non-secure contexts (HTTP)
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
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ onTimerComplete, isDevMode = false }) => {
  const { user } = useAuth();
  const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
  const [mode, setMode] = useState<TimerVariant>('FOCUS_25');
  const [timeLeft, setTimeLeft] = useState(MODES.FOCUS_25.minutes * 60);
  
  // Memory State: Remembers the last used duration for each type
  const [lastFocusMode, setLastFocusMode] = useState<TimerVariant>('FOCUS_25');
  const [lastBreakMode, setLastBreakMode] = useState<TimerVariant>('BREAK_5');

  // Stats for Widget
  const [todaysProductiveMinutes, setTodaysProductiveMinutes] = useState(0);

  // Feedback State
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);

  // Category Management State
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('focus');
  
  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);

  const isFocus = mode.startsWith('FOCUS');
  const isTimerActive = timerState !== TimerState.IDLE;

  // --- WIDGET INTEGRATION START ---

  // 1. Listen for Commands from Widget (Main -> Renderer)
  useEffect(() => {
    if ((window as any).electron) {
        (window as any).electron.receive('app-command', (command: any) => {
            console.log("Received widget command:", command);
            
            if (command.type === 'START_FOCUS') {
                const duration = command.payload; // 25 or 50
                // Switch tab if needed
                if (!mode.startsWith('FOCUS')) switchTab('FOCUS');
                // Set correct duration
                const newMode: TimerVariant = duration === 50 ? 'FOCUS_50' : 'FOCUS_25';
                setMode(newMode);
                setLastFocusMode(newMode);
                setTimeLeft(duration * 60);
                setTimerState(TimerState.RUNNING);
            }
            else if (command.type === 'START_BREAK') {
                const duration = command.payload;
                if (mode.startsWith('FOCUS')) switchTab('BREAK');
                const newMode: TimerVariant = duration === 10 ? 'BREAK_10' : 'BREAK_5';
                setMode(newMode);
                setLastBreakMode(newMode);
                setTimeLeft(duration * 60);
                setTimerState(TimerState.RUNNING);
            }
            else if (command.type === 'STOP_TIMER') {
                handleStop();
            }
        });
    }
  }, [mode, timerState]); // Deps allow immediate access to current state logic

  // 2. Send Updates to Widget (Renderer -> Main)
  useEffect(() => {
    if ((window as any).electron) {
        const payload = {
            timerState,
            timeLeft,
            totalDuration: MODES[mode].minutes,
            totalProductiveMinutes: todaysProductiveMinutes,
        };
        (window as any).electron.send('app-state-update', payload);
    }
  }, [timeLeft, timerState, mode, todaysProductiveMinutes]);

  // Fetch today's stats for widget sync
  useEffect(() => {
    const fetchTodayStats = async () => {
        if (!user) return;
        try {
            const history = await getFocusHistory();
            // Assuming history returns aggregated daily stats, find today
            // Note: In a real app we might need a more specific endpoint, but we can reuse logic
            // For now, let's just use what we have or placeholder.
            // Actually, we can fetch 'actualBlocks' for today and sum them.
            // But getFocusHistory returns {date, totalMinutes}.
            const todayStr = new Date().toISOString().split('T')[0]; // UTC based, simplest approx
            const todayStat = history.find(h => h.date === todayStr);
            setTodaysProductiveMinutes(todayStat ? todayStat.totalMinutes : 0);
        } catch (e) {
            console.error("Failed to sync widget stats");
        }
    };
    fetchTodayStats();
    // Refresh every minute
    const interval = setInterval(fetchTodayStats, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // --- WIDGET INTEGRATION END ---

  // Initial Data Fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (user?.isGuest) {
          setCategories(MASTER_CATEGORIES);
          setActiveCategory(MASTER_CATEGORIES[0]);
          setIsLoading(false);
          return;
      }
      const fetchedCats = await getCategories();
      setCategories(fetchedCats);
      if (fetchedCats.length > 0) setActiveCategory(fetchedCats[0]);
      setIsLoading(false);
    };
    loadData();
  }, [user]);

  // Update Document Title
  useEffect(() => {
    if (timerState === TimerState.RUNNING) {
      document.title = `${formatTime(timeLeft)} - ${isFocus ? 'Focus' : 'Break'}`;
    } else {
      document.title = 'Flow';
    }
  }, [timeLeft, timerState, isFocus]);

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

  const getCurrentTimeStr = (date: Date) => {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getLocalDateStr = (date: Date) => {
      const offset = date.getTimezoneOffset();
      const localDate = new Date(date.getTime() - (offset*60*1000));
      return localDate.toISOString().split('T')[0];
  };

  const showFeedback = (msg: string) => {
      setLastSavedMessage(msg);
      setTimeout(() => setLastSavedMessage(null), 3000);
  };

  const saveSession = async (actualMinutes?: number) => {
    const now = new Date();
    const rawMinutes = actualMinutes ?? MODES[mode].minutes;
    const durationMinutes = Math.max(1, Math.round(rawMinutes));
    
    if (durationMinutes < 1) return;

    const startDate = new Date(now.getTime() - durationMinutes * 60000);
    const startTimeStr = getCurrentTimeStr(startDate);
    const endTimeStr = getCurrentTimeStr(now);

    let categoryId = 'custom';
    let type: CategoryType = isFocus ? 'focus' : 'break';
    let title = MODES[mode].label;

    if (isFocus && activeCategory) {
        categoryId = activeCategory.id;
        title = activeCategory.name;
        type = activeCategory.type;
    }

    const newBlock: TimeBlock = {
        id: generateUUID(),
        title: title,
        app: 'Timer',
        startTime: startTimeStr,
        endTime: endTimeStr,
        durationMinutes: durationMinutes,
        type: type,
        categoryId: categoryId,
        isPlanned: false, 
        date: getLocalDateStr(now) 
    };

    if (type !== 'break') {
        setTodaysProductiveMinutes(prev => prev + durationMinutes);
    }

    if (user?.isGuest) {
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
    // ... same as before
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

    setTodaysProductiveMinutes(prev => prev + durationMinutes);

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

  useEffect(() => {
    if (timerState === TimerState.RUNNING) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { // Hit 0
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
  }, [timerState, mode, activeCategory]); 

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
      
      switch (mode) {
          case 'FOCUS_25': newMode = 'FOCUS_50'; break;
          case 'FOCUS_50': newMode = 'FOCUS_25'; break;
          case 'BREAK_5': newMode = 'BREAK_10'; break;
          case 'BREAK_10': newMode = 'BREAK_5'; break;
      }
      
      setMode(newMode);
      
      if (newMode.startsWith('FOCUS')) {
          setLastFocusMode(newMode);
      } else {
          setLastBreakMode(newMode);
      }

      setTimerState(TimerState.IDLE);
      setTimeLeft(MODES[newMode].minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setTimerState(TimerState.RUNNING);
  
  const handleStop = () => {
    const totalSeconds = MODES[mode].minutes * 60;
    const elapsedSeconds = totalSeconds - timeLeft;
    
    setTimerState(TimerState.IDLE);
    setTimeLeft(MODES[mode].minutes * 60);

    if (elapsedSeconds >= 59) {
        const minutes = elapsedSeconds / 60;
        saveSession(minutes);
    }
  };

  const handleMainAction = () => {
      if (timerState === TimerState.IDLE) {
          handleStart();
      } else {
          handleStop();
      }
  };

  const toggleTimerPause = () => {
      if (timerState === TimerState.RUNNING) {
          setTimerState(TimerState.PAUSED);
      } else if (timerState === TimerState.PAUSED) {
          setTimerState(TimerState.RUNNING);
      }
  };

  // Category Logic (Add/Delete/Select) - kept same as original, omitted for brevity but included in output if needed.
  // ... (Existing category handlers here) ...
  const handleAddCategory = async () => {
    if (newCategoryTitle.trim()) {
        const titleToAdd = newCategoryTitle.trim();
        const typeToAdd = newCategoryType;

        if (user?.isGuest) {
            const newCat: Category = { id: `guest-cat-${Date.now()}`, name: titleToAdd, type: typeToAdd };
            setCategories([...categories, newCat]);
            setActiveCategory(newCat);
            setNewCategoryTitle('');
            setIsAddingCategory(false);
            return;
        }

        try {
          const newCat = await addCategory(titleToAdd, typeToAdd);
          setCategories([...categories, newCat]);
          setActiveCategory(newCat);
          setNewCategoryTitle('');
          setIsAddingCategory(false);
        } catch (error) {
          console.error("Failed to add category");
        }
    }
  };

  const handleDeleteCategory = async (catToDelete: Category) => {
    if (user?.isGuest) {
         const updatedCats = categories.filter(c => c.id !== catToDelete.id);
         setCategories(updatedCats);
         if (activeCategory?.id === catToDelete.id) {
             setActiveCategory(updatedCats.length > 0 ? updatedCats[0] : null);
         }
         return;
    }

    try {
      await deleteCategory(catToDelete.id);
      const updatedCats = categories.filter(c => c.id !== catToDelete.id);
      setCategories(updatedCats);
      if (activeCategory?.id === catToDelete.id) {
          setActiveCategory(updatedCats.length > 0 ? updatedCats[0] : null);
      }
    } catch (error) {
       console.error("Failed to delete category");
    }
  };

  const CurrentIcon = MODES[mode].icon;
  
  const handleToggleWidget = () => {
      if ((window as any).electron) {
          (window as any).electron.send('toggle-widget');
      }
  };

  return (
    <div 
        ref={fullScreenRef}
        className="bg-card border border-border rounded-xl p-8 flex flex-col h-full max-w-2xl mx-auto relative shadow-2xl overflow-y-auto custom-scrollbar"
    >
        {/* Background Glow */}
      <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-20 transition-all duration-700 pointer-events-none ${isFocus ? 'bg-accent-focus' : 'bg-accent-break'} ${timerState === TimerState.RUNNING ? 'scale-125 opacity-30' : ''}`} />

      {/* Widget Toggle & Full Screen */}
      <div className="absolute top-6 right-6 z-40 flex gap-2">
           {/* Widget Button */}
           <button 
                onClick={handleToggleWidget}
                className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                title="Toggle Mini Widget"
            >
                <Monitor size={20} />
            </button>
          
           <button 
                onClick={toggleFullscreen}
                className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
            >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
      </div>

      {/* Feedback Toast */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${lastSavedMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <div className="bg-accent-focus/10 border border-accent-focus/30 text-accent-focus px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg backdrop-blur-md">
              <Save size={14} />
              {lastSavedMessage}
          </div>
      </div>

      {/* Header & Mode Selector */}
      <div className="flex flex-col items-center mb-8 z-10 relative mt-4">
        <div className="flex p-1 bg-[#0f1117] rounded-lg border border-[#2a2d36] mb-6">
            <button
                onClick={() => switchTab('FOCUS')}
                disabled={isTimerActive}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isFocus
                    ? 'bg-[#2a2d36] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-300'
                } ${isTimerActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                Focus
            </button>
            <button
                onClick={() => switchTab('BREAK')}
                disabled={isTimerActive}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    !isFocus
                    ? 'bg-[#2a2d36] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-300'
                } ${isTimerActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                Break
            </button>
        </div>
        
        {/* Toggleable Pill */}
        <button 
            onClick={toggleDuration}
            disabled={isTimerActive}
            title={isTimerActive ? "Stop timer to change duration" : "Click to switch duration"}
            className={`group flex items-center gap-2 px-4 py-1.5 rounded-full border bg-opacity-10 transition-all active:scale-95 ${isFocus ? 'bg-green-500/10 border-green-500/20 text-accent-focus hover:bg-green-500/20' : 'bg-orange-500/10 border-orange-500/20 text-accent-break hover:bg-orange-500/20'} ${isTimerActive ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
        >
            <CurrentIcon size={14} />
            <span className="text-xs font-semibold tracking-wide uppercase">
                {isFocus ? 'Focus' : 'Break'} ({MODES[mode].minutes}m)
            </span>
            {!isTimerActive && <RefreshCw size={10} className="opacity-50 group-hover:rotate-180 transition-transform duration-500" />}
        </button>
      </div>

      {/* Category Selector (Same as before) */}
      <div className={`relative mb-8 z-30 transition-all duration-300 ${isFocus && !isTimerActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none h-0 mb-0'}`}>
        <label className={`text-xs text-gray-500 mb-1 block uppercase tracking-wider text-center ${isTimerActive ? 'opacity-50' : ''}`}>Current Category</label>
        
        {isAddingCategory ? (
             <div className="flex flex-col gap-3 max-w-sm mx-auto w-full animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-2">
                    <input 
                        autoFocus
                        value={newCategoryTitle}
                        onChange={(e) => setNewCategoryTitle(e.target.value)}
                        className="flex-1 bg-[#2a2d36] border border-[#3f434e] rounded-lg px-3 py-2 text-white outline-none focus:border-accent-focus text-sm placeholder:text-gray-600"
                        placeholder="Category name..."
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <button onClick={handleAddCategory} className="p-2 bg-accent-focus text-black rounded-lg hover:brightness-110 transition-all"><Check size={18} /></button>
                    <button onClick={() => setIsAddingCategory(false)} className="p-2 bg-[#2a2d36] text-gray-400 rounded-lg hover:text-white transition-colors"><X size={18} /></button>
                </div>
                
                <div className="flex gap-2 justify-center">
                    {(['focus', 'meeting'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setNewCategoryType(t)}
                            className={`
                                px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all
                                ${newCategoryType === t 
                                    ? (t === 'focus' ? 'bg-accent-focus text-black border-accent-focus' 
                                       : 'bg-accent-meeting text-white border-accent-meeting')
                                    : 'bg-[#1a1d24] border-[#3f434e] text-gray-500 hover:border-gray-500 hover:text-gray-300'
                                }
                            `}
                        >
                            {t}
                        </button>
                    ))}
                </div>
             </div>
        ) : (
            <div className="flex gap-2 max-w-sm mx-auto">
                <div className="relative flex-1">
                    <button 
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        disabled={isLoading || isTimerActive}
                        className={`w-full bg-[#2a2d36] hover:bg-[#323640] border border-[#3f434e] rounded-lg p-3 flex justify-between items-center text-white transition-colors group disabled:opacity-70 ${isTimerActive ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                         {isLoading ? (
                             <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="font-medium text-gray-400">Loading categories...</span>
                             </div>
                         ) : (
                             <>
                                <span className="font-medium truncate">{activeCategory?.name || "Select a category"}</span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                             </>
                         )}
                    </button>
                    
                    {isDropdownOpen && !isLoading && !isTimerActive && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-[#3f434e] rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-[#2a2d36] group/item transition-colors">
                                        <button 
                                            onClick={() => { setActiveCategory(cat); setIsDropdownOpen(false); }}
                                            className="flex-1 text-left text-sm text-gray-200 truncate"
                                        >
                                            {cat.name}
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover/item:opacity-100"
                                            title="Delete category"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {categories.length === 0 && (
                                    <div className="p-4 text-center text-xs text-gray-500">No categories created</div>
                                )}
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
        )}
      </div>

      {/* Timer Display */}
      <div 
        onClick={toggleTimerPause}
        className={`flex-1 flex flex-col items-center justify-center mb-8 z-10 min-h-[120px] shrink-0 relative group ${timerState !== TimerState.IDLE ? 'cursor-pointer' : ''}`}
      >
        <div className={`text-7xl sm:text-8xl font-mono font-bold tracking-wider mb-4 transition-all duration-500 select-none ${timerState === TimerState.RUNNING ? `${MODES[mode].color} drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]` : timerState === TimerState.PAUSED ? 'text-gray-500' : 'text-white'}`}>
          {formatTime(timeLeft)}
        </div>
        
        <p className="text-gray-400 text-base font-medium text-center">
            {timerState === TimerState.PAUSED 
                ? 'Timer Paused' 
                : timerState === TimerState.RUNNING 
                    ? (isFocus ? 'Stay focused, keep flowing.' : 'Take a breath, relax.') 
                    : 'Ready to start?'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center w-full z-40 mt-auto relative">
         <button 
            onClick={handleMainAction}
            className={`px-10 py-3 rounded-xl font-bold transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center gap-2 ${timerState === TimerState.IDLE ? MODES[mode].bg + ' text-black' : 'bg-[#2a2d36] text-white border border-[#3f434e] hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400'}`}
         >
            {timerState === TimerState.IDLE ? (
                <>
                    <Play size={18} fill="currentColor" /> Start
                </>
            ) : (
                <>
                    <Square size={18} fill="currentColor" /> Stop
                </>
            )}
         </button>
      </div>

      {/* Dev Mode Simulation */}
      {isDevMode && (
        <button 
            onClick={handleSimulateSession}
            className="absolute bottom-4 left-4 z-50 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs font-mono rounded hover:bg-yellow-500/20 transition-colors flex items-center gap-2"
        >
            <Zap size={12} />
            DEV: SIM 25M
        </button>
      )}

    </div>
  );
};