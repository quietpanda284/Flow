import React from 'react';
import { Clock } from 'lucide-react';

interface MetricsBarProps {
  totalWorkTime: string;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ totalWorkTime }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Total Work Time */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock size={64} className="text-accent-meeting" />
        </div>
        <h3 className="text-gray-400 text-sm font-medium mb-2">Total Work Time</h3>
        <div className="text-5xl font-mono text-white tracking-tight">
          {totalWorkTime}
        </div>
        <div className="mt-3 w-full bg-[#2a2d36] h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent-meeting to-blue-600 w-[75%]" />
        </div>
        <p className="text-xs text-gray-500 mt-2">Target: 8h 00m</p>
      </div>

      {/* Focus vs Break Ratio */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col justify-center">
        <h3 className="text-gray-400 text-sm font-medium mb-4">Ratio Analysis</h3>
        
        <div className="space-y-4">
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-white">Focus</span>
                    <span className="text-accent-focus">4h 12m</span>
                </div>
                <div className="w-full bg-[#2a2d36] h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-focus w-[70%]" />
                </div>
            </div>
            
            <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-white">Meetings</span>
                    <span className="text-accent-meeting">1h 45m</span>
                </div>
                <div className="w-full bg-[#2a2d36] h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-meeting w-[25%]" />
                </div>
            </div>

             <div>
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-white">Breaks</span>
                    <span className="text-accent-break">30m</span>
                </div>
                <div className="w-full bg-[#2a2d36] h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-break w-[5%]" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};