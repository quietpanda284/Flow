
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetricsBar } from './components/MetricsBar';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { FocusTimer } from './components/FocusTimer';
import { VerticalTimeline } from './components/VerticalTimeline';
import { Heatmap } from './components/Heatmap';
import { MOCK_ACTUAL_BLOCKS, MOCK_PLANNED_BLOCKS, MASTER_CATEGORIES } from './constants';

export default function App() {
  const [currentPage, setCurrentPage] = useState('Home');

  const [actualBlocks] = useState(MOCK_ACTUAL_BLOCKS);
  const [plannedBlocks] = useState(MOCK_PLANNED_BLOCKS);
  const [categories] = useState(MASTER_CATEGORIES);

  // Simple stats calculation for the new metrics bar
  const totalPlannedMinutes = plannedBlocks.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalActualMinutes = actualBlocks.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  
  // Mock adherence rate for demo purposes (would be calculated by complex intersection logic)
  const adherenceRate = 82; 

  return (
    <div className="min-h-screen bg-background text-gray-200 font-sans selection:bg-accent-focus selection:text-black">
      <Sidebar activePage={currentPage} onNavigate={setCurrentPage} />
      
      {/* Main Content Area */}
      <main className="pl-24 pr-8 py-8 min-h-screen max-w-[1600px] mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {currentPage === 'Home' ? 'Mission Control' : 
                     currentPage === 'Trends' ? 'Productivity Trends' : 
                     currentPage === 'Plan' ? 'Daily Planning' : 'Focus Session'}
                </h1>
                {currentPage === 'Home' && <p className="text-gray-500 text-sm mt-1">Comparing intent vs reality.</p>}
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-white">Tuesday</div>
                    <div className="text-xs text-gray-500">October 24, 2023</div>
                </div>
            </div>
        </header>

        {/* Home View (Dual Layer Timeline) */}
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
                        <VerticalTimeline plannedBlocks={plannedBlocks} actualBlocks={actualBlocks} />
                    </div>
                    
                    {/* Sidebar Stats */}
                    <div className="lg:col-span-1 h-[600px] flex flex-col">
                        <CategoryBreakdown timeBlocks={actualBlocks} categories={categories} />
                    </div>
                </div>
            </>
        )}

        {/* Plan View (Simplified for Demo - reusing Timeline) */}
        {currentPage === 'Plan' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
                 <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white mb-2">Planning Interface</h2>
                        <p className="text-gray-500">Drag and drop blocks here to schedule your day.</p>
                        <p className="text-xs text-gray-600 mt-4">(Feature coming in next update)</p>
                    </div>
                 </div>
                 <VerticalTimeline plannedBlocks={plannedBlocks} actualBlocks={[]} />
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

      </main>
    </div>
  );
}
