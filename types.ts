export interface Task {
  id: string;
  title: string;
  description?: string;
  relevance: number; // 1-5 (Importance)
  urgency: number; // 1-5
  deadline: string; // ISO Date string
  estimatedHours: number;
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: string; // ISO Date string
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO Date Time string
  end: string; // ISO Date Time string
  type: 'meeting' | 'task_block' | 'break';
  taskId?: string; // If linked to a task
  isFixed: boolean; // True for Outlook meetings, False for AI suggestions
  reasoning?: string; // AI explanation for scheduling this
  quadrant?: string; // Q1, Q2, Q3, Q4
}

export enum Quadrant {
  Q1 = 'Do First',
  Q2 = 'Schedule',
  Q3 = 'Delegate',
  Q4 = 'Eliminate',
}

export interface DaySchedule {
  date: string;
  events: CalendarEvent[];
}
