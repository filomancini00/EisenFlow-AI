import { Quadrant } from "./types";

export const QUADRANT_COLORS = {
  [Quadrant.Q1]: 'bg-red-50 border-red-200 text-red-800',
  [Quadrant.Q2]: 'bg-blue-50 border-blue-200 text-blue-800',
  [Quadrant.Q3]: 'bg-amber-50 border-amber-200 text-amber-800',
  [Quadrant.Q4]: 'bg-emerald-50 border-emerald-200 text-emerald-800',
};

export const QUADRANT_BG = {
  [Quadrant.Q1]: 'bg-red-500',
  [Quadrant.Q2]: 'bg-blue-500',
  [Quadrant.Q3]: 'bg-amber-500',
  [Quadrant.Q4]: 'bg-emerald-500',
};

export const MOCK_MEETINGS = [
  {
    id: 'm1',
    title: 'Daily Standup',
    start: '09:00',
    end: '09:30',
    type: 'meeting' as const,
    isFixed: true,
  },
  {
    id: 'm2',
    title: 'Client Sync - Project Alpha',
    start: '14:00',
    end: '15:00',
    type: 'meeting' as const,
    isFixed: true,
  }
];

export const INITIAL_TASKS = [
  {
    id: 't1',
    title: 'Finalize Q3 Budget Report',
    relevance: 5,
    urgency: 5,
    deadline: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
    estimatedHours: 2,
    status: 'pending' as const
  },
  {
    id: 't2',
    title: 'Draft Marketing Strategy',
    relevance: 5,
    urgency: 2,
    deadline: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
    estimatedHours: 4,
    status: 'pending' as const
  },
  {
    id: 't3',
    title: 'Reply to vendor emails',
    relevance: 2,
    urgency: 4,
    deadline: new Date().toISOString().split('T')[0],
    estimatedHours: 0.5,
    status: 'pending' as const
  },
  {
    id: 't4',
    title: 'Organize desktop files',
    relevance: 1,
    urgency: 1,
    deadline: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
    estimatedHours: 1,
    status: 'pending' as const
  }
];
