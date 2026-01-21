
import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Grip } from 'lucide-react';

interface DateControllerProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    viewMode: 'day' | 'week';
    onViewModeChange: (mode: 'day' | 'week') => void;
}

export const DateController: React.FC<DateControllerProps> = ({ 
    currentDate, 
    onDateChange,
    viewMode,
    onViewModeChange
}) => {
    
    // Helper: Is it today?
    const isToday = (d: Date) => {
        const now = new Date();
        return d.getDate() === now.getDate() && 
               d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear();
    };

    const handlePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() - 1);
        } else {
            newDate.setDate(newDate.getDate() - 7);
        }
        onDateChange(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'day') {
            newDate.setDate(newDate.getDate() + 1);
        } else {
            newDate.setDate(newDate.getDate() + 7);
        }
        onDateChange(newDate);
    };

    const handleToday = () => {
        onDateChange(new Date());
    };

    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [y, m, d] = e.target.value.split('-').map(Number);
        // Create date in local time
        const newDate = new Date(y, m - 1, d);
        onDateChange(newDate);
    };

    // Format display string
    const getDisplayString = () => {
        if (viewMode === 'day') {
            return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        } else {
            // Calculate start/end of week (Monday start)
            const day = currentDate.getDay();
            const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            const monday = new Date(currentDate);
            monday.setDate(diff);
            
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            
            return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
    };

    // Input string YYYY-MM-DD
    const inputDateStr = currentDate.toISOString().split('T')[0];

    return (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-card border border-border rounded-xl p-3 mb-6 shadow-lg animate-in fade-in slide-in-from-top-2">
            {/* Left: Navigation */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={handlePrevious}
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronLeft size={18} />
                </button>
                
                <button 
                    onClick={handleToday}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${isToday(currentDate) ? 'bg-accent-focus text-black' : 'bg-[#0f1117] border border-[#2a2d36] text-gray-400 hover:text-white'}`}
                >
                    Today
                </button>
                
                <button 
                    onClick={handleNext}
                    className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Center: Date Display & Picker */}
            <div className="flex items-center gap-3 relative group">
                <h2 className="text-lg font-bold text-white tracking-tight min-w-[200px] text-center">
                    {getDisplayString()}
                </h2>
                
                {/* Hidden Date Input acting as a picker trigger */}
                <div className="relative">
                    <Calendar size={16} className="text-gray-500 group-hover:text-accent-focus transition-colors cursor-pointer pointer-events-none" />
                    <input 
                        type="date" 
                        value={inputDateStr}
                        onChange={handleDateInput}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    />
                </div>
            </div>

            {/* Right: View Switcher */}
            <div className="flex bg-[#0f1117] p-1 rounded-lg border border-[#2a2d36]">
                <button
                    onClick={() => onViewModeChange('day')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'day' ? 'bg-[#2a2d36] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Day
                </button>
                <button
                    onClick={() => onViewModeChange('week')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'week' ? 'bg-[#2a2d36] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Week
                </button>
            </div>
        </div>
    );
};
