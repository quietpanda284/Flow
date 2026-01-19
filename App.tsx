
import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetricsBar } from './components/MetricsBar';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { FocusTimer } from './components/FocusTimer';
import { VerticalTimeline } from './components/VerticalTimeline';
import { Heatmap } from './components/Heatmap';
import { BackendTest } from './components/BackendTest';
import { SettingsPage } from './components/SettingsPage';
import { ConnectionWarning } from './components/ConnectionWarning';
import { TimeBlock, Category } from './types';
import { getCategories, getActualBlocks, getPlannedBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock, getFocusHistory } from './services/api';
import { getPeakFocusHour, getTotalFocusMinutes, formatDuration, calculateScheduleMetrics } from './utils/analytics';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('Home');
  const [isDevMode, setIsDevMode] = useState(false); // Developer Mode State

  const [actualBlocks, setActualBlocks] = useState<TimeBlock[]>([]);
  const [plannedBlocks, setPlannedBlocks] = useState<TimeBlock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<{ date: string, totalMinutes: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Connection State
  const [connectionError, setConnectionError] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Date Formatting
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Fetch logic extracted to function for reuse
  const fetchData = async () => {
    // Only show global loading on first load or manual refresh, not background updates
    // setIsLoading(true); 
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
        setShowWarning(true);
        // Only clear if it's a hard fail and we have no data
        if (actualBlocks.length === 0) {
             setCategories([]);
             setActualBlocks([]);
             setPlannedBlocks([]);
             setHistory([]);
        }
    } finally {
        setIsLoading(false);
    }
  };

  // Initial Fetch
  useEffect(() => {
    setIsLoading(true); // Explicit loading for first mount
    fetchData();
  }, [currentPage]); 

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
    // Add today's date to block
    const blockWithDate = { ...newBlock, date: todayStr };

    // Optimistic Update
    const tempBlock = { ...blockWithDate };
    setPlannedBlocks((prev) => [...prev, tempBlock]);
    
    try {
        const savedBlock = await addTimeBlock(blockWithDate, true);
        // Replace temp ID with real ID
        setPlannedBlocks((prev) => prev.map(b => b.id === tempBlock.id ? savedBlock : b));
    } catch (e) {
        console.error("Failed to save block", e);
        // Revert
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

  // Callback for when timer completes
  const handleTimerComplete = () => {
      fetchData(); // Refresh data to show new block in timeline/trends
  };

  return (
    <div className="min-h-screen bg-background text-gray-200 font-sans selection:bg-accent-focus selection:text-black">
      <Sidebar activePage={currentPage} onNavigate={setCurrentPage} isDevMode={isDevMode} />
      
      {/* Main Content Area */}
      <main className="pl-24 pr-8 py-8 min-h-screen max-w-[1600px] mx-auto relative">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {currentPage === 'Home' ? 'Mission Control' : 
                     currentPage === 'Trends' ? 'Productivity Trends' : 
                     currentPage === 'Plan' ? 'Daily Planning' : 
                     currentPage === 'Test' ? 'System Tools' : 
                     currentPage === 'Settings' ? 'Preferences' : 'Focus Session'}
                </h1>
                {currentPage === 'Home' && <p className="text-gray-500 text-sm mt-1">Comparing intent vs reality.</p>}
            </div>
            <div className="flex items-center gap-4">
                {/* Non-intrusive loading indicator */}
                {isLoading && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-card rounded-full border border-border animate-in fade-in">
                        <Loader2 className="animate-spin text-accent-focus" size={14} />
                        <span className="text-xs text-gray-400">Syncing...</span>
                    </div>
                )}
                {/* Connection Status Indicator */}
                {!isLoading && connectionError && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full border border-red-500/20 animate-in fade-in">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs text-red-400">Offline</span>
                    </div>
                )}
                <div className="text-right hidden sm:block">
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
                    {/* Main Feed - Timeline with Ghost Overlay */}
                    <div className="lg:col-span-2 h-[600px]">
                        <VerticalTimeline 
                            plannedBlocks={plannedBlocks} 
                            actualBlocks={actualBlocks}
                            categories={categories}
                            onAddBlock={() => {}} // No-op for read-only
                            isInteractive={false}
                            viewMode="review"
                        />
                    </div>
                    
                    {/* Sidebar Stats */}
                    <div className="lg:col-span-1 h-[600px] flex flex-col">
                        <CategoryBreakdown timeBlocks={actualBlocks} categories={categories} />
                    </div>
                </div>
            </>
        )}

        {/* Plan View (Interactive - Solid Blocks) */}
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
                 />
             </div>
        )}

        {/* Trends View */}
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

        {/* Focus Timer View - PERSISTENT: Uses CSS visibility to maintain state */}
        <div className={`transition-opacity duration-300 ${currentPage === 'Focus' ? 'block opacity-100' : 'hidden opacity-0 h-0 overflow-hidden'}`}>
             <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <div className="w-full max-w-3xl h-full">
                    <FocusTimer onTimerComplete={handleTimerComplete} />
                </div>
            </div>
        </div>

        {/* Test / Admin View - Only if enabled */}
        {currentPage === 'Test' && isDevMode && (
            <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <BackendTest />
            </div>
        )}
        
        {/* Settings View */}
        {currentPage === 'Settings' && (
            <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <SettingsPage isDevMode={isDevMode} onToggleDevMode={setIsDevMode} />
            </div>
        )}

      </main>

      {/* Floating Warnings */}
      {showWarning && <ConnectionWarning onClose={() => setShowWarning(false)} />}
    </div>
  );
}
