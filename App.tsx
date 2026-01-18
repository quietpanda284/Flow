
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetricsBar } from './components/MetricsBar';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { FocusTimer } from './components/FocusTimer';
import { VerticalTimeline } from './components/VerticalTimeline';
import { Heatmap } from './components/Heatmap';
import { BackendTest } from './components/BackendTest';
import { SettingsPage } from './components/SettingsPage';
import { TimeBlock, Category } from './types';
import { getCategories, getActualBlocks, getPlannedBlocks, addTimeBlock, updateTimeBlock, deleteTimeBlock } from './services/api';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('Home');
  const [isDevMode, setIsDevMode] = useState(false); // Developer Mode State

  const [actualBlocks, setActualBlocks] = useState<TimeBlock[]>([]);
  const [plannedBlocks, setPlannedBlocks] = useState<TimeBlock[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const [cats, actual, planned] = await Promise.all([
            getCategories(),
            getActualBlocks(),
            getPlannedBlocks()
        ]);
        setCategories(cats);
        setActualBlocks(actual);
        setPlannedBlocks(planned);
        setIsLoading(false);
    };
    fetchData();
  }, [currentPage]); // Reload data when navigating, useful after testing resets

  // Simple stats calculation for the new metrics bar
  const totalPlannedMinutes = plannedBlocks.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalActualMinutes = actualBlocks.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  
  // Mock adherence rate for demo purposes
  const adherenceRate = 82; 

  const handleAddBlock = async (newBlock: TimeBlock) => {
    // Optimistic Update
    const tempBlock = { ...newBlock };
    setPlannedBlocks((prev) => [...prev, tempBlock]);
    
    try {
        const savedBlock = await addTimeBlock(newBlock, true);
        // Replace temp ID with real ID
        setPlannedBlocks((prev) => prev.map(b => b.id === tempBlock.id ? savedBlock : b));
    } catch (e) {
        console.error("Failed to save block", e);
        // Revert
        setPlannedBlocks((prev) => prev.filter(b => b.id !== tempBlock.id));
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    const prevBlocks = [...plannedBlocks];
    setPlannedBlocks((prev) => prev.filter((b) => b.id !== blockId));
    
    const success = await deleteTimeBlock(blockId);
    if (!success) {
        setPlannedBlocks(prevBlocks);
    }
  };

  const handleUpdateBlock = async (updatedBlock: TimeBlock) => {
    const prevBlocks = [...plannedBlocks];
    setPlannedBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
    
    const success = await updateTimeBlock(updatedBlock);
    if (!success) {
        setPlannedBlocks(prevBlocks);
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-200 font-sans selection:bg-accent-focus selection:text-black">
      <Sidebar activePage={currentPage} onNavigate={setCurrentPage} isDevMode={isDevMode} />
      
      {/* Main Content Area */}
      <main className="pl-24 pr-8 py-8 min-h-screen max-w-[1600px] mx-auto">
        
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
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-white">Tuesday</div>
                    <div className="text-xs text-gray-500">October 24, 2023</div>
                </div>
            </div>
        </header>

        {/* Home View (Dual Layer Timeline - Read Only) */}
        {currentPage === 'Home' && (
            <>
                <MetricsBar 
                    plannedMinutes={totalPlannedMinutes} 
                    actualMinutes={totalActualMinutes}
                    adherenceRate={adherenceRate}
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Feed - Timeline with Ghost Overlay */}
                    <div className="lg:col-span-2 h-[600px]">
                        <VerticalTimeline 
                            plannedBlocks={plannedBlocks} 
                            actualBlocks={actualBlocks} 
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
                <Heatmap />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card border border-border p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm mb-2">Best Day</h3>
                        <p className="text-2xl font-bold text-white">Wednesday</p>
                        <p className="text-xs text-accent-focus mt-1">+12% vs avg</p>
                    </div>
                    <div className="bg-card border border-border p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm mb-2">Peak Focus Hour</h3>
                        <p className="text-2xl font-bold text-white">10:00 AM</p>
                        <p className="text-xs text-gray-500 mt-1">Consistent for 3 weeks</p>
                    </div>
                    <div className="bg-card border border-border p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm mb-2">Current Streak</h3>
                        <p className="text-2xl font-bold text-white">8 Days</p>
                        <p className="text-xs text-accent-focus mt-1">Keep it up!</p>
                    </div>
                </div>
            </div>
        )}

        {/* Focus Timer View */}
        {currentPage === 'Focus' && (
            <div className="flex items-center justify-center min-h-[600px] h-[calc(100vh-160px)]">
                <div className="w-full max-w-3xl h-full">
                    <FocusTimer />
                </div>
            </div>
        )}

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
    </div>
  );
}
