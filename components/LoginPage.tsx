import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/api';
import { Lock, ArrowRight, Loader2, AlertCircle, UserPlus } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  return (
    <LoginContainer 
       isRegistering={isRegistering} 
       setIsRegistering={setIsRegistering} 
       username={username}
       setUsername={setUsername}
       password={password}
       setPassword={setPassword}
       isSubmitting={isSubmitting}
       setIsSubmitting={setIsSubmitting}
       error={error}
       setError={setError}
    />
  );
};

const LoginContainer = ({ 
    isRegistering, setIsRegistering, 
    username, setUsername, 
    password, setPassword,
    isSubmitting, setIsSubmitting,
    error, setError 
}: any) => {
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) return;

        setIsSubmitting(true);
        setError('');

        try {
            if (isRegistering) {
                const res = await registerUser(username, password);
                if (res.success) {
                    await login(username, password);
                } else {
                    throw new Error(res.error || "Registration failed");
                }
            } else {
                await login(username, password);
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            setError(err.message || 'Invalid credentials. Please try again.');
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
                    aria-label="Flow Logo"
                >
                    <text 
                        x="50%" 
                        y="52%" 
                        dominantBaseline="middle" 
                        textAnchor="middle" 
                        fontFamily="'Bebas Neue', sans-serif" 
                        fontWeight="400" 
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

            <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-500 transition-all">
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="p-3 bg-[#0f1117] rounded-xl border border-border">
                        {isRegistering ? <UserPlus className="text-accent-focus" size={24} /> : <Lock className="text-accent-focus" size={24} />}
                    </div>
                    <h1 className="text-2xl text-white tracking-wide font-display text-center">
                        {isRegistering ? 'Create Account' : 'Welcome Back'}
                    </h1>
                </div>

                {error && (
                    <div className="mb-5 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs animate-in fade-in slide-in-from-top-2 font-sans">
                        <AlertCircle size={16} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 ml-1 tracking-wider font-sans">Username</label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-focus transition-colors font-sans text-sm"
                            placeholder="Enter username"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 ml-1 tracking-wider font-sans">Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-accent-focus transition-colors font-sans text-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting || !username || !password}
                        className="w-full bg-accent-focus hover:bg-accent-focus/90 text-black font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed group tracking-wide text-base font-display"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>
                                {isRegistering ? 'Create Account' : 'Login'} 
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-5 text-center pt-4 border-t border-border">
                    <button 
                        onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
                        className="text-xs text-gray-500 hover:text-white transition-colors font-sans"
                    >
                        {isRegistering ? 'Back to Login' : 'Create Account'}
                    </button>
                </div>
            </div>
        </div>
    );
};