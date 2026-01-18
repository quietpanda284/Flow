import React from 'react';

const DAYS_IN_YEAR = 365;
const WEEKS = 52;
const DAYS_PER_WEEK = 7;

// Generate deterministic random data for the demo
const generateHeatmapData = () => {
  const data = [];
  const today = new Date();
  for (let i = 0; i < DAYS_IN_YEAR; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (DAYS_IN_YEAR - i));
    
    // Create some realistic patterns (weekends lighter, weekdays heavier)
    const dayOfWeek = date.getDay();
    let intensity = Math.floor(Math.random() * 5); // 0-4
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        intensity = Math.random() > 0.8 ? 1 : 0; // Mostly 0 on weekends
    } else {
        // Bias towards higher intensity on weekdays
        intensity = Math.max(1, Math.floor(Math.random() * 5)); 
    }

    data.push({ date, intensity });
  }
  return data;
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

export const Heatmap: React.FC = () => {
  const data = generateHeatmapData();
  
  // Group by weeks for the grid layout
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center w-full overflow-x-auto custom-scrollbar">
      <div className="w-full max-w-5xl">
        <div className="flex justify-between items-end mb-6">
            <div>
                <h2 className="text-xl font-bold text-white mb-1">Focus Consistency</h2>
                <p className="text-sm text-gray-500">2,402 minutes of deep work in the last year</p>
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
                    className={`w-3 h-3 rounded-sm hover:ring-1 hover:ring-white transition-all cursor-pointer relative group ${getColor(day.intensity)}`}
                >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                        {day.date.toDateString()}
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