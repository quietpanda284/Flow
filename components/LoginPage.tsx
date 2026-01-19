
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsSubmitting(true);
    setError('');

    try {
        await login(username, password);
    } catch (err: any) {
        console.error("Login Error:", err);
        setError('Invalid credentials. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center p-4">
      <div className="mb-8 select-none animate-in fade-in slide-in-from-top-4 duration-700">
        <svg 
            width="80" 
            height="32" 
            viewBox="0 0 64 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_10px_rgba(0,255,148,0.4)]"
            aria-label="FlowState Logo"
        >
            <text 
                x="50%" 
                y="52%" 
                dominantBaseline="middle" 
                textAnchor="middle" 
                fontFamily="'Inter', sans-serif" 
                fontWeight="800" 
                fontSize="18" 
                stroke="#00FF94" 
                strokeWidth="1.5" 
                fill="none" 
                letterSpacing="2"
            >
                FLOW
            </text>
        </svg>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#0f1117] rounded-xl border border-border">
                <Lock className="text-accent-focus" size={24} />
            </div>
            <div>
                {/* Applied font-display here for the Bebas look */}
                <h1 className="text-2xl font-display text-white tracking-wide">Welcome Back</h1>
                <p className="text-sm text-gray-500">Enter your credentials to access mission control.</p>
            </div>
        </div>

        {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} />
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 ml-1">Username</label>
                <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent-focus transition-colors font-sans"
                    placeholder="admin"
                    autoFocus
                />
            </div>
            <div>
                <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 ml-1">Password</label>
                <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent-focus transition-colors font-sans"
                    placeholder="••••••••"
                />
            </div>

            <button 
                type="submit"
                disabled={isSubmitting || !username || !password}
                className="w-full bg-accent-focus hover:bg-accent-focus/90 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed group font-display tracking-wider text-lg"
            >
                {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                ) : (
                    <>
                        Access Dashboard <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-600">
            Default Login: <span className="font-mono text-gray-400">admin</span> / <span className="font-mono text-gray-400">password123</span>
        </div>
      </div>
    </div>
  );
};
