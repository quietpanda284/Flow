
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConnectionWarning = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 bg-red-900/90 backdrop-blur border border-red-700 text-white p-4 rounded-xl shadow-2xl z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-start gap-3">
    <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
    <div className="flex-1">
      <h3 className="font-bold text-sm mb-1">Connection Error</h3>
      <p className="text-xs text-red-200 leading-relaxed">
        Could not connect to the database. Showing offline view. 
        Ensure the backend server is running.
      </p>
    </div>
    <button onClick={onClose} className="text-red-300 hover:text-white transition-colors">
      <X size={18} />
    </button>
  </div>
);
