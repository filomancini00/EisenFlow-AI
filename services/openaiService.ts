import OpenAI from 'openai';
import { Task, CalendarEvent } from '../types';

let openaiClient: OpenAI | null = null;

const getClient = () => {
    if (!openaiClient) {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            throw new Error("Missing OpenAI API Key. Please set VITE_OPENAI_API_KEY in .env");
        }
        if (!apiKey.startsWith('sk-')) {
            console.warn("Warning: OpenAI API Key does not start with 'sk-'. It might be invalid.");
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
    dayEndHour: number,
    isWorkWeekOnly: boolean = false
): { start: string; end: string; durationMinutes: number }[] => {
    const slots: { start: string; end: string; durationMinutes: number }[] = [];
    const now = new Date();

    for (let i = 0; i < daysToPlan; i++) {
        const currentDate = new Date(startDateStr);
        currentDate.setDate(currentDate.getDate() + i);

        // SKIP WEEKENDS logical check
        if (isWorkWeekOnly) {
            const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                continue; // Skip generation for this day
            }
        }

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
    dayEndHour: number = 18,
    isWorkWeekOnly: boolean = false
): Promise<{ schedule: CalendarEvent[]; unscheduledTaskIds: string[] }> => {
    try {
        const ai = getClient();

        // 1. Pre-calculate Free Slots
        const freeSlots = calculateAvailableSlots(fixedEvents, startDateStr, daysToPlan, dayStartHour, dayEndHour, isWorkWeekOnly);

        // Safety check: If no slots, return empty early
        if (freeSlots.length === 0) {
            console.warn("No free slots available for scheduling.");
            throw new Error("It is impossible to generate the plan based on current constraints. Please either increase the available daily hours in Settings or extend the deadlines of your tasks to fit the schedule.");
        }

        const slotsJson = JSON.stringify(freeSlots);

        // Prepare context
        // Prepare context
        // Ensure strictly only non-fixed tasks are passed here
        // SORTING: Critical change - Sort by Deadline ASC first, then by Priority Score DESC
        const sortedTasks = tasks
            .filter(t => !t.isFixed)
            .sort((a, b) => {
                // 1. Deadline (Earliest first)
                if (a.deadline && b.deadline) {
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                }
                if (a.deadline && !b.deadline) return -1; // Specific deadline comes before no deadline
                if (!a.deadline && b.deadline) return 1;

                // 2. Priority Score (Highest first)
                const scoreA = (a.relevance || 3) + (a.urgency || 3);
                const scoreB = (b.relevance || 3) + (b.urgency || 3);
                return scoreB - scoreA;
            });

        const tasksJson = JSON.stringify(sortedTasks.map(t => ({
            id: t.id,
            title: t.title,
            priority_score: (t.relevance || 3) + (t.urgency || 3),
            importance: t.relevance,
            urgency: t.urgency,
            deadline: t.deadline,
            estimatedHours: t.estimatedHours
        })));

        const prompt = `
      Role: You are the Smart Scheduling Algorithm for a productivity application. Your goal is to generate a feasible, optimized weekly or monthly plan based on task data, user availability, and fixed constraints.

      1. INPUT DATA:
      - **Free Time Slots**: These are the ONLY available times for the user, derived from their Settings and Fixed Events.
        ${slotsJson}

      - **Tasks to Schedule**: (Sorted by EARLIEST DEADLINE first to assist with constraint satisfaction)
        ${tasksJson}

      2. CORE SCHEDULING LOGIC (The Algorithm):

      **Priority 1: Fixed Events.**
      - (Already handled: The 'Free Time Slots' provided above are what remains *after* placing fixed events).

      **Priority 2: Task Ranking.**
      - I have pre-sorted the tasks for you based on Deadline (for constraint reasons) and Urgency/Importance.
      - **CRITICAL**: Verify this ranking. The most urgent and important tasks (Q1) with imminent deadlines must be scheduled FIRST.

      **Priority 3: Time Allocation.**
      - Fill the provided Free Time Slots with the sorted tasks.
      - **Consistency**: The total hours scheduled for a task must exactly match its "estimatedHours".
      - **Task Splitting**: If a task requires more hours than are available in a single day/slot, YOU MUST split the task across multiple days.
      - **Deadline Adherence**: Ensure the *final segment* of any split task is scheduled BEFORE its deadline.

      **Priority 4: Intelligent Load Levelling (User Request).**
      - **Do NOT front-load flexible tasks.**
      - If a task has a distant deadline (e.g., next month), do NOT schedule it "Today" if "Today" is crowded or if it blocks urgent work.
      - Spread flexible tasks deeper into the week/month to keep the immediate schedule clean for urgent focus.
      
      3. ERROR HANDLING (Capacity Overflow):
         - If the user has inserted too many tasks with similar deadlines, or tasks requiring excessive hours that physically cannot fit into the available Free Time Slots:
         - **ACTION**: Do not generate a partial or broken plan.
         - **OUTPUT**: Return a special JSON property "error": "overflow".
         - **CRITICAL**: In the case of overflow, also populate:
            - "culpritTaskIds": IDs of the specific tasks causing the bottleneck.
            - "failureReason": A concise, one-sentence explanation of WHY it failed (e.g., "Task X requires 8 hours but only 5 hours are available before its deadline on Feb 3rd.").

      4. OUTPUT FORMAT:
         Return a valid JSON object:
         {
            "schedule": [
                {
                    "taskId": "string",
                    "title": "string",
                    "start": "ISO_STRING",
                    "end": "ISO_STRING",
                    "reasoning": "string",
                    "quadrant": "Q1" | "Q2" | "Q3" | "Q4"
                }
            ],
            "error": "overflow" | null,
            "culpritTaskIds": ["taskId1", "taskId2"],
            "failureReason": "string"
         }
         
         Note: If "error": "overflow" is returned, the "schedule" array can be empty.
         IMPORTANT: Use all available days. Do not error out just because "Today" is full. Check Tomorrow, Day 3, etc.
        `;

        console.log(`DEBUG: Sending Schedule Request to OpenAI. Prompt length: ${prompt.length} chars`);

        // Using o3-mini for advanced reasoning capabilities
        const response = await ai.chat.completions.create({
            model: "o3-mini",
            messages: [
                { role: "system", content: "You are a specific planner that prioritizes global completion over daily cramming." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            // temperature: 1, // NOT SUPPORTED for o3-mini/o1 models
            // reasoning_effort: "medium" // Optional, defaults to medium
        });

        const content = response.choices[0].message.content || '{}';
        console.log("DEBUG: Raw AI Response Content:", content.substring(0, 500) + "...");

        let generatedSchedule: any[] = [];
        let errorFlag: string | null = null;
        let culpritIds: string[] = [];
        let failureReason: string = "";

        try {
            const parsed = JSON.parse(content);

            if (parsed.error === "overflow") {
                errorFlag = "overflow";
                culpritIds = parsed.culpritTaskIds || [];
                failureReason = parsed.failureReason || "";
            } else if (parsed.schedule && Array.isArray(parsed.schedule)) {
                generatedSchedule = parsed.schedule;
            } else if (Array.isArray(parsed)) {
                generatedSchedule = parsed;
            }

        } catch (e) {
            console.error("Failed to parse OpenAI JSON", e);
            throw new Error("AI returned invalid JSON format. Please try again.");
        }

        if (errorFlag === "overflow") {
            // Retrieve suggested titles
            const culpritTitles = tasks
                .filter(t => culpritIds.includes(t.id))
                .map(t => `"${t.title}"`)
                .join(", ");

            const suffix = culpritTitles
                ? ` Specifically: ${culpritTitles}.`
                : "";

            const reasonSuffix = failureReason ? ` Reason: ${failureReason}` : "";

            throw new Error(`Planning Failed. ${reasonSuffix}${suffix} Please decrease task duration or extend deadlines.`);
        }

        // 4. Hydrate & Format
        const hydratedSchedule = generatedSchedule.map((item: any, index: number) => {
            const originalTask = tasks.find(t => t.id === item.taskId);
            const title = originalTask ? originalTask.title : item.title;
            const quadrant = item.quadrant || (originalTask ? (originalTask.relevance >= 3 && originalTask.urgency >= 3 ? 'Q1' : 'Q2') : 'Q4');

            // NOTE: We trust the AI's start/end times for split segments.
            // Do NOT force the original estimatedHours onto a single segment, as that breaks split tasks.

            return {
                id: item.id || `gen-${index}-${Date.now()}`,
                title: title,
                start: item.start,
                end: item.end,
                type: 'task_block' as 'task_block',
                taskId: item.taskId,
                isFixed: false,
                reasoning: item.reasoning || "AI Scheduled",
                quadrant: quadrant
            };
        }).filter((e: any) => e);

        // Identify fully unscheduled tasks (simple check: if a task ID from input is not in output schedule at all)
        // Note: For split tasks, they appear multiple times. We just need to check if *at least one* segment exists.
        const scheduledTaskIds = new Set(hydratedSchedule.map((e: any) => e.taskId));
        const unscheduledIds = tasks.filter(t => !t.isFixed && !scheduledTaskIds.has(t.id)).map(t => t.id);

        return {
            schedule: hydratedSchedule as CalendarEvent[],
            unscheduledTaskIds: unscheduledIds
        };

    } catch (error: any) {
        console.error("Error optimizing schedule with OpenAI:", error);

        if (error.message.includes("It is impossible to generate")) {
            throw error; // Propagate the specific overflow error
        }

        // Standard Error Handling
        if (error.status === 401) {
            throw new Error("Invalid OpenAI API Key. Please check your settings.");
        } else if (error.status === 429) {
            throw new Error("OpenAI Rate Limit Exceeded. You may be out of credits or sending too many requests.");
        } else if (error.status >= 500) {
            throw new Error("OpenAI Server Error. Please try again later.");
        }

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
