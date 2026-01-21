
import React, { useState } from 'react';
import { resetDatabase, seedDatabase } from '../services/api';
import { Database, RefreshCw, Trash2, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface BackendTestProps {
    onDataChanged?: () => void;
}

export const BackendTest: React.FC<BackendTestProps> = ({ onDataChanged }) => {
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Modal State
    const [activeModal, setActiveModal] = useState<'reset' | 'seed' | null>(null);

    const executeReset = async () => {
        setIsLoading(true);
        setStatus(null);
        setActiveModal(null);
        
        try {
            const success = await resetDatabase();
            if (success) {
                setStatus({ type: 'success', message: 'Database reset successfully. Content cleared.' });
                if (onDataChanged) onDataChanged();
            } else {
                setStatus({ type: 'error', message: 'Failed to reset database.' });
            }
        } catch (e) {
            setStatus({ type: 'error', message: 'An error occurred during reset.' });
        }
        setIsLoading(false);
    };

    const executeSeed = async () => {
        setIsLoading(true);
        setStatus(null);
        setActiveModal(null);
        
        try {
            // Calculate local date YYYY-MM-DD so data appears on today's timeline
            const today = new Date();
            const offset = today.getTimezoneOffset();
            const localDate = new Date(today.getTime() - (offset*60*1000));
            const dateStr = localDate.toISOString().split('T')[0];

            const success = await seedDatabase(dateStr);
            if (success) {
                setStatus({ type: 'success', message: `Data generated for ${dateStr}.` });
                if (onDataChanged) onDataChanged();
            } else {
                setStatus({ type: 'error', message: 'Failed to seed database.' });
            }
        } catch (e) {
             setStatus({ type: 'error', message: 'An error occurred during seeding.' });
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-card border border-border rounded-xl p-8 w-full shadow-2xl relative overflow-hidden">
                {/* Background decorative blob */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent-focus/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-5 mb-10 pb-8 border-b border-border relative z-10">
                    <div className="p-4 bg-[#0f1117] border border-border rounded-xl shadow-inner">
                        <Database className="text-accent-focus" size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Backend Test Console</h2>
                        <p className="text-gray-400 mt-1">Manage database state and seed data for testing purposes.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 relative z-10">
                    <button
                        onClick={() => setActiveModal('seed')}
                        disabled={isLoading}
                        className="flex flex-col items-center p-8 bg-[#0f1117] border border-border rounded-xl hover:border-accent-meeting hover:bg-accent-meeting/5 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-accent-meeting/10"
                    >
                        <div className="p-4 rounded-full bg-accent-meeting/10 mb-4 group-hover:bg-accent-meeting/20 transition-colors">
                             <RefreshCw size={32} className="text-accent-meeting group-hover:rotate-180 transition-transform duration-700" />
                        </div>
                        <span className="text-lg font-bold text-white mb-2">Generate Data</span>
                        <span className="text-sm text-gray-500 text-center leading-relaxed">
                            Populates the database with default categories and sample time blocks if empty.
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveModal('reset')}
                        disabled={isLoading}
                        className="flex flex-col items-center p-8 bg-[#0f1117] border border-border rounded-xl hover:border-red-500 hover:bg-red-500/5 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-red-500/10"
                    >
                        <div className="p-4 rounded-full bg-red-500/10 mb-4 group-hover:bg-red-500/20 transition-colors">
                            <Trash2 size={32} className="text-red-500 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="text-lg font-bold text-white mb-2">Reset Database</span>
                        <span className="text-sm text-gray-500 text-center leading-relaxed">
                            Permanently deletes all your categories and time blocks.
                        </span>
                    </button>
                </div>

                {status && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 relative z-10 ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span className="font-medium">{status.message}</span>
                    </div>
                )}
            </div>

            {/* Custom Modal Overlay */}
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1a1d24] border border-[#2a2d36] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-full shrink-0 ${activeModal === 'reset' ? 'bg-red-500/10 text-red-500' : 'bg-accent-meeting/10 text-accent-meeting'}`}>
                                    {activeModal === 'reset' ? <AlertTriangle size={24} /> : <AlertCircle size={24} />}
                                </div>
                                <h3 className="text-xl font-bold text-white">
                                    {activeModal === 'reset' ? 'Reset Database' : 'Generate Data'}
                                </h3>
                            </div>
                            
                            <p className="text-gray-400 mb-8 leading-relaxed text-sm">
                                {activeModal === 'reset' 
                                    ? 'Are you sure you want to proceed? This action is irreversible and will permanently delete all categories and time blocks associated with your account.' 
                                    : 'This will populate your database with sample categories and time blocks for today. If you already have data, this may create overlaps.'}
                            </p>

                            <div className="flex gap-3 justify-end">
                                <button 
                                    onClick={() => setActiveModal(null)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={activeModal === 'reset' ? executeReset : executeSeed}
                                     className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-colors shadow-lg flex items-center gap-2 ${
                                        activeModal === 'reset' 
                                        ? 'bg-red-600 hover:bg-red-700' 
                                        : 'bg-accent-meeting hover:bg-blue-600'
                                    }`}
                                >
                                    {activeModal === 'reset' ? 'Yes, Delete All' : 'Confirm Generate'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
