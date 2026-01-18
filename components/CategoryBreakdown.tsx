
import React, { useMemo } from 'react';
import { CATEGORY_COLORS, CATEGORY_TEXT_COLORS } from '../constants';
import { calculateCategoryStats } from '../utils/analytics';
import { PieChart, Monitor, Coffee, Grid } from 'lucide-react';
import { CategoryType, TimeBlock, Category } from '../types';

const getIcon = (type: CategoryType) => {
    switch(type) {
        case 'focus': return Monitor;
        case 'meeting': return PieChart;
        case 'break': return Coffee;
        default: return Grid;
    }
}

interface CategoryBreakdownProps {
    timeBlocks: TimeBlock[];
    categories: Category[];
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ timeBlocks, categories }) => {
  
  // Memoize the expensive calculation
  const stats = useMemo(() => {
    return calculateCategoryStats(timeBlocks, categories);
  }, [timeBlocks, categories]);

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">Day Breakdown</h2>
        <span className="text-xs text-gray-500 uppercase tracking-wider">Live Sync</span>
      </div>
      
      <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
        {stats.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-10">No activity recorded yet.</div>
        ) : (
            stats.map((cat) => {
                const Icon = getIcon(cat.type);
                const colorClass = CATEGORY_COLORS[cat.type] || CATEGORY_COLORS['other'];
                const textClass = CATEGORY_TEXT_COLORS[cat.type] || CATEGORY_TEXT_COLORS['other'];
                
                return (
                    <div key={cat.id} className="group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-opacity-10 ${colorClass}`}>
                                    <Icon size={16} className={textClass} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white group-hover:text-accent-focus transition-colors">
                                        {cat.label}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {cat.timeSpent}
                                    </div>
                                </div>
                            </div>
                            <span className={`text-sm font-bold ${textClass}`}>
                                {cat.percentage}%
                            </span>
                        </div>
                        {/* Bar */}
                        <div className="w-full bg-[#2a2d36] h-2 rounded-full overflow-hidden relative">
                            <div 
                                className={`h-full rounded-full ${colorClass.replace('bg-', 'bg-')}`} 
                                style={{ width: `${cat.percentage}%` }}
                            />
                            {/* Glow effect on the bar */}
                            <div 
                                className={`absolute top-0 bottom-0 w-2 blur-[4px] ${colorClass}`}
                                style={{ left: `calc(${cat.percentage}% - 4px)` }}
                            />
                        </div>
                    </div>
                )
            })
        )}
      </div>
    </div>
  );
};