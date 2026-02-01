import React, { useState } from 'react';
import { X, Save, Clock } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: { startHour: number; endHour: number; isWorkWeekOnly: boolean }) => void;
    currentSettings: { startHour: number; endHour: number; isWorkWeekOnly: boolean };
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentSettings }) => {
    const [startHour, setStartHour] = useState(currentSettings.startHour);
    const [endHour, setEndHour] = useState(currentSettings.endHour);
    const [isWorkWeekOnly, setIsWorkWeekOnly] = useState(currentSettings.isWorkWeekOnly);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSave = () => {
        if (startHour >= endHour) {
            setError("Start hour must be before End hour.");
            return;
        }
        setError(null);
        onSave({ startHour, endHour, isWorkWeekOnly });
        onClose();
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                className="bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="text-orange-400" size={24} />
                        Calendar Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* content */}
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <p className="text-gray-400 text-sm">Configure your active working hours. The visual calendar and AI scheduler will respect these boundaries.</p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Start Hour</label>
                            <select
                                value={startHour}
                                onChange={(e) => setStartHour(Number(e.target.value))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                            >
                                {hours.map(h => (
                                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">End Hour</label>
                            <select
                                value={endHour}
                                onChange={(e) => setEndHour(Number(e.target.value))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                            >
                                {hours.map(h => (
                                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                            <span className="text-white font-medium">Full Week View</span>
                            <span className="text-gray-400 text-xs">Show all 7 days vs Mon-Fri only</span>
                        </div>
                        <div className="flex items-center bg-black/40 p-1 rounded-lg border border-white/10">
                            <button
                                onClick={() => setIsWorkWeekOnly(false)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!isWorkWeekOnly ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                Full Week
                            </button>
                            <button
                                onClick={() => setIsWorkWeekOnly(true)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${isWorkWeekOnly ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                            >
                                Mon-Fri
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] transition-all flex items-center gap-2"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
