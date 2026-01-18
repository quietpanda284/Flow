import React from 'react';
import { Target, Activity } from 'lucide-react';

interface MetricsBarProps {
  plannedMinutes: number;
  actualMinutes: number;
  adherenceRate: number; // 0-100
}

const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
};

export const MetricsBar: React.FC<MetricsBarProps> = ({ plannedMinutes, actualMinutes, adherenceRate }) => {
  const ratio = plannedMinutes > 0 ? (actualMinutes / plannedMinutes) * 100 : 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Commitment Ratio (Work Volume) */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target size={64} className="text-accent-focus" />
        </div>
        
        <div className="flex justify-between items-end mb-2">
            <div>
                <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Commitment Ratio</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-mono text-white tracking-tight font-bold">
                        {Math.round(ratio)}%
                    </span>
                    <span className="text-sm text-gray-500 font-light italic">
                         of {formatDuration(plannedMinutes)} planned
                    </span>
                </div>
            </div>
            <div className="text-right">
                 <div className="text-sm text-accent-focus font-medium">{formatDuration(actualMinutes)}</div>
                 <div className="text-[10px] text-gray-600 uppercase">Actual</div>
            </div>
        </div>

        {/* Progress Bar with Target Marker */}
        <div className="mt-2 w-full bg-[#2a2d36] h-2 rounded-full overflow-hidden relative">
            {/* The Actual Bar */}
            <div 
                className="h-full bg-gradient-to-r from-accent-focus to-emerald-600 transition-all duration-1000 ease-out" 
                style={{ width: `${Math.min(ratio, 100)}%` }}
            />
            {/* The Target Line (always at 100% of the bar width if we treat bar as Plan, but here we treat bar as max(Plan, Actual). 
                Let's simplify: Bar is 0-100% of Plan. If over 100, it stays full. 
            */}
        </div>
      </div>

      {/* Adherence Rate (Schedule Fidelity) */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity size={64} className="text-purple-400" />
        </div>

        <div className="flex justify-between items-center h-full">
            <div>
                 <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Adherence Rate</h3>
                 <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 shrink-0">
                        <svg viewBox="0 0 64 64" className="w-full h-full transform -rotate-90">
                            <circle cx="32" cy="32" r="28" stroke="#2a2d36" strokeWidth="6" fill="transparent" />
                            <circle 
                                cx="32" cy="32" r="28" 
                                stroke={adherenceRate > 80 ? '#00FF94' : adherenceRate > 50 ? '#FFB347' : '#EF4444'} 
                                strokeWidth="6" 
                                fill="transparent" 
                                strokeDasharray={2 * Math.PI * 28}
                                strokeDashoffset={2 * Math.PI * 28 * (1 - adherenceRate / 100)}
                                className="transition-all duration-1000 ease-out"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                            {Math.round(adherenceRate)}%
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-gray-300">Schedule Fidelity</span>
                        <span className="text-xs text-gray-500">
                            {adherenceRate > 80 ? 'High Discipline' : 'deviating from plan'}
                        </span>
                    </div>
                 </div>
            </div>
            
            <div className="space-y-2 text-right">
                <div className="text-xs">
                    <span className="text-gray-500 block">Missed Blocks</span>
                    <span className="text-white font-mono">1.5h</span>
                </div>
                <div className="text-xs">
                    <span className="text-gray-500 block">Unplanned Work</span>
                    <span className="text-white font-mono text-accent-break">45m</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};