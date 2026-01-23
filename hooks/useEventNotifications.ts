import { useEffect, useRef } from 'react';
import { CalendarEvent } from '../types';
import { useNotification } from '../contexts/NotificationContext';

export const useEventNotifications = (events: CalendarEvent[]) => {
    const notifiedEventIds = useRef<Set<string>>(new Set());
    const { addToast } = useNotification();

    useEffect(() => {
        // Request permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        const checkEvents = () => {
            const now = Date.now();

            events.forEach(event => {
                const startTime = new Date(event.start).getTime();
                const diffMs = startTime - now;
                const diffMinutes = diffMs / (1000 * 60);
                const timeString = new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Key 1: 5 Minute Warning (Window: 1 min to 5.5 mins)
                if (diffMinutes > 1 && diffMinutes <= 5.5) {
                    const key = `${event.id}-5min`;
                    if (!notifiedEventIds.current.has(key)) {
                        const minutesUntil = Math.ceil(diffMinutes);
                        addToast(`Event starting in ${minutesUntil} mins: ${event.title}`, 'info');
                        if (Notification.permission === 'granted') {
                            new Notification(`Upcoming: ${event.title}`, {
                                body: `Starts in ${minutesUntil} mins at ${timeString}`,
                                icon: '/google-logo.png'
                            });
                        }
                        notifiedEventIds.current.add(key);
                    }
                }

                // Key 2: Starting Now (Window: -1 min to 1 min)
                if (diffMinutes > -1 && diffMinutes <= 1) {
                    const key = `${event.id}-start`;
                    if (!notifiedEventIds.current.has(key)) {
                        // Title: "Starting Now"
                        // Message: "Event Title"
                        addToast(event.title, 'success', 5000, "Starting Now");
                        if (Notification.permission === 'granted') {
                            new Notification(`Starting Now: ${event.title}`, {
                                body: `Happening right now at ${timeString}`,
                                icon: '/google-logo.png'
                            });
                        }
                        notifiedEventIds.current.add(key);
                    }
                }
            });
        };

        // Check every 30 seconds
        const intervalId = setInterval(checkEvents, 30000);

        // Initial check
        checkEvents();

        return () => clearInterval(intervalId);
    }, [events, addToast]);
};
