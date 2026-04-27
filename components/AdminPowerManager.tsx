import React, { useState } from 'react';
import { SystemSettings, FeatureCategory } from '../types';
import { DollarSign, Eye, Save, Search, Settings, Lock, Package, Trash2, Edit3, X, Plus, Crown, LayoutGrid, List, CheckSquare, Gamepad2, BrainCircuit, Activity, BarChart3, Star, Zap, PenTool, Banknote, Layers } from 'lucide-react';

interface Props {
    settings: SystemSettings;
    onUpdate: (s: SystemSettings) => void;
}

export const AdminPowerManager: React.FC<Props> = ({ settings, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'PRICING' | 'VISIBILITY'>('PRICING');
    const [localSettings, setLocalSettings] = useState<SystemSettings>(settings);

    const updateSetting = (key: keyof SystemSettings, value: any) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        onUpdate(newSettings);
    };

    return (
        <div className="p-6 bg-white min-h-[500px]">
            {/* TABS */}
            <div className="flex flex-wrap gap-2 mb-6 bg-slate-100 p-1.5 rounded-xl w-fit">
                {[
                    { id: 'PRICING', icon: DollarSign, label: 'Pricing & Costs' },
                    { id: 'VISIBILITY', icon: Eye, label: 'Visibility' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:bg-white/50'}`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB 1: PRICING */}
            {activeTab === 'PRICING' && (
                <div className="space-y-6">
                    {/* GLOBAL COSTS */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2"><DollarSign size={16} /> Content Credit Costs (0 = Free)</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             {[
                                { key: 'defaultPdfCost', label: 'PDF Access', default: 5 },
                                { key: 'defaultVideoCost', label: 'Video Access', default: 5 },
                                { key: 'mcqTestCost', label: 'MCQ Test Entry', default: 2 },
                                { key: 'mcqAnalysisCost', label: 'MCQ Analysis', default: 5 },
                                { key: 'mcqAnalysisCostUltra', label: 'Ultra Analysis', default: 20 },
                                { key: 'mcqHistoryCost', label: 'History View', default: 1 },
                                { key: 'chatCost', label: 'AI Chat Msg', default: 1 },
                                { key: 'gameCost', label: 'Spin Wheel', default: 0 },
                            ].map((item) => (
                                <div key={item.key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">{item.label}</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs">🪙</span>
                                        <input
                                            type="number"
                                            // @ts-ignore
                                            value={localSettings[item.key] !== undefined ? localSettings[item.key] : item.default}
                                            onChange={(e) => updateSetting(item.key as keyof SystemSettings, Number(e.target.value))}
                                            className="w-full p-1.5 border rounded font-bold text-sm"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: VISIBILITY */}
            {activeTab === 'VISIBILITY' && (
                <div className="space-y-6">
                     <div className="p-4 border rounded-xl bg-slate-50 col-span-1 md:col-span-2">
                         <h4 className="font-bold text-slate-700 text-sm mb-4">Module Visibility</h4>
                         <div className="flex flex-wrap gap-4">
                             {[
                                 {key: 'isChatEnabled', label: 'Chat Module'},
                                 {key: 'isGameEnabled', label: 'Game Module'},
                                 {key: 'isPaymentEnabled', label: 'Payment Gateway'},
                                 {key: 'allowSignup', label: 'Allow Signups'},
                             ].map(mod => (
                                 <label key={mod.key} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm cursor-pointer hover:bg-slate-50">
                                     <input
                                        type="checkbox"
                                        // @ts-ignore
                                        checked={localSettings[mod.key] !== false}
                                        onChange={e => updateSetting(mod.key as keyof SystemSettings, e.target.checked)}
                                        className="accent-green-600 w-4 h-4"
                                     />
                                     <span className="text-xs font-bold text-slate-700">{mod.label}</span>
                                 </label>
                             ))}
                         </div>
                     </div>
                </div>
            )}
        </div>
    );
};
