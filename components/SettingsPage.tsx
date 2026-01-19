
import React from 'react';
import { Terminal, Shield, Cpu, Info } from 'lucide-react';

interface SettingsPageProps {
    isDevMode: boolean;
    onToggleDevMode: (value: boolean) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ isDevMode, onToggleDevMode }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-card border border-border rounded-xl p-8 w-full shadow-2xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                
                <div className="flex items-center gap-5 mb-10 pb-8 border-b border-border">
                    <div className="p-4 bg-[#0f1117] border border-border rounded-xl shadow-inner">
                        <Cpu className="text-gray-300" size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
                        <p className="text-gray-400 mt-1">Configure your workspace environment.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Dev Mode Toggle */}
                    <div className="flex items-center justify-between p-5 bg-[#0f1117] border border-border rounded-xl hover:border-gray-600 transition-all duration-300 group">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg transition-colors duration-300 ${isDevMode ? 'bg-accent-focus/10 text-accent-focus' : 'bg-gray-800 text-gray-500'}`}>
                                <Terminal size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-medium text-lg">Developer Mode</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Access database tools, seed generators, and raw data views.</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => onToggleDevMode(!isDevMode)}
                            className={`w-16 h-9 rounded-full p-1 transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-accent-focus/50 ${isDevMode ? 'bg-accent-focus' : 'bg-gray-700'}`}
                            aria-label="Toggle Developer Mode"
                        >
                            <div className={`w-7 h-7 bg-white rounded-full shadow-lg transform transition-transform duration-300 flex items-center justify-center ${isDevMode ? 'translate-x-7' : 'translate-x-0'}`}>
                                {isDevMode && <div className="w-2 h-2 rounded-full bg-accent-focus" />}
                            </div>
                        </button>
                    </div>

                     {/* Placeholder for other settings (visual only for now) */}
                     <div className="flex items-center justify-between p-5 bg-[#0f1117]/50 border border-border/50 rounded-xl opacity-60 cursor-not-allowed">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-gray-800 text-gray-600">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="text-gray-400 font-medium text-lg">Privacy Mode</h3>
                                <p className="text-sm text-gray-600 mt-0.5">Blur sensitive task titles in screenshots.</p>
                            </div>
                        </div>
                        <div className="w-16 h-9 rounded-full bg-gray-800 p-1 relative">
                             <div className="w-7 h-7 bg-gray-600 rounded-full shadow-lg" />
                        </div>
                    </div>
                </div>
                
                <div className="mt-12 pt-6 border-t border-border flex justify-between items-center text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                        <Info size={14} />
                        <span>Flow v1.0.0</span>
                    </div>
                    <span>Build 2023.10.24</span>
                </div>
             </div>
        </div>
    );
};
