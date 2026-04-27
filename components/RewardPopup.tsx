import React from 'react';
import { Gift, X } from 'lucide-react';
import { PendingReward } from '../types';

interface Props {
    reward: PendingReward;
    onClaim: () => void;
    onIgnore: () => void;
}

export const RewardPopup: React.FC<Props> = ({ reward, onClaim, onIgnore }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in zoom-in duration-300">
            <div className="bg-white rounded-[32px] w-full text-center shadow-2xl relative overflow-hidden border-4 border-white/20">
                
                <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 pt-10 text-center text-white relative overflow-hidden">
                    <button onClick={onIgnore} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors z-10 text-white">
                        <X size={20} />
                    </button>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 animate-pulse"></div>
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3 hover:rotate-6 transition-transform">
                            <Gift size={40} className="text-pink-500 drop-shadow-sm animate-bounce" />
                        </div>
                        <h3 className="text-3xl font-black mb-1 tracking-tight drop-shadow-md">Reward Unlocked!</h3>
                        <p className="text-white/90 font-medium text-sm drop-shadow-sm">{reward.label}</p>
                    </div>
                </div>

                <div className="p-6 bg-white">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Your Prize</p>
                        {reward.type === 'COINS' ? (
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-4xl font-black text-slate-800">{reward.amount}</span>
                                <span className="text-lg font-bold text-yellow-500">Credits</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-xl font-black text-indigo-600 uppercase">{reward.subLevel} Access</span>
                            </div>
                        )}
                    </div>
                
                <button 
                    onClick={onClaim}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] transition-all active:scale-95 mb-3 flex items-center justify-center gap-2"
                >
                    <Gift size={20} className="text-pink-400" /> Claim Reward
                </button>
                
                <button 
                    onClick={onIgnore}
                    className="text-xs text-slate-500 font-bold hover:text-slate-600 uppercase tracking-wider"
                >
                    Dismiss
                </button>
                </div>
            </div>
        </div>
    );
};
