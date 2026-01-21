
import React from 'react';
import { TimeBlock } from '../types';
import { CATEGORY_COLORS } from '../constants';

interface WeeklyViewProps {
    blocks: TimeBlock[];
    currentDate: Date;
    categories: any[];
}

export const WeeklyView: React.FC<WeeklyViewProps> = ({ blocks, currentDate }) => {
    const startHour = 6; // Start at 6 AM to fit more relevant time
    const endHour = 22;  // End at 10 PM
    const hourHeight = 40; // Condensed height for dense data
    const totalHeight = (endHour - startHour) * hourHeight;

    // Get Mon-Sun dates for the current week
    const getWeekDays = () => {
        const day = currentDate.getDay(); // 0 (Sun) - 6 (Sat)
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday (make Monday start)
        
        const days = [];
        const monday = new Date(currentDate);
        monday.setDate(diff);

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const weekDays = getWeekDays();

    // Helper: Get local date string 'YYYY-MM-DD'
    const toDateStr = (d: Date) => {
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - (offset * 60 * 1000));
        return local.toISOString().split('T')[0];
    };

    // Helper: Position logic
    const getPosition = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        const totalMinutes = (h - startHour) * 60 + m;
        return Math.max(0, (totalMinutes / 60) * hourHeight);
    };

    const getHeight = (minutes: number) => {
        return (minutes / 60) * hourHeight;
    };

    // Helper: Is today?
    const isToday = (d: Date) => {
        const now = new Date();
        return d.toDateString() === now.toDateString();
    };

    return (
        <div className="bg-card border border-border rounded-xl flex flex-col h-full overflow-hidden">
            {/* Header: Days */}
            <div className="grid grid-cols-8 border-b border-border bg-[#0f1117]">
                {/* Time Column Header */}
                <div className="p-3 border-r border-border text-xs font-bold text-gray-500 text-center flex items-center justify-center">
                    GMT{currentDate.getTimezoneOffset() / -60 > 0 ? '+' : ''}{currentDate.getTimezoneOffset() / -60}
                </div>
                
                {/* Days Headers */}
                {weekDays.map((date, i) => (
                    <div key={i} className={`p-3 border-r border-border last:border-0 flex flex-col items-center justify-center ${isToday(date) ? 'bg-accent-focus/5' : ''}`}>
                        <span className={`text-xs font-bold uppercase mb-1 ${isToday(date) ? 'text-accent-focus' : 'text-gray-400'}`}>
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isToday(date) ? 'bg-accent-focus text-black' : 'text-white'}`}>
                            {date.getDate()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1a1d24] relative">
                 <div className="grid grid-cols-8" style={{ height: `${totalHeight}px` }}>
                    
                    {/* 1. Time Labels Column */}
                    <div className="border-r border-border bg-[#0f1117]">
                        {Array.from({ length: endHour - startHour }).map((_, i) => (
                            <div key={i} className="border-b border-border/30 text-[10px] text-gray-500 pr-2 flex items-start justify-end pt-1" style={{ height: `${hourHeight}px` }}>
                                {(startHour + i).toString().padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>

                    {/* 2. Days Columns */}
                    {weekDays.map((dayDate, i) => {
                        const dateStr = toDateStr(dayDate);
                        // Filter blocks for this day
                        const dayBlocks = blocks.filter(b => b.date === dateStr);

                        return (
                            <div key={i} className={`relative border-r border-border/30 last:border-0 ${isToday(dayDate) ? 'bg-white/[0.02]' : ''}`}>
                                {/* Grid Lines */}
                                {Array.from({ length: endHour - startHour }).map((_, h) => (
                                    <div key={h} className="border-b border-border/30" style={{ height: `${hourHeight}px` }} />
                                ))}

                                {/* Render Blocks */}
                                {dayBlocks.map((block) => {
                                    // Skip blocks entirely outside range
                                    const [bh] = block.startTime.split(':').map(Number);
                                    if (bh < startHour || bh >= endHour) return null;

                                    return (
                                        <div
                                            key={block.id}
                                            className={`absolute left-1 right-1 rounded px-1.5 py-0.5 text-[10px] overflow-hidden border-l-2 ${CATEGORY_COLORS[block.type]} bg-opacity-30 border-opacity-100 hover:brightness-110 transition-all cursor-pointer`}
                                            style={{
                                                top: `${getPosition(block.startTime)}px`,
                                                height: `${Math.max(16, getHeight(block.durationMinutes))}px`, // min height for visibility
                                                borderColor: block.type === 'focus' ? '#00FF94' : block.type === 'meeting' ? '#4D96FF' : block.type === 'break' ? '#FFB347' : '#A0A0A0',
                                            }}
                                            title={`${block.title} (${block.startTime} - ${block.endTime})`}
                                        >
                                            <div className="font-bold truncate text-white leading-tight">{block.title}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}

                 </div>
            </div>
        </div>
    );
};
