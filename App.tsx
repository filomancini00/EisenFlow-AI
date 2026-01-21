import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, Calendar as CalendarIcon, PieChart, Sparkles, Settings, List } from 'lucide-react';
import { Task, CalendarEvent } from './types';
import { INITIAL_TASKS, MOCK_MEETINGS } from './constants';
import MatrixView from './components/MatrixView';
import ScheduleView from './components/ScheduleView';
import TaskListView from './components/TaskListView';
import TaskForm from './components/TaskForm';
import { optimizeSchedule } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'schedule' | 'list'>('matrix');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  
  // Date state - defaults to today
  const [currentDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Current time state for "Now" component
  const [now, setNow] = useState(new Date());

  // Update "Now" every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Determine current event
  const currentEvent = events.find(e => {
    // Basic date parsing assuming event dates are ISO strings including time
    const start = new Date(e.start);
    const end = new Date(e.end);
    return now >= start && now < end;
  });

  // Load initial mocks
  useEffect(() => {
    // Transform mock meetings to current date for the demo
    const today = new Date().toISOString().split('T')[0];
    const transformedEvents = MOCK_MEETINGS.map(m => ({
      ...m,
      start: `${today}T${m.start}:00`,
      end: `${today}T${m.end}:00`
    }));
    setEvents(transformedEvents);
  }, []);

  const handleSaveTask = (task: Task) => {
    if (editingTask) {
      setTasks(tasks.map(t => t.id === task.id ? task : t));
    } else {
      setTasks([...tasks, task]);
    }
    setIsFormOpen(false);
    setEditingTask(undefined);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const generateSchedule = async () => {
    setIsLoadingSchedule(true);
    // Filter only fixed events to send to AI (user might have manually added some)
    const fixedEvents = events.filter(e => e.isFixed);
    
    // Call Gemini
    const newSchedule = await optimizeSchedule(tasks, fixedEvents, currentDate);
    
    setEvents(newSchedule);
    setIsLoadingSchedule(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col h-auto md:h-screen">
        <div className="p-6 border-b border-gray-100">
           <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
             <Sparkles size={24} className="fill-indigo-100" />
             <span>EisenFlow</span>
           </div>
        </div>
        
        <nav className="p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('matrix')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'matrix' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutGrid size={18} />
            Matrix View
          </button>
          <button 
             onClick={() => setActiveTab('list')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <List size={18} />
            List View
          </button>
          <button 
             onClick={() => setActiveTab('schedule')}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'schedule' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <CalendarIcon size={18} />
            Smart Schedule
          </button>
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
             {/* Decorative circle */}
             <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
             
             <h4 className="font-bold text-xs uppercase tracking-wider opacity-70 mb-2 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
               Current Focus
             </h4>
             
             {currentEvent ? (
               <div>
                 <p className="font-bold text-lg leading-tight mb-1 line-clamp-2">{currentEvent.title}</p>
                 <p className="text-xs opacity-80">
                   Ends at {new Date(currentEvent.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </p>
               </div>
             ) : (
               <div>
                 <p className="font-bold text-lg leading-tight mb-1">Free Time</p>
                 <p className="text-xs opacity-80">
                   {events.length > 2 ? "You're free! Check your priorities." : "Generate your schedule to see what's next."}
                 </p>
               </div>
             )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 md:px-8 flex-shrink-0">
           <h1 className="text-xl font-bold text-gray-800">
             {activeTab === 'matrix' ? 'Eisenhower Matrix' : activeTab === 'list' ? 'Task List' : 'Daily Plan'}
           </h1>
           
           <div className="flex items-center gap-3">
             <button 
                onClick={() => { setEditingTask(undefined); setIsFormOpen(true); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2"
             >
               <Plus size={18} />
               Add Task
             </button>
             <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 border border-gray-300">
               <Settings size={16} />
             </div>
           </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-hidden p-4 md:p-6 bg-[#F8FAFC]">
          {activeTab === 'matrix' ? (
             <MatrixView 
               tasks={tasks} 
               onDelete={handleDeleteTask}
               onEdit={handleEditTask}
             />
          ) : activeTab === 'list' ? (
            <div className="h-full max-w-5xl mx-auto">
              <TaskListView
                tasks={tasks}
                onDelete={handleDeleteTask}
                onEdit={handleEditTask}
              />
            </div>
          ) : (
            <div className="h-full max-w-4xl mx-auto">
               <ScheduleView 
                  events={events}
                  isLoading={isLoadingSchedule}
                  onRefreshSchedule={generateSchedule}
                  dateStr={currentDate}
               />
            </div>
          )}
        </div>
      </main>

      {/* Task Form Modal */}
      {isFormOpen && (
        <TaskForm 
          onSave={handleSaveTask}
          onCancel={() => { setIsFormOpen(false); setEditingTask(undefined); }}
          initialData={editingTask}
        />
      )}
    </div>
  );
};

export default App;