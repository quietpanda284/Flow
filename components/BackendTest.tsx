
import React, { useState } from 'react';
import { resetDatabase, seedDatabase } from '../services/api';
import { Database, RefreshCw, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export const BackendTest: React.FC = () => {
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async () => {
        if (!window.confirm('Are you sure? This will delete all categories and time blocks.')) return;
        
        setIsLoading(true);
        setStatus(null);
        
        const success = await resetDatabase();
        if (success) {
            setStatus({ type: 'success', message: 'Database reset successfully. Content cleared.' });
        } else {
            setStatus({ type: 'error', message: 'Failed to reset database.' });
        }
        setIsLoading(false);
    };

    const handleSeed = async () => {
        setIsLoading(true);
        setStatus(null);
        
        const success = await seedDatabase();
        if (success) {
            setStatus({ type: 'success', message: 'Seed data generation request sent.' });
        } else {
            setStatus({ type: 'error', message: 'Failed to seed database.' });
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
                        onClick={handleSeed}
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
                        onClick={handleReset}
                        disabled={isLoading}
                        className="flex flex-col items-center p-8 bg-[#0f1117] border border-border rounded-xl hover:border-red-500 hover:bg-red-500/5 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-red-500/10"
                    >
                        <div className="p-4 rounded-full bg-red-500/10 mb-4 group-hover:bg-red-500/20 transition-colors">
                            <Trash2 size={32} className="text-red-500 group-hover:scale-110 transition-transform" />
                        </div>
                        <span className="text-lg font-bold text-white mb-2">Reset Database</span>
                        <span className="text-sm text-gray-500 text-center leading-relaxed">
                            Permanently deletes all categories and time blocks (Truncate).
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
        </div>
    );
};
