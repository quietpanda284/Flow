import React, { useRef, useEffect } from 'react';
import { MOCK_TIME_BLOCKS, CATEGORY_COLORS } from '../constants';
import { TimeBlock } from '../types';

export const Timeline: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Time markers from 8:00 to 18:00
  const startHour = 8;
  const endHour = 18;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const totalMinutes = (endHour - startHour) * 60;
  const pxPerMinute = 2.5; // Controls the width of the timeline
  const timelineWidth = totalMinutes * pxPerMinute;

  // Center the timeline on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
        // Scroll to 9am roughly
        scrollContainerRef.current.scrollLeft = 60 * pxPerMinute; 
    }
  }, [pxPerMinute]);

  const getLeftPosition = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = (h - startHour) * 60 + m;
    return totalMins * pxPerMinute;
  };

  const getWidth = (minutes: number) => {
    return minutes * pxPerMinute;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6 overflow-hidden flex flex-col h-[320px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-white">Timeline</h2>
        <div className="flex gap-4 text-xs font-medium">
             <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-accent-focus"></div>
                 <span className="text-gray-400">Focus</span>
             </div>
             <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-accent-meeting"></div>
                 <span className="text-gray-400">Meeting</span>
             </div>
             <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-accent-break"></div>
                 <span className="text-gray-400">Break</span>
             </div>
        </div>
      </div>

      <div 
        className="flex-1 overflow-x-auto relative custom-scrollbar select-none"
        ref={scrollContainerRef}
      >
        <div className="relative h-full" style={{ width: `${timelineWidth}px` }}>
          
          {/* Hour Markers */}
          {hours.map((hour) => (
            <div 
                key={hour} 
                className="absolute top-0 bottom-0 border-l border-[#2a2d36] flex flex-col justify-between py-2"
                style={{ left: `${(hour - startHour) * 60 * pxPerMinute}px` }}
            >
                <span className="text-xs text-gray-500 pl-2">{hour}:00</span>
                <div className="h-full w-px bg-[#2a2d36]/50 mx-[-0.5px]"></div>
            </div>
          ))}

          {/* Current Time Indicator (Static for demo) */}
          <div 
             className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
             style={{ left: getLeftPosition('14:15') }}
          >
             <div className="absolute -top-1 -translate-x-1/2 bg-red-500 text-white text-[10px] px-1 rounded">Now</div>
          </div>

          {/* Blocks */}
          <div className="absolute top-12 bottom-4 left-0 right-0">
            {MOCK_TIME_BLOCKS.map((block) => (
              <div
                key={block.id}
                className={`absolute top-2 bottom-2 rounded-lg border border-white/5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:z-10 hover:shadow-xl cursor-pointer group overflow-hidden ${
                   CATEGORY_COLORS[block.type]
                } bg-opacity-20 hover:bg-opacity-30 border-l-4`}
                style={{
                  left: `${getLeftPosition(block.startTime)}px`,
                  width: `${getWidth(block.durationMinutes)}px`,
                  borderColor: block.type === 'focus' ? '#00FF94' : block.type === 'meeting' ? '#4D96FF' : block.type === 'break' ? '#FFB347' : '#A0A0A0'
                }}
              >
                <div className="p-3 h-full flex flex-col justify-center">
                    <span className="text-xs font-bold text-white truncate drop-shadow-md">
                        {block.title}
                    </span>
                    <span className="text-[10px] text-gray-300 truncate opacity-80 flex items-center gap-1">
                       {block.app} • {block.durationMinutes}m
                    </span>
                    
                    {/* Hover Detail */}
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-xs font-medium text-white px-2 text-center">
                            {block.startTime} - {block.endTime}
                         </span>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};