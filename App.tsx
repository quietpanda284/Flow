
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetricsBar } from './components/MetricsBar';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { FocusTimer } from './components/FocusTimer';
import { VerticalTimeline } from './components/VerticalTimeline';
import { WeeklyView } from './components/WeeklyView';
import { DateController } from './components/DateController';
import { Heatmap } from './components/Heatmap';
import { BackendTest } from './components/BackendTest';
import { SettingsPage } from './components/SettingsPage';
import { AccountPage } from './components/AccountPage';
import { ConnectionWarning } from './components/ConnectionWarning';
import { LoginPage } from './components/LoginPage';
import { TimeBlock, Category } from './types';
import { getCategories, getActualBlocks, getPlannedBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock, getFocusHistory } from './services/api';
import { getPeakProductiveHour, getTotalProductiveMinutes, formatDuration, calculateScheduleMetrics } from './utils/analytics';
import { MASTER_CATEGORIES } from './constants';
import { Loader2 } from 'lucide-react';
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

  // Date & View State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

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

  // Helper to convert date to YYYY-MM-DD local
  const toDateStr = (d: Date) => {
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    return local.toISOString().split('T')[0];
  };

  const currentDateStr = toDateStr(currentDate);

  // Date Header formatting
  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Reset navigation to Home when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentPage('Home');
    }
  }, [user]);

  // Track the latest fetch request ID to ignore stale responses/errors
  const lastFetchIdRef = useRef(0);

  // Fetch logic extracted to function for reuse
  const fetchData = async (background = false) => {
    if (!user) return; // Don't fetch if not logged in
    
    // GUEST MODE: Skip backend, use defaults/local only
    if (user.isGuest) {
        if (!background) {
            setCategories(MASTER_CATEGORIES);
            setIsDataLoading(false);
        }
        return;
    }

    const fetchId = ++lastFetchIdRef.current;

    if (!background) setIsDataLoading(true);
    setConnectionError(false);
    
    // Calculate Date Range
    let startStr = currentDateStr;
    let endStr = undefined;

    if (viewMode === 'week') {
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(currentDate);
        monday.setDate(diff);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        startStr = toDateStr(monday);
        endStr = toDateStr(sunday);
    }

    try {
        const [cats, actual, planned, hist] = await Promise.all([
            getCategories(),
            getActualBlocks(startStr, endStr),
            getPlannedBlocks(startStr, endStr),
            getFocusHistory()
        ]);

        // If this is not the latest request, ignore the results
        if (fetchId !== lastFetchIdRef.current) return;

        setCategories(cats);
        setActualBlocks(actual);
        setPlannedBlocks(planned);
        setHistory(hist);
        setShowWarning(false);
    } catch (error) {
        // If this is not the latest request, ignore the error (prevent flashing)
        if (fetchId !== lastFetchIdRef.current) return;

        console.error("Failed to fetch data:", error);
        setConnectionError(true);
        if (!background) setShowWarning(true);
    } finally {
        // Only update loading state if this is the latest request
        if (fetchId === lastFetchIdRef.current) {
            setIsDataLoading(false);
        }
    }
  };

  // Initial Fetch & Update when date/view changes
  useEffect(() => {
    if (user) {
        fetchData(); 
    }
  }, [currentPage, user, currentDateStr, viewMode]); 
  
  // Polling
  useEffect(() => {
      if (!user) return;
      const intervalId = setInterval(() => {
            fetchData(true);
      }, 30000); 
      return () => clearInterval(intervalId);
  }, [user, currentDateStr, viewMode]);

  // Calculate advanced schedule metrics
  const { 
    missedMinutes, 
    unplannedMinutes, 
    adherenceRate,
    totalPlannedMinutes, 
    totalActualMinutes 
  } = useMemo(() => calculateScheduleMetrics(plannedBlocks, actualBlocks), [plannedBlocks, actualBlocks]);
  
  // Dynamic Trends Data
  const currentProductiveMinutes = getTotalProductiveMinutes(actualBlocks);
  const peakProductiveHour = getPeakProductiveHour(actualBlocks);

  const handleAddBlock = async (newBlock: TimeBlock) => {
    const blockWithDate = { ...newBlock, date: currentDateStr };
    const tempBlock = { ...blockWithDate };

    // GUEST MODE: Local only
    if (user?.isGuest) {
        setPlannedBlocks((prev) => [...prev, { ...tempBlock, id: `guest-${Date.now()}` }]);
        return;
    }

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
    
    // GUEST MODE: Local only
    if (user?.isGuest) return;

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
    
    // GUEST MODE: Local only
    if (user?.isGuest) return;

    try {
        const success = await updateTimeBlock(updatedBlock);
        if (!success) throw new Error("Update failed");
    } catch (e) {
        setPlannedBlocks(prevBlocks);
        setConnectionError(true);
        setShowWarning(true);
    }
  };

  // Called when Focus Timer finishes or saves
  const handleTimerComplete = (newBlock?: TimeBlock) => {
      // GUEST MODE: Manually update local state since backend is disabled
      if (user?.isGuest && newBlock) {
          setActualBlocks(prev => [...prev, newBlock]);
          
          // Update History for Heatmap locally
          setHistory(prev => {
              const dateStr = newBlock.date!;
              const minutes = newBlock.durationMinutes;
              const existingIndex = prev.findIndex(h => h.date === dateStr);
              if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = { ...updated[existingIndex], totalMinutes: updated[existingIndex].totalMinutes + minutes };
                  return updated;
              } else {
                  return [...prev, { date: dateStr, totalMinutes: minutes }];
              }
          });
      } else {
         fetchData(); 
      }
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
      <main className="pl-20 pr-8 py-8 min-h-screen max-w-[1600px] mx-auto relative">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-display font-bold text-white tracking-wide">
                    {currentPage === 'Home' ? 'Mission Control' : 
                     currentPage === 'Trends' ? 'Productivity Trends' : 
                     currentPage === 'Plan' ? 'Daily Planning' : 
                     currentPage === 'Test' ? 'System Tools' : 
                     currentPage === 'Settings' ? 'Preferences' : 
                     currentPage === 'Account' ? 'Account' :
                     'Focus Session'}
                </h1>
            </div>
            <div className="flex items-center gap-4">
                {!isDataLoading && connectionError && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 animate-in fade-in">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs text-red-400">Offline</span>
                    </div>
                )}
                {user.isGuest && (
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-accent-focus/10 rounded-full border border-accent-focus/20">
                        <div className="w-2 h-2 rounded-full bg-accent-focus" />
                        <span className="text-xs text-accent-focus font-bold uppercase tracking-wider">Guest Mode</span>
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
                {/* Metrics are only relevant for SINGLE DAY view usually, hide in weekly for simplicity or aggregate later */}
                {viewMode === 'day' && (
                    <MetricsBar 
                        plannedMinutes={totalPlannedMinutes} 
                        actualMinutes={totalActualMinutes}
                        missedMinutes={missedMinutes}
                        unplannedMinutes={unplannedMinutes}
                        adherenceRate={adherenceRate}
                    />
                )}
                
                {/* Date Navigation for Home View */}
                <DateController 
                    currentDate={currentDate} 
                    onDateChange={setCurrentDate} 
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[600px]">
                        {viewMode === 'week' ? (
                            <WeeklyView 
                                blocks={actualBlocks} 
                                currentDate={currentDate} 
                                categories={categories} 
                            />
                        ) : (
                            <VerticalTimeline 
                                plannedBlocks={plannedBlocks} 
                                actualBlocks={actualBlocks}
                                categories={categories}
                                onAddBlock={() => {}}
                                isInteractive={false}
                                viewMode="review"
                            />
                        )}
                    </div>
                    
                    <div className="lg:col-span-1 h-[600px] flex flex-col">
                        <CategoryBreakdown timeBlocks={actualBlocks} categories={categories} />
                    </div>
                </div>
            </>
        )}

        {currentPage === 'Plan' && (
             <div className="flex flex-col h-[700px]">
                 {/* Also add Date Controller to Plan page so they can plan future dates */}
                 <DateController 
                    currentDate={currentDate} 
                    onDateChange={setCurrentDate} 
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
                
                {viewMode === 'week' ? (
                    <div className="flex-1">
                        <WeeklyView 
                            blocks={plannedBlocks} 
                            currentDate={currentDate} 
                            categories={categories} 
                        />
                         <p className="text-xs text-center text-gray-500 mt-2">Switch to Day view to edit blocks</p>
                    </div>
                ) : (
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
                )}
             </div>
        )}

        {currentPage === 'Trends' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Heatmap history={history} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card border border-border p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm mb-2">Productivity</h3>
                        <p className="text-2xl font-bold text-white">{formatDuration(currentProductiveMinutes)}</p>
                        <p className="text-xs text-accent-focus mt-1">Total Work Recorded</p>
                    </div>
                    <div className="bg-card border border-border p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm mb-2">Peak Productive Hour</h3>
                        <p className="text-2xl font-bold text-white">{peakProductiveHour}</p>
                        <p className="text-xs text-gray-500 mt-1">Most active time</p>
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

        {currentPage === 'Test' && isDevMode && !user.isGuest && (
            <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <BackendTest onDataChanged={() => fetchData()} />
            </div>
        )}
        
        {currentPage === 'Settings' && (
            <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <SettingsPage isDevMode={isDevMode} onToggleDevMode={setIsDevMode} />
            </div>
        )}

        {currentPage === 'Account' && (
            <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <AccountPage />
            </div>
        )}

      </main>

      {showWarning && <ConnectionWarning onClose={() => setShowWarning(false)} />}
    </div>
  );
}
