import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import GlassToast, { ToastProps } from '../components/GlassToast';

interface NotificationContextType {
    addToast: (message: string, type?: ToastProps['type'], duration?: number, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastProps[]>([]);

    const addToast = useCallback((message: string, type: ToastProps['type'] = 'info', duration = 5000, title?: string) => {
        const id = crypto.randomUUID();
        const newToast: ToastProps = { id, message, type, duration, title, onClose: removeToast };

        setToasts(prev => [...prev, newToast]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ addToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end pointer-events-none">
                <div className="pointer-events-auto">
                    {toasts.map(toast => (
                        <GlassToast key={toast.id} {...toast} />
                    ))}
                </div>
            </div>
        </NotificationContext.Provider>
    );
};
