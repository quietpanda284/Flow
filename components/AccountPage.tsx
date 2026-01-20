import React, { useState } from 'react';
import { changePassword, deleteAccount } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Lock, UserX, AlertTriangle, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';

export const AccountPage: React.FC = () => {
    const { user, logout } = useAuth();
    
    // Password Change State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passLoading, setPassLoading] = useState(false);
    const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Delete Account State
    const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMessage(null);

        if (newPassword !== confirmPassword) {
            setPassMessage({ type: 'error', text: "New passwords don't match." });
            return;
        }

        if (newPassword.length < 6) {
            setPassMessage({ type: 'error', text: "Password must be at least 6 characters." });
            return;
        }

        setPassLoading(true);
        try {
            await changePassword(currentPassword, newPassword);
            setPassMessage({ type: 'success', text: "Password updated successfully." });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setPassMessage({ type: 'error', text: error.message || "Failed to update password." });
        } finally {
            setPassLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteLoading(true);
        try {
            await deleteAccount();
            logout(); // Log out and redirect to login automatically via auth context
        } catch (error) {
            console.error("Failed to delete account", error);
            setIsDeleteConfirming(false);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-card border border-border rounded-xl p-8 w-full shadow-2xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                
                <div className="flex items-center gap-5 mb-10 pb-8 border-b border-border">
                    <div className="p-4 bg-[#0f1117] border border-border rounded-xl shadow-inner">
                        <Lock className="text-gray-300" size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Account Management</h2>
                        <p className="text-gray-400 mt-1">Manage security and account data for <span className="text-white font-mono">{user?.username}</span>.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {/* Change Password Section */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <ShieldAlert size={18} className="text-accent-focus" />
                            Security
                        </h3>
                        
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase font-bold text-gray-500 mb-1 ml-1 tracking-wider">Current Password</label>
                                <input 
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-focus transition-colors text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-gray-500 mb-1 ml-1 tracking-wider">New Password</label>
                                <input 
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-focus transition-colors text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-gray-500 mb-1 ml-1 tracking-wider">Confirm New Password</label>
                                <input 
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#0f1117] border border-[#2a2d36] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-accent-focus transition-colors text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            {passMessage && (
                                <div className={`text-xs p-2 rounded flex items-center gap-2 ${passMessage.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {passMessage.type === 'success' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                    {passMessage.text}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={passLoading || !currentPassword || !newPassword || !confirmPassword}
                                className="w-full bg-[#2a2d36] hover:bg-[#323640] text-white py-2 rounded-lg text-sm font-medium transition-colors border border-[#3f434e] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {passLoading && <Loader2 className="animate-spin" size={14} />}
                                Update Password
                            </button>
                        </form>
                    </div>

                    {/* Danger Zone Section */}
                    <div className="space-y-6 md:border-l md:border-border md:pl-12">
                         <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                            <AlertTriangle size={18} />
                            Danger Zone
                        </h3>
                        
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                                Once you delete your account, there is no going back. Please be certain.
                            </p>
                            
                            {!isDeleteConfirming ? (
                                <button 
                                    onClick={() => setIsDeleteConfirming(true)}
                                    className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserX size={16} /> Delete Account
                                </button>
                            ) : (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <p className="text-xs text-red-300 font-bold text-center">Are you absolutely sure?</p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={handleDeleteAccount}
                                            disabled={deleteLoading}
                                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2"
                                        >
                                            {deleteLoading ? <Loader2 className="animate-spin" size={14} /> : "Yes, Delete"}
                                        </button>
                                        <button 
                                            onClick={() => setIsDeleteConfirming(false)}
                                            disabled={deleteLoading}
                                            className="flex-1 py-2 bg-[#2a2d36] hover:bg-[#323640] text-gray-300 rounded-lg text-xs font-bold uppercase transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
};