import React from 'react';
import { Minus, X, Square } from 'lucide-react';

export const WindowControls: React.FC = () => {
    const handleControl = (action: 'minimize' | 'maximize' | 'close') => {
        if ((window as any).electron) {
            (window as any).electron.send('window-control', action);
        }
    };

    return (
        <div className="fixed top-2 right-2 z-[100] flex items-center gap-2 drag-none">
             <button 
                onClick={() => handleControl('minimize')} 
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                title="Minimize"
             >
                <Minus size={18} />
             </button>
             <button 
                onClick={() => handleControl('maximize')} 
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
                 title="Maximize"
             >
                <Square size={14} />
             </button>
             <button 
                onClick={() => handleControl('close')} 
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                 title="Close"
             >
                <X size={18} />
             </button>
        </div>
    );
};