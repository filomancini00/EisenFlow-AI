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

export const optimizeSchedule = async (
    tasks: Task[],
    fixedEvents: CalendarEvent[],
    startDateStr: string,
    daysToPlan: number = 7
): Promise<CalendarEvent[]> => {
    try {
        const ai = getClient();

        // Prepare context
        const tasksJson = JSON.stringify(tasks.map(t => ({
            id: t.id,
            title: t.title,
            importance: t.relevance, // Map internal 'relevance' to 'importance' for AI context
            urgency: t.urgency,
            deadline: t.deadline
        })));

        const eventsJson = JSON.stringify(fixedEvents.map(e => ({
            title: e.title,
            start: e.start,
            end: e.end
        })));

        const prompt = `
      You are an expert productivity scheduler using the Eisenhower Matrix principles.
      
      Fixed Calendar Events (Do not move these): ${eventsJson}
      
      Your goal: Create a realistic schedule for the NEXT ${daysToPlan} DAYS starting from ${startDateStr}.
      
      CRITICAL INSTRUCTIONS FOR MULTI-DAY PLANNING:
      - Spread the tasks across the ${daysToPlan} days logicallly.
      - Do NOT cram everything into the first day.
      - PULL TASKS EXACTLY FROM THE "Input Tasks" LIST.
      - YOU MUST USE THE EXACT "id" AND "title" FROM THE INPUT TASKS. DO NOT INVENT NEW TASKS.
      - DO NOT RENAME TASKS.
      - Prioritize strictly based on the Eisenhower Matrix (Q1 then Q2).
      - If a task is not urgent (Q3/Q4) or doesn't fit in the ${daysToPlan} days, you may omit it.
      - Ensure there is breathing room between tasks.
      - Return a single flat list of events for all ${daysToPlan} days.

      rules:
      1. Respect fixed events completely.
      2. Prioritize tasks with high Importance (Relevance) and Urgency.
      3. Fit tasks into gaps between fixed events.
      4. Break large tasks into smaller blocks if needed.
      5. Include short breaks if the work block is long.
      6. Return a complete list of events for all ${daysToPlan} days (both the fixed ones and new task blocks).
      7. For each AI-scheduled task, provide a "reasoning" (e.g. "High Urgency Q1 task needed before lunch") and the "quadrant" (Q1, Q2, Q3, Q4).
      8. CRITICAL: The "taskId" field in your response MUST match the "id" of the task from the input EXACTLY. Do not change it.
      9. If you schedule a task, you MUST include its "taskId".
      
      Example output item:
      {
        "taskId": "task-123",  <-- MUST MATCH INPUT ID
        "title": "ignored-by-system", 
        "start": "2024-01-01T09:00:00",
        "end": "2024-01-01T10:00:00",
        "reasoning": "...",
        "quadrant": "Q1"
      }
      
      Format dates as ISO 8601 strings (e.g., "${startDateStr}T09:00:00").
      
      Input Tasks: ${tasksJson}
    `;

        const response = await ai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that outputs strictly valid JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2, // Low temperature for consistency
        });

        const content = response.choices[0].message.content || '{}';
        // OpenAI JSON mode often returns { "schedule": [...] } or just [...] depending on prompting.
        // We'll try to parse it safely.
        let generatedSchedule = [];
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                generatedSchedule = parsed;
            } else if (parsed.events) {
                generatedSchedule = parsed.events;
            } else if (parsed.schedule) {
                generatedSchedule = parsed.schedule;
            } else {
                // Fallback: try to find an array in the object
                const values = Object.values(parsed);
                const foundArray = values.find(v => Array.isArray(v));
                if (foundArray) generatedSchedule = foundArray as any[];
            }
        } catch (e) {
            console.error("Failed to parse OpenAI JSON", e);
            throw new Error("AI returned invalid JSON format.");
        }

        // 4. Hydrate & Format
        const hydratedSchedule = generatedSchedule.map((item: any, index: number) => {
            // A. Find original task to ensure data consistency (Rehydration)
            const originalTask = tasks.find(t => t.id === item.taskId);

            // If AI hallucinates an ID that doesn't exist, we might skip it or use the AI's title as fallback.
            // For strict consistency, if we find the task, we use ITS title.
            const title = originalTask ? originalTask.title : item.title;

            return {
                id: item.id || `gen-${index}-${Date.now()}`,
                title: title, // <--- DATA CONSISTENCY ENFORCED HERE
                start: item.start,
                end: item.end,
                type: 'task_block' as 'task_block', // Explicit cast to literal type
                taskId: item.taskId,
                isFixed: false,
                reasoning: item.reasoning,
                quadrant: item.quadrant
            };
        }).filter((e: any) => e); // Filter out nulls if we decided to drop unmatched tasks (optional)

        console.log("Hydration Complete. Events:", hydratedSchedule.length);
        const failures = hydratedSchedule.filter((e: any) => e.title !== tasks.find((t: any) => t.id === e.taskId)?.title);
        if (failures.length > 0) {
            console.warn("Hydration Mismatch detected for:", failures);
        }

        return hydratedSchedule;

    } catch (error) {
        console.error("Error optimizing schedule with OpenAI:", error);
        throw error;
    }
};
