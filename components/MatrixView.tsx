import React from 'react';
import { Task, Quadrant } from '../types';
import { AlertCircle, Calendar, Trash2, ArrowRightCircle, Plus } from 'lucide-react';
import GlassCard from './GlassCard';

interface MatrixViewProps {
  tasks: Task[];
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

const MatrixView: React.FC<MatrixViewProps> = ({ tasks, onDelete, onEdit }) => {

  const getQuadrant = (t: Task): Quadrant => {
    if (t.relevance >= 3 && t.urgency >= 3) return Quadrant.Q1;
    if (t.relevance >= 3 && t.urgency < 3) return Quadrant.Q2;
    if (t.relevance < 3 && t.urgency >= 3) return Quadrant.Q3;
    return Quadrant.Q4;
  };

  const groupedTasks = {
    [Quadrant.Q1]: tasks.filter(t => getQuadrant(t) === Quadrant.Q1),
    [Quadrant.Q2]: tasks.filter(t => getQuadrant(t) === Quadrant.Q2),
    [Quadrant.Q3]: tasks.filter(t => getQuadrant(t) === Quadrant.Q3),
    [Quadrant.Q4]: tasks.filter(t => getQuadrant(t) === Quadrant.Q4),
  };

  const getQuadrantStyles = (type: Quadrant) => {
    switch (type) {
      case Quadrant.Q1: return {
        border: 'border-t-4 border-t-rose-500',
        bg: 'bg-rose-500/10',
        iconColor: 'text-rose-400',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      };
      case Quadrant.Q2: return {
        border: 'border-t-4 border-t-blue-500',
        bg: 'bg-blue-500/10',
        iconColor: 'text-blue-400',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      };
      case Quadrant.Q3: return {
        border: 'border-t-4 border-t-amber-500',
        bg: 'bg-amber-500/10',
        iconColor: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      };
      case Quadrant.Q4: return {
        border: 'border-t-4 border-t-emerald-500',
        bg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      };
    }
  };

  const QuadrantCard = ({ title, description, tasks, type, icon: Icon }: { title: string, description: string, tasks: Task[], type: Quadrant, icon: any }) => {
    const styles = getQuadrantStyles(type);

    return (
      <GlassCard className={`h-full flex flex-col relative overflow-hidden group ${styles.bg} ${styles.border}`} noPadding>
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex justify-between items-start">
          <div>
            <h3 className={`font-bold text-lg flex items-center gap-2 ${styles.iconColor}`}>
              <Icon size={18} />
              {title}
            </h3>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${styles.badge}`}>
            {tasks.length}
          </span>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500/50 text-sm italic">
              <span className="opacity-50">No tasks</span>
            </div>
          ) : (
            tasks.map(task => (
              <div
                key={task.id}
                onClick={() => onEdit(task)}
                className="bg-black/20 hover:bg-black/40 border border-white/5 p-3 rounded-xl transition-all cursor-pointer group/item relative overflow-hidden"
              >
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className={`font-medium text-gray-200 text-sm leading-tight block truncate ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                      {task.title}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-rose-400 transition-opacity p-1 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3 relative z-10">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-gray-500">Est:</span> {task.estimatedHours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-gray-500">Due:</span> {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {task.status === 'completed' && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      Done
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full p-4 md:p-8 max-w-7xl mx-auto">
      <QuadrantCard
        title="Do First"
        description="Urgent & Important"
        tasks={groupedTasks[Quadrant.Q1]}
        type={Quadrant.Q1}
        icon={AlertCircle}
      />
      <QuadrantCard
        title="Schedule"
        description="Not Urgent & Important"
        tasks={groupedTasks[Quadrant.Q2]}
        type={Quadrant.Q2}
        icon={Calendar}
      />
      <QuadrantCard
        title="Delegate"
        description="Urgent & Not Important"
        tasks={groupedTasks[Quadrant.Q3]}
        type={Quadrant.Q3}
        icon={ArrowRightCircle}
      />
      <QuadrantCard
        title="Eliminate"
        description="Not Urgent & Not Important"
        tasks={groupedTasks[Quadrant.Q4]}
        type={Quadrant.Q4}
        icon={Trash2}
      />
    </div>
  );
};

export default MatrixView;