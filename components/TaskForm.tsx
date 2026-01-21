import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { X, Plus, Save } from 'lucide-react';

interface TaskFormProps {
  onSave: (task: Task) => void;
  onCancel: () => void;
  initialData?: Task;
}

const TaskForm: React.FC<TaskFormProps> = ({ onSave, onCancel, initialData }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    relevance: 3,
    urgency: 3,
    estimatedHours: 1,
    deadline: new Date().toISOString().split('T')[0],
    status: 'pending'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        deadline: initialData.deadline.split('T')[0] // Ensure date input format
      });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    onSave({
      id: initialData?.id || `task-${Date.now()}`,
      title: formData.title,
      relevance: Number(formData.relevance),
      urgency: Number(formData.urgency),
      estimatedHours: Number(formData.estimatedHours),
      deadline: new Date(formData.deadline as string).toISOString(), // simple date conversion
      status: formData.status || 'pending',
      description: formData.description
    } as Task);
  };

  const getQuadrantLabel = (imp: number, urg: number) => {
    if (imp >= 3 && urg >= 3) return { text: 'Do First (Q1)', color: 'text-red-600 bg-red-50' };
    if (imp >= 3 && urg < 3) return { text: 'Schedule (Q2)', color: 'text-blue-600 bg-blue-50' };
    if (imp < 3 && urg >= 3) return { text: 'Delegate (Q3)', color: 'text-amber-600 bg-amber-50' };
    return { text: 'Eliminate (Q4)', color: 'text-emerald-600 bg-emerald-50' };
  };

  const currentLabel = getQuadrantLabel(Number(formData.relevance), Number(formData.urgency));

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-800">
            {initialData ? 'Edit Task' : 'New Task'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
              placeholder="e.g. Finish Quarterly Report"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relevance (1-5)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  className="w-full accent-indigo-600"
                  value={formData.relevance}
                  onChange={(e) => setFormData({ ...formData, relevance: parseInt(e.target.value) })}
                />
                <span className="font-bold text-gray-600 w-4 text-center">{formData.relevance}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">5 = Very Important</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency (1-5)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  className="w-full accent-indigo-600"
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: parseInt(e.target.value) })}
                />
                <span className="font-bold text-gray-600 w-4 text-center">{formData.urgency}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">5 = Very Urgent</p>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-dashed border-gray-300 flex justify-between items-center">
             <span className="text-sm text-gray-500">Resulting Category:</span>
             <span className={`text-sm font-bold px-3 py-1 rounded-full ${currentLabel.color}`}>
                {currentLabel.text}
             </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
               <input
                 type="date"
                 required
                 className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                 value={formData.deadline}
                 onChange={(e) => setFormData({...formData, deadline: e.target.value})}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
               <input
                 type="number"
                 step="0.5"
                 min="0.5"
                 required
                 className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                 value={formData.estimatedHours}
                 onChange={(e) => setFormData({...formData, estimatedHours: parseFloat(e.target.value)})}
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
               <select
                 className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none bg-white"
                 value={formData.status}
                 onChange={(e) => setFormData({...formData, status: e.target.value as any})}
               >
                 <option value="pending">Todo</option>
                 <option value="in-progress">In Progress</option>
                 <option value="completed">Completed</option>
               </select>
             </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {initialData ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;