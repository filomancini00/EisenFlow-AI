import { CalendarEvent } from "../types";

export const getGoogleCalendarEvents = async (accessToken: string, timeMin: string, timeMax: string): Promise<CalendarEvent[]> => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            const error = new Error(`Google Calendar API Error: ${response.statusText}`);
            (error as any).status = response.status;
            throw error;
        }

        const data = await response.json();

        // Check if items exist
        if (!data.items) return [];

        return data.items.map((ev: any) => {
            // Google sometimes returns "date" for all-day events instead of "dateTime"
            const start = ev.start.dateTime || ev.start.date;
            const end = ev.end.dateTime || ev.end.date;

            return {
                id: `google-${ev.id}`,
                title: ev.summary || "No Title",
                start: start,
                end: end,
                isFixed: true,
                type: 'meeting',
                reasoning: 'Google Calendar Event',
                quadrant: 'Q4'
            } as CalendarEvent;
        });

    } catch (error) {
        console.error("Failed to fetch Google events:", error);
        throw error;
    }
};
