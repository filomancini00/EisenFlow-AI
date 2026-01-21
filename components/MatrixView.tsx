import React from 'react';
import { Task, Quadrant } from '../types';
import { QUADRANT_COLORS, QUADRANT_BG } from '../constants';
import { AlertCircle, Calendar, Trash2, ArrowRightCircle } from 'lucide-react';

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

  const QuadrantCard = ({ title, description, tasks, type, icon: Icon }: { title: string, description: string, tasks: Task[], type: Quadrant, icon: any }) => (
    <div className={`h-full flex flex-col p-4 rounded-xl border-2 ${type === Quadrant.Q1 || type === Quadrant.Q3 ? 'border-r-0' : ''} border-gray-100 bg-white shadow-sm hover:shadow-md transition-all relative overflow-hidden group`}>
      {/* Header */}
      <div className={`absolute top-0 left-0 w-full h-1 ${QUADRANT_BG[type]}`}></div>
      
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`font-bold text-lg flex items-center gap-2 ${QUADRANT_COLORS[type].split(' ')[2]}`}>
            <Icon size={18} />
            {title}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded-full text-gray-600">
          {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 text-sm italic">
            No tasks here
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`p-3 bg-gray-50 border border-gray-100 rounded-lg group/item hover:bg-white hover:border-gray-200 transition-colors cursor-pointer relative ${task.status === 'completed' ? 'opacity-60 bg-gray-100/50' : ''}`} onClick={() => onEdit(task)}>
               <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 pr-2">
                    <span className={`font-medium text-gray-800 text-sm leading-tight block truncate ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>{task.title}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                    className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
               </div>
               <div className="flex items-center justify-between mt-3">
                   <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">Est:</span> {task.estimatedHours}h
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">Due:</span> {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                   </div>
                   
                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide
                     ${task.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' : 
                       task.status === 'in-progress' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                       'bg-gray-200 text-gray-600 border-gray-300'}`}>
                      {task.status === 'completed' ? 'Done' : task.status === 'in-progress' ? 'Active' : 'Todo'}
                   </span>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[600px]">
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