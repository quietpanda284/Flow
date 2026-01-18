import React, { useRef, useEffect } from 'react';
import { CATEGORY_COLORS } from '../constants';
import { TimeBlock } from '../types';

interface VerticalTimelineProps {
  plannedBlocks: TimeBlock[];
  actualBlocks: TimeBlock[];
}

export const VerticalTimeline: React.FC<VerticalTimelineProps> = ({ plannedBlocks, actualBlocks }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Config
  const startHour = 8; // 08:00
  const endHour = 18; // 18:00
  const hourHeight = 80; // px per hour
  const totalHeight = (endHour - startHour) * hourHeight;

  // Scroll to current time or 9am on mount
  useEffect(() => {
    if (containerRef.current) {
        containerRef.current.scrollTop = hourHeight * 1; // Scroll to 09:00
    }
  }, []);

  const getPosition = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = (h - startHour) * 60 + m;
    return (totalMinutes / 60) * hourHeight;
  };

  const getHeight = (minutes: number) => {
    return (minutes / 60) * hourHeight;
  };

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col h-full relative overflow-hidden">
      <div className="flex justify-between items-center p-6 border-b border-border bg-card z-20">
        <h2 className="text-lg font-semibold text-white">Timeline <span className="text-gray-500 font-normal text-sm ml-2">Plan vs Actual</span></h2>
        <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-dashed border-gray-500 bg-gray-500/20"></div>
                <span className="text-gray-400">Planned</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-accent-focus"></div>
                <span className="text-white">Actual</span>
            </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative flex-1 overflow-y-auto custom-scrollbar bg-[#0f1117]"
      >
        <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
            
            {/* Grid Lines & Time Labels */}
            {hours.map((hour) => (
                <div 
                    key={hour} 
                    className="absolute w-full border-t border-[#2a2d36]/50 flex items-start"
                    style={{ top: `${(hour - startHour) * hourHeight}px` }}
                >
                    <span className="text-xs text-gray-500 w-16 text-right pr-4 -mt-2.5 font-mono">
                        {hour}:00
                    </span>
                    <div className="flex-1"></div>
                </div>
            ))}

            {/* Current Time Indicator (Static Demo: 14:15) */}
            <div 
                className="absolute w-full border-t-2 border-red-500 z-30 pointer-events-none"
                style={{ top: `${getPosition('14:15')}px` }}
            >
                <div className="absolute left-16 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
            </div>

            {/* PLANNED BLOCKS (Ghost Layer) */}
            {plannedBlocks.map((block) => (
                <div
                    key={`plan-${block.id}`}
                    className="absolute left-20 right-4 rounded-lg border-2 border-dashed border-opacity-30 flex flex-col justify-center px-3 z-0"
                    style={{
                        top: `${getPosition(block.startTime)}px`,
                        height: `${getHeight(block.durationMinutes)}px`,
                        borderColor: '#6b7280', // Gray-500
                        backgroundColor: 'rgba(31, 41, 55, 0.3)', // Gray-800/30
                    }}
                >
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold truncate opacity-70">
                        {block.title}
                    </div>
                </div>
            ))}

            {/* ACTUAL BLOCKS (Execution Layer) */}
            {actualBlocks.map((block) => (
                <div
                    key={`actual-${block.id}`}
                    className={`absolute left-24 right-8 rounded-md shadow-lg flex flex-col justify-center px-3 z-10 border-l-4 transition-all hover:scale-[1.01] cursor-pointer group ${CATEGORY_COLORS[block.type]} bg-opacity-20 border-opacity-100 backdrop-blur-sm`}
                    style={{
                        top: `${getPosition(block.startTime)}px`,
                        height: `${getHeight(block.durationMinutes)}px`,
                        borderColor: block.type === 'focus' ? '#00FF94' : block.type === 'meeting' ? '#4D96FF' : '#A0A0A0'
                    }}
                >
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white truncate shadow-black drop-shadow-md">
                            {block.title}
                        </span>
                        <span className="text-[10px] font-mono text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                            {block.durationMinutes}m
                        </span>
                    </div>
                    {getHeight(block.durationMinutes) > 40 && ( // Only show sub-details if block is tall enough
                         <span className="text-[10px] text-gray-300 truncate opacity-80">
                            {block.app}
                        </span>
                    )}
                </div>
            ))}

        </div>
      </div>
    </div>
  );
};