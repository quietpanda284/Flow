import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetricsBar } from './components/MetricsBar';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { FocusTimer } from './components/FocusTimer';
import { VerticalTimeline } from './components/VerticalTimeline';
import { Heatmap } from './components/Heatmap';
import { BackendTest } from './components/BackendTest';
import { SettingsPage } from './components/SettingsPage';
import { ConnectionWarning } from './components/ConnectionWarning';
import { LoginPage } from './components/LoginPage';
import { TimeBlock, Category } from './types';
import { getCategories, getActualBlocks, getPlannedBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock, getFocusHistory } from './services/api';
import { getPeakFocusHour, getTotalFocusMinutes, formatDuration, calculateScheduleMetrics } from './utils/analytics';
import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('Home');
  
  // Developer Mode State - Persisted in LocalStorage
  const [isDevMode, setIsDevMode] = useState(() => {
    try {
      return localStorage.getItem('flowstate_dev_mode') === 'true';
    } catch (e) {
      return false;
    }
  });

  // Save to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('flowstate_dev_mode', String(isDevMode));
  }, [isDevMode]);

  const [actualBlocks, setActualBlocks] = useState<TimeBlock[]>([]);
  const [plannedBlocks, setPlannedBlocks] = useState<TimeBlock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<{ date: string, totalMinutes: number }[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  
  // Connection State
  const [connectionError, setConnectionError] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Store Scroll Position for the Planning Page
  const planScrollRef = useRef<number | null>(null);

  // Date Formatting (LOCAL TIME to match Timer)
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - (offset*60*1000));
  const todayStr = localDate.toISOString().split('T')[0];
  
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Reset navigation to Home when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentPage('Home');
    }
  }, [user]);

  // Fetch logic extracted to function for reuse
  const fetchData = async (background = false) => {
    if (!user) return; // Don't fetch if not logged in
    
    if (!background) setIsDataLoading(true);
    setConnectionError(false);
    try {
        const [cats, actual, planned, hist] = await Promise.all([
            getCategories(),
            getActualBlocks(todayStr),
            getPlannedBlocks(todayStr),
            getFocusHistory()
        ]);
        setCategories(cats);
        setActualBlocks(actual);
        setPlannedBlocks(planned);
        setHistory(hist);
        setShowWarning(false);
    } catch (error) {
        console.error("Failed to fetch data:", error);
        setConnectionError(true);
        if (!background) setShowWarning(true);
    } finally {
        setIsDataLoading(false);
    }
  };

  // Initial Fetch & Auto-Refresh
  useEffect(() => {
    if (user) {
        fetchData(); 
        const intervalId = setInterval(() => {
            fetchData(true);
        }, 30000); 
        return () => clearInterval(intervalId);
    }
  }, [currentPage, user]); 

  // Calculate advanced schedule metrics
  const { 
    missedMinutes, 
    unplannedMinutes, 
    adherenceRate,
    totalPlannedMinutes, 
    totalActualMinutes 
  } = useMemo(() => calculateScheduleMetrics(plannedBlocks, actualBlocks), [plannedBlocks, actualBlocks]);
  
  // Dynamic Trends Data
  const currentFocusMinutes = getTotalFocusMinutes(actualBlocks);
  const peakFocusHour = getPeakFocusHour(actualBlocks);

  const handleAddBlock = async (newBlock: TimeBlock) => {
    const blockWithDate = { ...newBlock, date: todayStr };
    const tempBlock = { ...blockWithDate };
    setPlannedBlocks((prev) => [...prev, tempBlock]);
    
    try {
        const savedBlock = await addTimeBlock(blockWithDate, true);
        setPlannedBlocks((prev) => prev.map(b => b.id === tempBlock.id ? savedBlock : b));
    } catch (e) {
        console.error("Failed to save block", e);
        setPlannedBlocks((prev) => prev.filter(b => b.id !== tempBlock.id));
        setConnectionError(true);
        setShowWarning(true);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    const prevBlocks = [...plannedBlocks];
    setPlannedBlocks((prev) => prev.filter((b) => b.id !== blockId));
    
    try {
        const success = await deleteTimeBlock(blockId);
        if (!success) throw new Error("Delete failed");
    } catch (e) {
        setPlannedBlocks(prevBlocks);
        setConnectionError(true);
        setShowWarning(true);
    }
  };

  const handleUpdateBlock = async (updatedBlock: TimeBlock) => {
    const prevBlocks = [...plannedBlocks];
    setPlannedBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
    
    try {
        const success = await updateTimeBlock(updatedBlock);
        if (!success) throw new Error("Update failed");
    } catch (e) {
        setPlannedBlocks(prevBlocks);
        setConnectionError(true);
        setShowWarning(true);
    }
  };

  const handleTimerComplete = () => {
      fetchData(); 
  };

  // --- AUTH GUARD RENDER ---
  
  if (isAuthLoading) {
      return (
          <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
              <Loader2 className="animate-spin text-accent-focus" size={32} />
          </div>
      );
  }

  if (!user) {
      return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-background text-gray-200 font-sans selection:bg-accent-focus selection:text-black">
      <Sidebar activePage={currentPage} onNavigate={setCurrentPage} isDevMode={isDevMode} />
      
      {/* Main Content Area */}
      <main className="pl-24 pr-8 py-8 min-h-screen max-w-[1600px] mx-auto relative">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
            <div>
                {/* Applied font-display to main header */}
                <h1 className="text-3xl font-display font-bold text-white tracking-wide">
                    {currentPage === 'Home' ? 'Mission Control' : 
                     currentPage === 'Trends' ? 'Productivity Trends' : 
                     currentPage === 'Plan' ? 'Daily Planning' : 
                     currentPage === 'Test' ? 'System Tools' : 
                     currentPage === 'Settings' ? 'Preferences' : 'Focus Session'}
                </h1>
                {currentPage === 'Home' && <p className="text-gray-500 text-sm mt-1">Comparing intent vs reality.</p>}
            </div>
            <div className="flex items-center gap-4">
                {/* Logout Button (Top Right) */}
                <button 
                    onClick={logout}
                    className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Sign Out"
                >
                    <LogOut size={20} />
                </button>

                {isDataLoading && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-card rounded-full border border-border animate-in fade-in">
                        <Loader2 className="animate-spin text-accent-focus" size={14} />
                        <span className="text-xs text-gray-400">Syncing...</span>
                    </div>
                )}
                {!isDataLoading && connectionError && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 animate-in fade-in">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs text-red-400">Offline</span>
                    </div>
                )}
                <div className="text-right hidden sm:block border-l border-border pl-4">
                    <div className="text-sm font-medium text-white">{dayName}</div>
                    <div className="text-xs text-gray-500">{fullDate}</div>
                </div>
            </div>
        </header>

        {/* Home View (Dual Layer Timeline - Read Only) */}
        {currentPage === 'Home' && (
            <>
                <MetricsBar 
                    plannedMinutes={totalPlannedMinutes} 
                    actualMinutes={totalActualMinutes}
                    missedMinutes={missedMinutes}
                    unplannedMinutes={unplannedMinutes}
                    adherenceRate={adherenceRate}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[600px]">
                        <VerticalTimeline 
                            plannedBlocks={plannedBlocks} 
                            actualBlocks={actualBlocks}
                            categories={categories}
                            onAddBlock={() => {}}
                            isInteractive={false}
                            viewMode="review"
                        />
                    </div>
                    
                    <div className="lg:col-span-1 h-[600px] flex flex-col">
                        <CategoryBreakdown timeBlocks={actualBlocks} categories={categories} />
                    </div>
                </div>
            </>
        )}

        {currentPage === 'Plan' && (
             <div className="grid grid-cols-1 gap-6 h-[700px]">
                 <VerticalTimeline 
                    plannedBlocks={plannedBlocks} 
                    actualBlocks={[]} 
                    categories={categories}
                    onAddBlock={handleAddBlock} 
                    onDeleteBlock={handleDeleteBlock}
                    onUpdateBlock={handleUpdateBlock}
                    isInteractive={true}
                    viewMode="plan"
                    initialScrollTop={planScrollRef.current}
                    onScroll={(scrollTop) => { planScrollRef.current = scrollTop; }}
                 />
             </div>
        )}

        {currentPage === 'Trends' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Heatmap history={history} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card border border-border p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm mb-2">Today's Focus</h3>
                        <p className="text-2xl font-bold text-white">{formatDuration(currentFocusMinutes)}</p>
                        <p className="text-xs text-accent-focus mt-1">Deep Work Recorded</p>
                    </div>
                    <div className="bg-card border border-border p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm mb-2">Peak Focus Hour</h3>
                        <p className="text-2xl font-bold text-white">{peakFocusHour}</p>
                        <p className="text-xs text-gray-500 mt-1">Most productive time</p>
                    </div>
                    <div className="bg-card border border-border p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm mb-2">Schedule Adherence</h3>
                        <p className="text-2xl font-bold text-white">{adherenceRate}%</p>
                        <p className="text-xs text-accent-focus mt-1">Plan Execution Score</p>
                    </div>
                </div>
            </div>
        )}

        <div className={`transition-opacity duration-300 ${currentPage === 'Focus' ? 'block opacity-100' : 'hidden opacity-0 h-0 overflow-hidden'}`}>
             <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <div className="w-full max-w-3xl h-full">
                    <FocusTimer onTimerComplete={handleTimerComplete} isDevMode={isDevMode} />
                </div>
            </div>
        </div>

        {currentPage === 'Test' && isDevMode && (
            <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <BackendTest onDataChanged={() => fetchData()} />
            </div>
        )}
        
        {currentPage === 'Settings' && (
            <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <SettingsPage isDevMode={isDevMode} onToggleDevMode={setIsDevMode} />
            </div>
        )}

      </main>

      {showWarning && <ConnectionWarning onClose={() => setShowWarning(false)} />}
    </div>
  );
}