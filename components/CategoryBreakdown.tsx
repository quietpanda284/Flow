import React from 'react';
import { MOCK_CATEGORIES, CATEGORY_COLORS, CATEGORY_TEXT_COLORS } from '../constants';
import { PieChart, Monitor, Coffee, MessageSquare, Grid } from 'lucide-react';
import { CategoryType } from '../types';

const getIcon = (type: CategoryType) => {
    switch(type) {
        case 'focus': return Monitor;
        case 'meeting': return PieChart;
        case 'break': return Coffee;
        case 'communication': return MessageSquare;
        default: return Grid;
    }
}

export const CategoryBreakdown: React.FC = () => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-6">Day Breakdown</h2>
      
      <div className="flex-1 space-y-6">
        {MOCK_CATEGORIES.map((cat) => {
            const Icon = getIcon(cat.type);
            const colorClass = CATEGORY_COLORS[cat.type];
            const textClass = CATEGORY_TEXT_COLORS[cat.type];
            
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
        })}
      </div>
    </div>
  );
};