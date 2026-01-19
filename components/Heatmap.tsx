
import React, { useMemo } from 'react';

const DAYS_IN_YEAR = 365;

interface HeatmapProps {
  history: { date: string, totalMinutes: number }[];
}

// Map minutes to intensity level (0-4)
const calculateIntensity = (minutes: number) => {
    if (minutes === 0) return 0;
    if (minutes < 60) return 1;   // < 1 hour
    if (minutes < 180) return 2;  // < 3 hours
    if (minutes < 300) return 3;  // < 5 hours
    return 4;                     // 5+ hours
};

const getColor = (intensity: number) => {
  switch (intensity) {
    case 0: return 'bg-[#2a2d36]'; // Empty/Dark
    case 1: return 'bg-[#0e4429]'; // Very Low Green
    case 2: return 'bg-[#006d32]'; // Low Green
    case 3: return 'bg-[#26a641]'; // Mid Green
    case 4: return 'bg-[#00FF94]'; // High Neon Green
    default: return 'bg-[#2a2d36]';
  }
};

export const Heatmap: React.FC<HeatmapProps> = ({ history }) => {
  
  const { weeks, totalMinutes } = useMemo(() => {
    const today = new Date();
    const data = [];
    let grandTotal = 0;

    // Create a Map for O(1) lookups: 'YYYY-MM-DD' -> minutes
    const historyMap = new Map<string, number>();
    history.forEach(item => {
        historyMap.set(item.date, item.totalMinutes);
        grandTotal += item.totalMinutes; // Note: this sums the provided history, which might be less than 365 days
    });

    // Generate last 365 days
    for (let i = 0; i < DAYS_IN_YEAR; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (DAYS_IN_YEAR - 1 - i));
        
        const dateStr = date.toISOString().split('T')[0];
        const minutes = historyMap.get(dateStr) || 0;
        const intensity = calculateIntensity(minutes);
        
        // Check if it matches today to highlight
        const isToday = i === DAYS_IN_YEAR - 1;

        data.push({ date, intensity, minutes, isToday });
    }

    // Group by weeks for the grid layout
    const weeksArr = [];
    for (let i = 0; i < data.length; i += 7) {
        weeksArr.push(data.slice(i, i + 7));
    }

    return { weeks: weeksArr, totalMinutes: grandTotal };
  }, [history]);

  return (
    <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center w-full overflow-x-auto custom-scrollbar">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-end mb-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Focus Consistency</h2>
                <p className="text-sm text-gray-500">{totalMinutes.toLocaleString()} minutes of deep work recorded</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Less</span>
                <div className={`w-3 h-3 rounded-sm ${getColor(0)}`} />
                <div className={`w-3 h-3 rounded-sm ${getColor(1)}`} />
                <div className={`w-3 h-3 rounded-sm ${getColor(2)}`} />
                <div className={`w-3 h-3 rounded-sm ${getColor(3)}`} />
                <div className={`w-3 h-3 rounded-sm ${getColor(4)}`} />
                <span>More</span>
            </div>
        </div>

        <div className="flex gap-1 justify-center sm:justify-start">
            {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded-sm hover:ring-1 hover:ring-white transition-all cursor-pointer relative group ${getColor(day.intensity)} ${day.isToday ? 'ring-1 ring-white ring-offset-1 ring-offset-[#0f1117]' : ''}`}
                >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-gray-700">
                        <div className="font-bold">{day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</div>
                        <div className="text-gray-400">{day.minutes}m focus</div>
                    </div>
                </div>
                ))}
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};
