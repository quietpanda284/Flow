import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MetricsBar } from './components/MetricsBar';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { FocusTimer } from './components/FocusTimer';

export default function App() {
  const [currentPage, setCurrentPage] = useState('Home');

  return (
    <div className="min-h-screen bg-background text-gray-200 font-sans selection:bg-accent-focus selection:text-black">
      <Sidebar activePage={currentPage} onNavigate={setCurrentPage} />
      
      {/* Main Content Area */}
      <main className="pl-24 pr-8 py-8 min-h-screen max-w-[1600px] mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {currentPage === 'Home' ? 'Welcome back, Alex' : 'Focus Session'}
                </h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-white">Tuesday</div>
                    <div className="text-xs text-gray-500">October 24, 2023</div>
                </div>
            </div>
        </header>

        {/* Home View */}
        {currentPage === 'Home' && (
            <>
                <MetricsBar totalWorkTime="06:42:15" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 flex flex-col gap-6">
                        <CategoryBreakdown />
                    </div>
                </div>
            </>
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