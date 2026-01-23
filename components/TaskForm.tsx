import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { X, Plus, Save } from 'lucide-react';
import GlassCard from './GlassCard';

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
    status: 'pending',
    isFixed: false,
    recurrence: 'none' as const,
    startTime: '09:00',
    finishTime: '10:00'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        deadline: initialData.deadline.split('T')[0] // Ensure date input format
      });
    }
  }, [initialData]);

  const calculateDuration = (start: string, finish: string) => {
    if (!start || !finish) return 1;
    const [startH, startM] = start.split(':').map(Number);
    const [finishH, finishM] = finish.split(':').map(Number);
    const dateStart = new Date(0, 0, 0, startH, startM);
    const dateFinish = new Date(0, 0, 0, finishH, finishM);
    let diff = (dateFinish.getTime() - dateStart.getTime()) / 3600000; // hours
    if (diff < 0) diff += 24; // Handle overnight wrap approx
    return parseFloat(diff.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    // Logic for Fixed Tasks
    let finalEstimatedHours = Number(formData.estimatedHours);
    let finalStatus = formData.status || 'pending';
    let finalDeadline = new Date(formData.deadline as string).toISOString();

    const isFixedTask = formData.isFixed || isQ4;

    if (isFixedTask) {
      // Auto-calculate duration
      finalEstimatedHours = calculateDuration(formData.startTime || '09:00', formData.finishTime || '10:00');
      // Clean up irrelevant fields
      finalStatus = 'pending'; // Always pending until done (or logic irrelevant)
      // Keep deadline as 'today' or whatever was set, key is recurrence logic handles the dates
    }

    onSave({
      id: initialData?.id || `task-${Date.now()}`,
      title: formData.title,
      relevance: Number(formData.relevance),
      urgency: Number(formData.urgency),
      estimatedHours: finalEstimatedHours,
      deadline: finalDeadline,
      status: finalStatus,
      description: formData.description,
      isFixed: isFixedTask,
      recurrence: formData.recurrence,
      startTime: formData.startTime,
      finishTime: formData.finishTime
    } as Task);
  };

  const getQuadrantLabel = (imp: number, urg: number) => {
    if (imp >= 3 && urg >= 3) return { text: 'Do First (Q1)', color: 'text-rose-400 bg-rose-500/20 border-rose-500/30' };
    if (imp >= 3 && urg < 3) return { text: 'Schedule (Q2)', color: 'text-blue-400 bg-blue-500/20 border-blue-500/30' };
    if (imp < 3 && urg >= 3) return { text: 'Delegate (Q3)', color: 'text-amber-400 bg-amber-500/20 border-amber-500/30' };
    return { text: 'Fixed Schedule (Q4)', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30' };
  };

  const currentLabel = formData.isFixed ? { text: 'Fixed Schedule (Q4)', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30' }
    : getQuadrantLabel(Number(formData.relevance), Number(formData.urgency));

  const isQ4 = Number(formData.relevance) < 3 && Number(formData.urgency) < 3;
  const showFixedFields = formData.isFixed || isQ4;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-lg overflow-hidden animate-fade-in-up" noPadding>
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="font-bold text-lg text-white">
            {initialData ? 'Edit Task' : 'New Task'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Task Title</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-white placeholder-gray-500"
              placeholder="e.g. Finish Quarterly Report"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Relevance (1-5)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  className="w-full accent-indigo-500"
                  value={formData.relevance}
                  onChange={(e) => setFormData({ ...formData, relevance: parseInt(e.target.value) })}
                />
                <span className="font-bold text-white w-4 text-center">{formData.relevance}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">5 = Very Important</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Urgency (1-5)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  className="w-full accent-indigo-500"
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: parseInt(e.target.value) })}
                />
                <span className="font-bold text-white w-4 text-center">{formData.urgency}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">5 = Very Urgent</p>
            </div>
          </div>

          {/* Fixed / Recurrent Toggle (Auto-enabled for Q4) */}
          <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
            <input
              type="checkbox"
              id="isFixed"
              className="w-5 h-5 rounded border-gray-500 text-indigo-600 focus:ring-indigo-500 bg-black/20 disabled:opacity-50"
              checked={showFixedFields}
              disabled={isQ4} // Forced ON for Q4
              onChange={(e) => setFormData({ ...formData, isFixed: e.target.checked })}
            />
            <label htmlFor="isFixed" className="text-sm font-medium text-gray-200 select-none cursor-pointer">
              {isQ4 ? "Fixed Schedule (Auto-detected)" : "Fixed / Recurrent Commitment"}
            </label>
          </div>

          {showFixedFields ? (
            // FIXED TASK FIELDS
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200 bg-white/5 p-4 rounded-xl border border-white/5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
                <input
                  type="time"
                  className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-white scheme-dark"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Finish Time</label>
                <input
                  type="time"
                  className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-white scheme-dark"
                  value={formData.finishTime}
                  onChange={(e) => setFormData({ ...formData, finishTime: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Recurrence</label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                  value={formData.recurrence}
                  onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as any })}
                >
                  <option value="none">None (One Time)</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays (M-F)</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
          ) : (
            // STANDARD TASK FIELDS
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Deadline</label>
                <input
                  type="date"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-white scheme-dark"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Est. Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="pending" className="bg-gray-800">Todo</option>
                  <option value="completed" className="bg-gray-800">Completed</option>
                </select>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg border border-white/10 bg-white/5 flex justify-between items-center">
            <span className="text-sm text-gray-400">Resulting Category:</span>
            <span className={`text-sm font-bold px-3 py-1 rounded-full border ${currentLabel.color}`}>
              {currentLabel.text}
            </span>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {initialData ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

export default TaskForm;