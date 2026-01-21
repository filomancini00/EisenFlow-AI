import React from 'react';
import { Task, Quadrant } from '../types';
import { QUADRANT_COLORS, QUADRANT_BG } from '../constants';
import { Calendar, Clock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface TaskListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ tasks, onEdit, onDelete }) => {
  // Helper to determine quadrant
  const getQuadrant = (t: Task): Quadrant => {
    if (t.relevance >= 3 && t.urgency >= 3) return Quadrant.Q1;
    if (t.relevance >= 3 && t.urgency < 3) return Quadrant.Q2;
    if (t.relevance < 3 && t.urgency >= 3) return Quadrant.Q3;
    return Quadrant.Q4;
  };

  // Sort by deadline ascending (most recent/soonest first)
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  const getStatusBadge = (status: Task['status']) => {
    switch(status) {
      case 'completed': 
        return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 uppercase tracking-wide">Done</span>;
      case 'in-progress': 
        return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wide">Active</span>;
      default: 
        return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">Todo</span>;
    }
  };

  const getRowStyle = (quadrant: Quadrant) => {
      // Subtle background tint based on quadrant
      switch(quadrant) {
          case Quadrant.Q1: return 'hover:bg-red-50/50 border-l-red-500';
          case Quadrant.Q2: return 'hover:bg-blue-50/50 border-l-blue-500';
          case Quadrant.Q3: return 'hover:bg-amber-50/50 border-l-amber-500';
          case Quadrant.Q4: return 'hover:bg-emerald-50/50 border-l-emerald-500';
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-gray-800">All Tasks</h2>
                <p className="text-sm text-gray-500">Ordered by deadline urgency</p>
            </div>
            <div className="flex gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Do First</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Schedule</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Delegate</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Eliminate</div>
            </div>
        </div>
        <div className="divide-y divide-gray-100 overflow-y-auto flex-1 custom-scrollbar">
            {sortedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <p>No tasks found.</p>
                </div>
            ) : (
                sortedTasks.map(task => {
                    const quadrant = getQuadrant(task);
                    
                    return (
                        <div 
                            key={task.id} 
                            onClick={() => onEdit(task)}
                            className={`p-4 transition-all flex items-center gap-4 group cursor-pointer border-l-4 ${getRowStyle(quadrant)}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1.5">
                                    <h3 className={`font-semibold text-gray-900 truncate ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                        {task.title}
                                    </h3>
                                    {getStatusBadge(task.status)}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
                                    <span className={`flex items-center gap-1.5 ${new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'text-red-600 font-medium' : ''}`}>
                                        <Calendar size={13} />
                                        Due: {new Date(task.deadline).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock size={13} />
                                        Est: {task.estimatedHours}h
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <AlertCircle size={13} />
                                        {quadrant}
                                    </span>
                                </div>
                            </div>

                            <button 
                                 onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                 className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                 title="Delete Task"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                            
                            <div className="opacity-0 group-hover:opacity-100 text-indigo-400">
                                <ArrowRight size={16} />
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default TaskListView;