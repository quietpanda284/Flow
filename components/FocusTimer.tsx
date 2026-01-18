import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, ChevronDown, Coffee, Brain, Battery, Plus, Trash2, X, Check, Loader2 } from 'lucide-react';
import { TimerState, CategoryType } from '../types';
import { getCategories, addCategory, deleteCategory } from '../services/api';

type TimerMode = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

const MODES = {
  FOCUS: { label: 'Focus', minutes: 25, color: 'text-accent-focus', bg: 'bg-accent-focus', icon: Brain },
  SHORT_BREAK: { label: 'Short Break', minutes: 5, color: 'text-accent-break', bg: 'bg-accent-break', icon: Coffee },
  LONG_BREAK: { label: 'Long Break', minutes: 10, color: 'text-accent-break', bg: 'bg-accent-break', icon: Battery },
};

export const FocusTimer: React.FC = () => {
  const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
  const [mode, setMode] = useState<TimerMode>('FOCUS');
  const [timeLeft, setTimeLeft] = useState(MODES.FOCUS.minutes * 60);
  
  // Category Management State
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<CategoryType>('focus');
  
  const timerRef = useRef<number | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const fetchedCats = await getCategories();
      setCategories(fetchedCats);
      if (fetchedCats.length > 0) setActiveCategory(fetchedCats[0]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (timerState === TimerState.RUNNING) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            setTimerState(TimerState.IDLE);
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

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimerState(TimerState.IDLE);
    setTimeLeft(MODES[newMode].minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setTimerState(TimerState.RUNNING);
  const handlePause = () => setTimerState(TimerState.PAUSED);
  const handleStop = () => {
    setTimerState(TimerState.IDLE);
    setTimeLeft(MODES[mode].minutes * 60);
  };

  const handleAddCategory = async () => {
    if (newCategoryTitle.trim()) {
        const titleToAdd = newCategoryTitle.trim();
        
        // Optimistic Update
        const prevCategories = [...categories];
        setCategories([...categories, titleToAdd]);
        setActiveCategory(titleToAdd);
        setNewCategoryTitle('');
        setIsAddingCategory(false);

        try {
          await addCategory(titleToAdd, newCategoryType);
        } catch (error) {
          // Revert if failed (though our service handles mock fallback)
          setCategories(prevCategories);
        }
    }
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    const prevCategories = [...categories];
    const updatedCats = categories.filter(t => t !== catToDelete);
    
    setCategories(updatedCats);
    if (activeCategory === catToDelete) {
        setActiveCategory(updatedCats.length > 0 ? updatedCats[0] : '');
    }

    try {
      await deleteCategory(catToDelete);
    } catch (error) {
      setCategories(prevCategories);
    }
  };

  const CurrentIcon = MODES[mode].icon;

  return (
    <div className="bg-card border border-border rounded-xl p-8 flex flex-col h-full max-w-2xl mx-auto relative shadow-2xl overflow-y-auto custom-scrollbar">
        {/* Decorative background glow based on mode */}
      <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-20 transition-all duration-700 pointer-events-none ${mode === 'FOCUS' ? 'bg-accent-focus' : 'bg-accent-break'} ${timerState === TimerState.RUNNING ? 'scale-125 opacity-30' : ''}`} />

      {/* Header & Mode Selector */}
      <div className="flex flex-col items-center mb-8 z-10 relative">
        <div className="flex p-1 bg-[#0f1117] rounded-lg border border-[#2a2d36] mb-6">
            {(Object.keys(MODES) as TimerMode[]).map((m) => (
                <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        mode === m 
                        ? 'bg-[#2a2d36] text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    {MODES[m].label}
                </button>
            ))}
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-opacity-10 ${mode === 'FOCUS' ? 'bg-green-500/10 border-green-500/20 text-accent-focus' : 'bg-orange-500/10 border-orange-500/20 text-accent-break'}`}>
            <CurrentIcon size={14} />
            <span className="text-xs font-semibold tracking-wide uppercase">{MODES[mode].label} Mode</span>
        </div>
      </div>

      {/* Category Selector - Only visible in Focus Mode */}
      <div className={`relative mb-8 z-30 transition-all duration-300 ${mode === 'FOCUS' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none h-0 mb-0'}`}>
        <label className="text-xs text-gray-500 mb-1 block uppercase tracking-wider text-center">Current Category</label>
        
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
                
                {/* Type Selection */}
                <div className="flex gap-2 justify-center">
                    {(['focus', 'meeting', 'communication'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setNewCategoryType(t)}
                            className={`
                                px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all
                                ${newCategoryType === t 
                                    ? (t === 'focus' ? 'bg-accent-focus text-black border-accent-focus' 
                                       : t === 'meeting' ? 'bg-accent-meeting text-white border-accent-meeting'
                                       : 'bg-purple-400 text-white border-purple-400')
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
                        disabled={isLoading}
                        className="w-full bg-[#2a2d36] hover:bg-[#323640] border border-[#3f434e] rounded-lg p-3 flex justify-between items-center text-white transition-colors group disabled:opacity-70"
                    >
                         {isLoading ? (
                             <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin" size={16} />
                                <span className="font-medium text-gray-400">Loading categories...</span>
                             </div>
                         ) : (
                             <>
                                <span className="font-medium truncate">{activeCategory || "Select a category"}</span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                             </>
                         )}
                    </button>
                    
                    {/* Dropdown Menu */}
                    {isDropdownOpen && !isLoading && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d24] border border-[#3f434e] rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {categories.map(cat => (
                                    <div key={cat} className="flex items-center justify-between p-3 hover:bg-[#2a2d36] group/item transition-colors">
                                        <button 
                                            onClick={() => { setActiveCategory(cat); setIsDropdownOpen(false); }}
                                            className="flex-1 text-left text-sm text-gray-200 truncate"
                                        >
                                            {cat}
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
                    className="bg-[#2a2d36] hover:bg-[#323640] border border-[#3f434e] rounded-lg px-3 flex items-center justify-center text-gray-400 hover:text-accent-focus transition-colors"
                    title="Add new category"
                >
                    <Plus size={20} />
                </button>
            </div>
        )}
      </div>

      {/* Timer Display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-8 z-10 min-h-[120px] shrink-0">
        <div className={`text-7xl sm:text-8xl font-mono font-bold tracking-wider mb-4 transition-colors duration-500 ${timerState === TimerState.RUNNING ? `${MODES[mode].color} drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]` : 'text-white'}`}>
          {formatTime(timeLeft)}
        </div>
        <p className="text-gray-400 text-base font-medium text-center">
            {timerState === TimerState.RUNNING 
                ? (mode === 'FOCUS' ? 'Stay focused, keep flowing.' : 'Take a breath, relax.') 
                : 'Ready to start?'}
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto w-full z-40 mt-auto relative">
        {timerState === TimerState.RUNNING ? (
             <button 
                onClick={handlePause}
                className="flex items-center justify-center gap-2 bg-[#2a2d36] hover:bg-[#323640] text-white py-4 rounded-xl font-semibold transition-all border border-[#3f434e] active:scale-95"
             >
                <Pause size={22} /> Pause
             </button>
        ) : (
            <button 
                onClick={handleStart}
                className={`flex items-center justify-center gap-2 text-black py-4 rounded-xl font-bold transition-all shadow-lg hover:brightness-110 active:scale-95 ${MODES[mode].bg}`}
             >
                <Play size={22} fill="currentColor" /> {timerState === TimerState.PAUSED ? 'Resume' : 'Start'}
             </button>
        )}
        
        <button 
            onClick={handleStop}
            className={`flex items-center justify-center gap-2 border border-[#2a2d36] text-gray-400 hover:text-white hover:border-gray-500 py-4 rounded-xl font-medium transition-all active:scale-95 ${timerState === TimerState.IDLE ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a2d36]'}`}
            disabled={timerState === TimerState.IDLE}
        >
            <Square size={22} fill={timerState !== TimerState.IDLE ? "currentColor" : "none"} /> Stop
        </button>
      </div>
    </div>
  );
};