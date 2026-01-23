import OpenAI from 'openai';
import { Task, CalendarEvent } from '../types';

let openaiClient: OpenAI | null = null;

const getClient = () => {
    if (!openaiClient) {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            throw new Error("Missing OpenAI API Key. Please set VITE_OPENAI_API_KEY in .env");
        }
        openaiClient = new OpenAI({
            apiKey: apiKey,
            dangerouslyAllowBrowser: true // Required for client-side use in Vite
        });
    }
    return openaiClient;
};

const calculateAvailableSlots = (
    fixedEvents: CalendarEvent[],
    startDateStr: string,
    daysToPlan: number,
    dayStartHour: number,
    dayEndHour: number
): { start: string; end: string; durationMinutes: number }[] => {
    const slots: { start: string; end: string; durationMinutes: number }[] = [];
    const now = new Date();

    for (let i = 0; i < daysToPlan; i++) {
        const currentDate = new Date(startDateStr);
        currentDate.setDate(currentDate.getDate() + i);
        const dateKey = currentDate.toISOString().split('T')[0];

        // 1. Define Working Window for this day
        let workStart = new Date(`${dateKey}T${dayStartHour.toString().padStart(2, '0')}:00:00`);
        const workEnd = new Date(`${dateKey}T${dayEndHour.toString().padStart(2, '0')}:00:00`);

        // If 'Today', clamp start time to 'Now' if later than workStart
        // But only if 'Now' is actually on the same day! 
        // Note: startDateStr is passed from App.tsx, usually 'Today'.
        const isToday = dateKey === now.toISOString().split('T')[0];
        if (isToday) {
            if (now > workEnd) continue; // Day is over
            if (now > workStart) {
                // Round up to next 15 mins for cleanliness
                const roundedNow = new Date(Math.ceil(now.getTime() / (15 * 60000)) * (15 * 60000));
                workStart = roundedNow > workStart ? roundedNow : workStart;
            }
        }

        if (workStart >= workEnd) continue;

        // 2. Find intersecting Fixed Events
        const dayFixedEvents = fixedEvents.filter(e => {
            const eStart = new Date(e.start);
            const eEnd = new Date(e.end);
            return eStart < workEnd && eEnd > workStart;
        }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        // 3. Subtract Events from Window
        let currentPointer = workStart;

        for (const event of dayFixedEvents) {
            const eStart = new Date(event.start);
            const eEnd = new Date(event.end);

            // Constraint checking
            const effectiveStart = eStart < workStart ? workStart : eStart;
            const effectiveEnd = eEnd > workEnd ? workEnd : eEnd;

            // Gap before event?
            if (effectiveStart > currentPointer) {
                const duration = (effectiveStart.getTime() - currentPointer.getTime()) / 60000;
                if (duration >= 15) { // Minimum 15 min slot
                    slots.push({
                        start: currentPointer.toISOString(),
                        end: effectiveStart.toISOString(),
                        durationMinutes: Math.floor(duration)
                    });
                }
            }

            // Move pointer
            currentPointer = eEnd > currentPointer ? eEnd : currentPointer;
        }

        // Gap after last event?
        if (currentPointer < workEnd) {
            const duration = (workEnd.getTime() - currentPointer.getTime()) / 60000;
            if (duration >= 15) {
                slots.push({
                    start: currentPointer.toISOString(),
                    end: workEnd.toISOString(),
                    durationMinutes: Math.floor(duration)
                });
            }
        }
    }

    return slots;
};

export const optimizeSchedule = async (
    tasks: Task[],
    fixedEvents: CalendarEvent[],
    startDateStr: string,
    daysToPlan: number = 7,
    dayStartHour: number = 9,
    dayEndHour: number = 18
): Promise<CalendarEvent[]> => {
    try {
        const ai = getClient();

        // 1. Pre-calculate Free Slots
        const freeSlots = calculateAvailableSlots(fixedEvents, startDateStr, daysToPlan, dayStartHour, dayEndHour);
        const slotsJson = JSON.stringify(freeSlots);

        // Prepare context
        const tasksJson = JSON.stringify(tasks.map(t => ({
            id: t.id,
            title: t.title,
            importance: t.relevance,
            urgency: t.urgency,
            deadline: t.deadline,
            durationHours: t.estimatedHours
        })));

        const prompt = `
      You are an expert productivity scheduler using the Eisenhower Matrix principles.

      CONTEXT:
      1. Here are the **FREE TIME SLOTS** available for the User for the next ${daysToPlan} days:
         ${slotsJson}
      
      2. Here are the **TASKS** that need to be scheduled:
         ${tasksJson}
      
      YOUR GOAL:
      - Assign the tasks into the available Free Slots.
      - Return a JSON object with a "schedule" containing the assignments.

      CRITICAL RULES:
      1. **FILL THE SLOTS**: You MUST schedule tasks strictly WITHIN the "start" and "end" times of the provided Free Slots.
         - DO NOT invent new times outside these slots.
         - DO NOT overlap with existing content (since these slots are already clean).
      
      2. **DURATION MATH & INTEGRITY**: 
         - **PREFER CONTIGUOUS BLOCKS**: Try to fit the *entire* task into a single slot if possible.
         - Only split a task if it is *impossible* to fit in one slot (e.g. task is 3h but max slot is 2h).
         - If you split, minimize the number of chunks.
         - The SUM of durations for a given taskId MUST match its "durationHours" exactly (e.g. 1h task = 60 mins total). Do not book extra time.
         - Verify your math: (End - Start) must equal assigned duration.

      3. **PRIORITIZATION**:
         - Fill earlier/better slots with Q1 (High Importance & Urgency) tasks.
         - Then Q2, etc.
      
      4. **OUTPUT FORMAT**:
         - Return an array of "events".
         - Each event must have: taskId, title, start, end, reasoning, quadrant.
         - "taskId" must match the input task ID exactly.
      
      Example Output:
      {
        "schedule": [
           { 
             "taskId": "t1", 
             "title": "Deep Work", 
             "start": "2024-01-22T09:00:00.000Z", 
             "end": "2024-01-22T11:00:00.000Z", 
             "reasoning": "High Priority Q1", 
             "quadrant": "Q1" 
           }
        ]
      }
        `;

        const response = await ai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a precise scheduler that solves bin-packing problems." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });

        const content = response.choices[0].message.content || '{}';
        let generatedSchedule: any[] = [];
        try {
            const parsed = JSON.parse(content);
            if (parsed.schedule && Array.isArray(parsed.schedule)) {
                generatedSchedule = parsed.schedule;
            } else if (Array.isArray(parsed)) {
                generatedSchedule = parsed;
            } else {
                throw new Error("Missing 'schedule' key in AI response");
            }
        } catch (e) {
            console.error("Failed to parse OpenAI JSON", e);
            throw new Error("AI returned invalid JSON format.");
        }

        // 4. Hydrate & Format
        const hydratedSchedule = generatedSchedule.map((item: any, index: number) => {
            const originalTask = tasks.find(t => t.id === item.taskId);
            const title = originalTask ? originalTask.title : item.title;

            return {
                id: item.id || `gen-${index}-${Date.now()}`,
                title: title,
                start: item.start,
                end: item.end,
                type: 'task_block' as 'task_block',
                taskId: item.taskId,
                isFixed: false,
                reasoning: item.reasoning,
                quadrant: item.quadrant
            };
        }).filter((e: any) => e);

        return hydratedSchedule as CalendarEvent[];

    } catch (error) {
        console.error("Error optimizing schedule with OpenAI:", error);
        throw error;
    }
};

export const chatWithAI = async (
    message: string,
    tasks: Task[]
): Promise<{ text: string; action?: 'add_task'; taskData?: Partial<Task> }> => {
    try {
        const ai = getClient();
        const tasksContext = JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, status: t.status, urgency: t.urgency, importance: t.relevance })));

        const systemPrompt = `
      You are an embedded AI productivity assistant in "EisenFlow", a task management app.

            Capabilities:
        1. Answer questions about the user's tasks.
        2. CREATE tasks if the user explicitly asks.
      
      Current Tasks: ${tasksContext}

      TODAY'S DATE: ${new Date().toLocaleDateString('en - US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        IMPORTANT: If the user says "tomorrow", calculate the date based on TODAY.

      RESPONSE FORMAT:
      You MUST return a JSON object.

            Type 1: Chat Response(No action)
        {
            "text": "Your helpful response here..."
        }
      
      Type 2: Add Task Action
        {
            "text": "Sure, I've added that task for you.",
                "action": "add_task",
                    "taskData": {
                "title": "Title of task",
                    "description": "Optional description",
                        "urgency": 1 - 5(5 is most urgent, default 3),
                            "relevance": 1 - 5(5 is most important, default 3),
                                "deadline": "YYYY-MM-DD"(If mentioned, else today or tomorrow),
                                    "scheduledStart": "YYYY-MM-DDTHH:mm:00"(Optional: ONLY if user specifies a time, e.g. "at 4pm".Calculate based on Today.)
            }
        }

      keep responses short and encouraging.
    `;

        const response = await ai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content || '{}';
        return JSON.parse(content);

    } catch (error) {
        console.error("AI Chat Error:", error);
        return { text: "I'm having trouble connecting to my brain right now. Try again later." };
    }
};
