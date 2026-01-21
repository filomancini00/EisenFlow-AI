import { GoogleGenAI, Type } from "@google/genai";
import { Task, CalendarEvent } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const optimizeSchedule = async (
  tasks: Task[],
  fixedEvents: CalendarEvent[],
  dateStr: string
): Promise<CalendarEvent[]> => {
  try {
    const ai = getClient();
    
    // Prepare data for the prompt
    const tasksJson = JSON.stringify(tasks.filter(t => t.status !== 'completed').map(t => ({
      id: t.id,
      title: t.title,
      importance: t.relevance, // Map to semantic name
      urgency: t.urgency,
      deadline: t.deadline,
      hours: t.estimatedHours
    })));

    const eventsJson = JSON.stringify(fixedEvents.map(e => ({
      title: e.title,
      start: e.start,
      end: e.end,
      type: e.type
    })));

    const prompt = `
      You are an expert productivity scheduler using the Eisenhower Matrix principles.
      
      Date to schedule: ${dateStr} (Assume start of work day is 09:00 if not specified, end is 18:00).
      
      Input Tasks: ${tasksJson}
      Fixed Calendar Events (Do not move these): ${eventsJson}
      
      Your goal: Create a realistic daily schedule for THIS SPECIFIC DATE (${dateStr}).
      1. Respect fixed events completely.
      2. Prioritize tasks with high Importance (Relevance) and Urgency (Eisenhower Q1 & Q2).
      3. Fit tasks into gaps between fixed events.
      4. Break large tasks into smaller blocks if needed.
      5. Include short breaks if the work block is long.
      6. Return a complete list of events for the day (both the fixed ones and new task blocks).
      
      Format dates as ISO 8601 strings (e.g., "${dateStr}T09:00:00").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              start: { type: Type.STRING },
              end: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['meeting', 'task_block', 'break'] },
              taskId: { type: Type.STRING, nullable: true },
              isFixed: { type: Type.BOOLEAN },
            },
            required: ['title', 'start', 'end', 'type', 'isFixed']
          }
        }
      }
    });

    const generatedSchedule = JSON.parse(response.text || '[]');
    
    // Ensure uniqueness of IDs if AI hallucinates duplicates or simple integers
    return generatedSchedule.map((item: any, index: number) => ({
      ...item,
      id: item.id || `gen-${index}-${Date.now()}`
    }));

  } catch (error) {
    console.error("Error optimizing schedule:", error);
    // Fallback: Just return fixed events if AI fails
    return fixedEvents;
  }
};
