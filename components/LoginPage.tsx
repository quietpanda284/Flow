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
                    // Register sets the cookie. We can just "login" to refresh context or force a reload.
                    // Calling login with the same creds will just work and update context.
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
        <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center p-4 font-display">
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
                        fontFamily="'Bebas Neue Pro', sans-serif" 
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

            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500 transition-all">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-[#0f1117] rounded-xl border border-border">
                        {isRegistering ? <UserPlus className="text-accent-focus" size={24} /> : <Lock className="text-accent-focus" size={24} />}
                    </div>
                    <div>
                        <h1 className="text-2xl text-white tracking-wide">{isRegistering ? 'New Operative' : 'Welcome Back'}</h1>
                        <p className="text-sm text-gray-500 font-sans">
                            {isRegistering ? 'Initialize your access credentials.' : 'Enter your credentials to access mission control.'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2 font-sans">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 ml-1 tracking-wider">Username</label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent-focus transition-colors font-display tracking-wide text-lg"
                            placeholder="admin"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-1.5 ml-1 tracking-wider">Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent-focus transition-colors font-display tracking-wide text-lg"
                            placeholder="••••••••"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting || !username || !password}
                        className="w-full bg-accent-focus hover:bg-accent-focus/90 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed group tracking-wider text-xl"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {isRegistering ? 'Create Account' : 'Access Dashboard'} 
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-600 font-sans border-t border-border pt-4">
                    {isRegistering ? (
                        <>
                            Already have credentials?{' '}
                            <button onClick={() => { setIsRegistering(false); setError(''); }} className="text-accent-focus hover:underline font-bold">
                                Login Here
                            </button>
                        </>
                    ) : (
                        <>
                            Need an account?{' '}
                            <button onClick={() => { setIsRegistering(true); setError(''); }} className="text-accent-focus hover:underline font-bold">
                                Initialize System
                            </button>
                            <div className="mt-2 text-[10px] text-gray-700">
                                Default Login: <span className="font-mono text-gray-500">admin</span> / <span className="font-mono text-gray-500">password123</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};