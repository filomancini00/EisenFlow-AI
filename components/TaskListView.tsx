import React from 'react';
import { Task, Quadrant } from '../types';
import { Calendar, Clock, AlertCircle, ArrowRight, Trash2 } from 'lucide-react';
import GlassCard from './GlassCard';

interface TaskListViewProps {
    tasks: Task[];
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
}

const TaskListView: React.FC<TaskListViewProps> = ({ tasks, onEdit, onDelete }) => {
    // Helper to determine quadrant - reused logic
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
        switch (status) {
            case 'completed':
                return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wide">Done</span>;
            case 'in-progress':
                return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wide">Active</span>;
            default:
                return <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-white/10 uppercase tracking-wide">Todo</span>;
        }
    };

    const getTheme = (quadrant: Quadrant) => {
        switch (quadrant) {
            case Quadrant.Q1: return { bg: 'bg-rose-500/5 hover:bg-rose-500/10', border: 'border-l-rose-500', text: 'text-rose-100', icon: 'text-rose-400', title: 'text-rose-200' };
            case Quadrant.Q2: return { bg: 'bg-blue-500/5 hover:bg-blue-500/10', border: 'border-l-blue-500', text: 'text-blue-100', icon: 'text-blue-400', title: 'text-blue-200' };
            case Quadrant.Q3: return { bg: 'bg-amber-500/5 hover:bg-amber-500/10', border: 'border-l-amber-500', text: 'text-amber-100', icon: 'text-amber-400', title: 'text-amber-200' };
            case Quadrant.Q4: return { bg: 'bg-emerald-500/5 hover:bg-emerald-500/10', border: 'border-l-emerald-500', text: 'text-emerald-100', icon: 'text-emerald-400', title: 'text-emerald-200' };
        }
    };

    return (
        <div className="h-full p-4 md:p-8 max-w-5xl mx-auto font-sans text-white">
            <GlassCard className="h-full flex flex-col overflow-hidden" noPadding>
                <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            All Tasks <span className="text-sm font-normal text-gray-400">({tasks.length})</span>
                        </h2>
                        <p className="text-sm text-gray-500">Ordered by deadline urgency</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div> Do First</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div> Schedule</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div> Delegate</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div> Eliminate</div>
                    </div>
                </div>

                <div className="divide-y divide-white/5 overflow-y-auto flex-1 custom-scrollbar">
                    {sortedTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500/50">
                            <p>No tasks found.</p>
                        </div>
                    ) : (
                        sortedTasks.map(task => {
                            const quadrant = getQuadrant(task);
                            const theme = getTheme(quadrant);

                            return (
                                <div
                                    key={task.id}
                                    onClick={() => onEdit(task)}
                                    className={`p-4 transition-all flex items-center gap-4 group cursor-pointer border-l-[4px] ${theme.bg} ${theme.border}`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1.5">
                                            <h3 className={`font-semibold text-base truncate ${task.status === 'completed' ? 'line-through text-gray-500' : theme.title}`}>
                                                {task.title}
                                            </h3>
                                            {getStatusBadge(task.status)}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400">
                                            <span className={`flex items-center gap-1.5 ${new Date(task.deadline) < new Date() && task.status !== 'completed' ? 'text-rose-400 font-bold' : theme.icon}`}>
                                                <Calendar size={13} />
                                                Due: {new Date(task.deadline).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className={`flex items-center gap-1.5 ${theme.icon}`}>
                                                <Clock size={13} />
                                                Est: {task.estimatedHours}h
                                            </span>
                                            <span className={`flex items-center gap-1.5 ${theme.icon}`}>
                                                <AlertCircle size={13} />
                                                <span className="opacity-90 font-medium">Q{quadrant === Quadrant.Q1 ? '1' : quadrant === Quadrant.Q2 ? '2' : quadrant === Quadrant.Q3 ? '3' : '4'}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-white hover:bg-rose-500/20 rounded-xl transition-all"
                                        title="Delete Task"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    <div className="opacity-0 group-hover:opacity-100 text-gray-500 group-hover:translate-x-1 transition-all">
                                        <ArrowRight size={18} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

export default TaskListView;