import { Task, CalendarEvent } from '../types';

export const expandFixedTasks = (tasks: Task[], windowStart: Date, daysToExpand: number = 7): CalendarEvent[] => {
    const recurrenceEvents: CalendarEvent[] = [];

    // Filter for fixed tasks only
    const fixedTasks = tasks.filter(t => t.isFixed);

    fixedTasks.forEach(task => {
        const startTime = task.startTime || "09:00";

        for (let i = 0; i < daysToExpand; i++) {
            const day = new Date(windowStart);
            day.setDate(day.getDate() + i);
            const dateStr = day.toISOString().split('T')[0];
            const startIso = `${dateStr}T${startTime}:00`;

            let endIso;
            if (task.finishTime) {
                const startDate = new Date(startIso);
                const endDate = new Date(`${dateStr}T${task.finishTime}:00`);
                if (endDate <= startDate) {
                    endDate.setDate(endDate.getDate() + 1); // Handle overnight
                }
                endIso = endDate.toISOString().slice(0, 19);
            } else {
                // Fallback to estimatedHours
                let duration = Number(task.estimatedHours);
                if (!duration || isNaN(duration) || duration <= 0) {
                    duration = 1; // Default to 1 hour if invalid
                }
                endIso = new Date(new Date(startIso).getTime() + (duration * 3600000)).toISOString().slice(0, 19);
            }

            let shouldAdd = false;
            // Recurrence Logic
            if (task.recurrence === 'daily') shouldAdd = true;
            else if (task.recurrence === 'weekly' && day.getDay() === new Date(task.deadline).getDay()) shouldAdd = true;
            else if (task.recurrence === 'weekdays' && day.getDay() !== 0 && day.getDay() !== 6) shouldAdd = true;
            else if (!task.recurrence || task.recurrence === 'none') {
                // Single Instance: Match deadline date specifically
                if (dateStr === task.deadline.split('T')[0]) shouldAdd = true;
            }

            if (shouldAdd) {
                recurrenceEvents.push({
                    id: `fixed-${task.id}-${dateStr}`,
                    title: task.title,
                    start: startIso,
                    end: endIso,
                    type: 'task_block',
                    taskId: task.id,
                    isFixed: true,
                    reasoning: "Fixed Commitment",
                    quadrant: 'Q4'
                });
            }
        }
    });

    return recurrenceEvents;
};
