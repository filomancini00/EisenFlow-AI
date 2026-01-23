import React, { useEffect } from 'react';
import GlassCard from './GlassCard';
import { X, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';

export interface ToastProps {
    id: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
    title?: string;
    onClose: (id: string) => void;
}

const GlassToast: React.FC<ToastProps> = ({ id, message, type = 'info', duration = 5000, title, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onClose]);

    // ... icons logic

    return (
        <div className="animate-in slide-in-from-right fade-in duration-300 mb-3 group relative">
            <GlassCard className={`flex items-start gap-3 min-w-[320px] max-w-sm backdrop-blur-xl shadow-2xl ${borderClass} ${bgClass}`} noPadding>
                <div className="p-4 flex gap-3 w-full">
                    <div className={`mt-0.5 p-2 rounded-full bg-black/20`}>
                        {icon}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm text-white mb-1 capitalize">{title || (type === 'info' ? 'Notification' : type)}</h4>
                        <p className="text-sm text-gray-300 leading-snug">{message}</p>
                    </div>
                    <button
                        onClick={() => onClose(id)}
                        className="text-gray-400 hover:text-white transition-colors p-1"
                    >
                        <X size={16} />
                    </button>
                </div>
                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 h-1 bg-white/10 w-full rounded-b-2xl overflow-hidden">
                    <div
                        className={`h-full ${type === 'success' ? 'bg-emerald-500' : type === 'warning' ? 'bg-amber-500' : type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'}`}
                        style={{ animation: `shrink ${duration}ms linear forwards` }}
                    ></div>
                </div>
            </GlassCard>
            <style>{`
        @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
        }
      `}</style>
        </div>
    );
};

export default GlassToast;
