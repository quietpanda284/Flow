
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, ChevronDown, Coffee, Brain, Battery, Plus, Save, RefreshCw, Maximize2, Minimize2, Monitor, Loader2, Zap, X, Check, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { TimerState, CategoryType, Category, TimeBlock } from '../types';
import { addCategory, deleteCategory, updateCategory, addTimeBlock } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
    categories: Category[];
    onCategoryChange?: () => void;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ 
    onTimerComplete, 
    isDevMode = false,
    categories,
    onCategoryChange
}) => {
  const { user } = useAuth();
  
  // Local UI State (Data comes from Electron now)
  const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
  const [mode, setMode] = useState<TimerVariant>('FOCUS_25');
  const [timeLeft, setTimeLeft] = useState(MODES.FOCUS_25.minutes * 60);
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);
  
  // Category UI
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('focus');
  
  // Category Editing UI
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Delete Confirmation UI
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // View State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullScreenRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isFocus = mode.startsWith('FOCUS');
  const isTimerActive = timerState !== TimerState.IDLE;
  
  // Refs for current data snapshot (used in callbacks)
  const stateRef = useRef({ categories, user, activeCategory });

  useEffect(() => {
    stateRef.current = { categories, user, activeCategory };
  }, [categories, user, activeCategory]);

  // --- FIX 1: INFINITE LOOP ---
  // We removed 'activeCategory' from the payload and the dependency array.
  // React now only syncs the LIST of categories. The ACTIVE state is owned by Electron.
  useEffect(() => {
    if ((window as any).electron) {
        (window as any).electron.send('timer-command', {
            type: 'SYNC_CATEGORIES',
            payload: {
                categories: categories.map(c => ({ id: c.id, name: c.name, type: c.type })),
                // activeCategory: activeCategory  <-- REMOVED THIS LINE TO STOP LOOP
            }
        });
    }
  }, [categories]); // <-- REMOVED activeCategory from dependencies

  // Fullscreen Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Dropdown Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
            setEditingCategoryId(null); // Reset edit state when closing
        }
    };

    if (isDropdownOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const showFeedback = (msg: string) => {
      setLastSavedMessage(msg);
      setTimeout(() => setLastSavedMessage(null), 3000);
  };

  // --- SAVE LOGIC ---
  const saveSession = async (durationMinutes: number, completedMode: string) => {
    const { user: currentUser, activeCategory: currentCat } = stateRef.current;
    
    const now = new Date();
    const effectiveDuration = Math.max(1, Math.round(durationMinutes));
    const startDate = new Date(now.getTime() - effectiveDuration * 60000);
    
    // Determine props
    const isModeFocus = completedMode.startsWith('FOCUS');
    let categoryId = 'custom';
    let type: CategoryType = isModeFocus ? 'focus' : 'break';
    let title = isModeFocus ? 'Focus Session' : 'Break';

    if (MODES[completedMode as TimerVariant]) {
        title = MODES[completedMode as TimerVariant].label;
    }

    if (isModeFocus && currentCat) {
        categoryId = currentCat.id;
        title = currentCat.name;
        type = currentCat.type;
    }

    const newBlock: TimeBlock = {
        id: generateUUID(),
        title: title,
        app: 'Timer',
        startTime: `${startDate.getHours().toString().padStart(2,'0')}:${startDate.getMinutes().toString().padStart(2,'0')}`,
        endTime: `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`,
        durationMinutes: effectiveDuration,
        type: type,
        categoryId: categoryId,
        isPlanned: false, 
        date: now.toISOString().split('T')[0]
    };

    if (currentUser?.isGuest) {
        showFeedback(`Saved ${effectiveDuration}m (Guest)`);
        if (onTimerComplete) onTimerComplete(newBlock);
        return;
    }

    try {
        await addTimeBlock(newBlock, false);
        showFeedback(`Saved ${effectiveDuration}m session`);
        if (onTimerComplete) onTimerComplete();
    } catch (error) {
        console.error("Failed to save timer session", error);
        showFeedback("Failed to save session");
    }
  };

  // --- IPC LISTENERS ---
  useEffect(() => {
      if (!(window as any).electron) return;

      // Listen for updates
      const updateId = (window as any).electron.receive('timer-update', (data: any) => {
          // Update Local State from Truth
          setTimerState(data.status); // 'IDLE' | 'RUNNING' | 'PAUSED'
          setTimeLeft(data.secondsRemaining);
          
          if (data.mode) setMode(data.mode);
          
          // Sync Active Category if changed externally
          // Note: We check if data.activeCategory exists to avoid nulling it out if payload is partial
          if (data.activeCategory !== undefined) {
              setActiveCategory(data.activeCategory);
          }
      });

      // Listen for completion (Trigger Save)
      const completeId = (window as any).electron.receive('timer-complete', (data: any) => {
          console.log("Timer complete received:", data);
          saveSession(data.duration, data.mode);
      });

      return () => {
          if ((window as any).electron.removeListener) {
            (window as any).electron.removeListener(updateId);
            (window as any).electron.removeListener(completeId);
          }
      };
  }, []);

  // --- ACTIONS (Send Commands) ---

  const sendCommand = (type: string, payload?: any) => {
      if ((window as any).electron) {
          (window as any).electron.send('timer-command', { type, payload });
      }
  };

  const switchTab = (tab: 'FOCUS' | 'BREAK') => {
    if (isTimerActive) return;
    const newMode: TimerVariant = tab === 'FOCUS' ? 'FOCUS_25' : 'BREAK_5'; 
    setMode(newMode);
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
      setTimeLeft(MODES[newMode].minutes * 60);
  };

  const handleStart = () => {
      sendCommand('START', { minutes: MODES[mode].minutes, mode });
  };
  
  const handleStop = () => {
      sendCommand('STOP');
  };

  const toggleTimerPause = () => {
      if (timerState === TimerState.RUNNING) sendCommand('PAUSE');
      else if (timerState === TimerState.PAUSED) sendCommand('RESUME');
  };

  const handleSelectCategory = (cat: Category) => {
      // Optimistic update
      setActiveCategory(cat);
      setIsDropdownOpen(false);
      // Send Truth to Electron
      sendCommand('SET_CATEGORY', cat.id);
  };

  const handleAddCategory = async () => {
    if (newCategoryTitle.trim()) {
        try {
            if (!user?.isGuest) {
                await addCategory(newCategoryTitle.trim(), newCategoryType);
            }
            if (onCategoryChange) onCategoryChange(); // Refresh App categories
            setNewCategoryTitle('');
            setIsAddingCategory(false);
            // Re-open dropdown to show new category
            setIsDropdownOpen(true);
        } catch (e) { console.error(e); }
    }
  };

  const handleDeleteCategory = (id: string) => {
      setDeleteConfirmationId(id);
  };

  const executeDeleteCategory = async () => {
      if (!deleteConfirmationId) return;
      
      try {
          await deleteCategory(deleteConfirmationId);
          if (activeCategory?.id === deleteConfirmationId) {
              setActiveCategory(null); // Clear optimistic
              sendCommand('SET_CATEGORY', null); 
          }
          if (onCategoryChange) onCategoryChange();
      } catch(e) { console.error(e); }
      
      setDeleteConfirmationId(null);
  };

  const handleEditCategory = async () => {
      if (editingCategoryId && editingName.trim()) {
          try {
              await updateCategory(editingCategoryId, editingName.trim());
              setEditingCategoryId(null);
              setEditingName('');
              if (activeCategory?.id === editingCategoryId) {
                  // If we renamed the active category, update local state immediately so UI reflects it
                  setActiveCategory(prev => prev ? { ...prev, name: editingName.trim() } : null);
              }
              if (onCategoryChange) onCategoryChange();
          } catch(e) { console.error(e); }
      }
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

      {/* --- FIX 2: ADD CATEGORY UI --- */}
      <div className={`relative mb-8 z-30 transition-all duration-300 ${isFocus && !isTimerActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none h-0 mb-0'}`}>
        <label className={`text-xs text-gray-500 mb-1 block uppercase tracking-wider text-center ${isTimerActive ? 'opacity-50' : ''}`}>Current Category</label>
            
            {/* TOGGLE BETWEEN SELECT MODE AND ADD MODE */}
            {!isAddingCategory ? (
                <div className="flex gap-2 max-w-sm mx-auto">
                    <div className="relative flex-1" ref={dropdownRef}>
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
                                 <div className="flex items-center gap-2"><span className="font-medium text-gray-400">Select Category</span></div>
                             )}
                        </button>
                        {isDropdownOpen && !isTimerActive && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-[#3f434e] rounded-xl shadow-xl overflow-hidden z-50">
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                    {categories.map(cat => (
                                        <div key={cat.id} className="group border-b border-[#2a2d36] last:border-0">
                                            {editingCategoryId === cat.id ? (
                                                <div className="flex items-center p-2 gap-2 bg-[#2a2d36]">
                                                    <input 
                                                        className="flex-1 bg-[#1a1d24] border border-[#3f434e] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-accent-focus"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleEditCategory();
                                                            if (e.key === 'Escape') setEditingCategoryId(null);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditCategory(); }} className="p-1 text-accent-focus hover:bg-white/5 rounded"><Check size={14}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingCategoryId(null); }} className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded"><X size={14}/></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between w-full hover:bg-[#2a2d36] transition-colors">
                                                    <button onClick={() => handleSelectCategory(cat)} className="flex-1 text-left p-3 text-sm text-gray-200 truncate">
                                                        {cat.name}
                                                    </button>
                                                    {!user?.isGuest && (
                                                        <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    setEditingCategoryId(cat.id); 
                                                                    setEditingName(cat.name); 
                                                                }} 
                                                                className="p-1.5 text-gray-500 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                                                                title="Rename"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    handleDeleteCategory(cat.id); 
                                                                }} 
                                                                className="p-1.5 text-gray-500 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {categories.length === 0 && (
                                        <div className="p-3 text-center text-xs text-gray-500">No categories found.</div>
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
            ) : (
                /* ADD NEW CATEGORY FORM */
                <div className="flex gap-2 max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-200">
                    <input 
                        type="text" 
                        value={newCategoryTitle}
                        onChange={(e) => setNewCategoryTitle(e.target.value)}
                        placeholder="New category name..."
                        className="flex-1 bg-[#1a1d24] border border-[#3f434e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-focus transition-colors placeholder:text-gray-600"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    />
                    <button 
                        onClick={handleAddCategory}
                        className="bg-accent-focus/10 border border-accent-focus/30 text-accent-focus hover:bg-accent-focus/20 rounded-lg px-3 flex items-center justify-center transition-colors"
                    >
                        <Check size={18} />
                    </button>
                    <button 
                        onClick={() => setIsAddingCategory(false)}
                        className="bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg px-3 flex items-center justify-center transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
      </div>

      <div onClick={toggleTimerPause} className={`flex-1 flex flex-col items-center justify-center mb-8 z-10 min-h-[120px] shrink-0 relative group ${timerState !== TimerState.IDLE ? 'cursor-pointer' : ''}`}>
        <div className={`text-7xl sm:text-8xl font-mono font-bold tracking-wider mb-4 transition-all duration-500 select-none ${timerState === TimerState.RUNNING ? `${MODES[mode].color} drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]` : timerState === TimerState.PAUSED ? 'text-gray-500' : 'text-white'}`}>
          {formatTime(timeLeft)}
        </div>
        <p className="text-gray-400 text-base font-medium text-center">{timerState === TimerState.PAUSED ? 'Timer Paused' : timerState === TimerState.RUNNING ? (isFocus ? 'Stay focused.' : 'Take a breath.') : 'Ready to start?'}</p>
      </div>

      <div className="flex justify-center w-full z-40 mt-auto relative">
         <button onClick={timerState === TimerState.IDLE ? handleStart : handleStop} className={`px-10 py-3 rounded-xl font-bold transition-all shadow-lg hover:brightness-110 active:scale-95 flex items-center gap-2 ${timerState === TimerState.IDLE ? MODES[mode].bg + ' text-black' : 'bg-[#2a2d36] text-white border border-[#3f434e] hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400'}`}>
            {timerState === TimerState.IDLE ? <><Play size={18} fill="currentColor" /> Start</> : <><Square size={18} fill="currentColor" /> Stop</>}
         </button>
      </div>
      
       {isDevMode && <button onClick={() => sendCommand('START', { minutes: 0.1, mode })} className="absolute bottom-4 left-4 z-50 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs font-mono rounded hover:bg-yellow-500/20 transition-colors flex items-center gap-2"><Zap size={12} /> DEV: TEST COMPLETE</button>}

       {/* Delete Confirmation Modal */}
       {deleteConfirmationId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-[#1a1d24] border border-[#2a2d36] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 rounded-full bg-red-500/10 text-red-500 shrink-0">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white">Delete Category?</h3>
                        </div>
                        
                        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                            Are you sure you want to delete this category? This action cannot be undone.
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => setDeleteConfirmationId(null)}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDeleteCategory}
                                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg flex items-center gap-2"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
       )}
    </div>
  );
};
