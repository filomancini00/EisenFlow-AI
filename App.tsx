import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, Calendar as CalendarIcon, LayoutDashboard, Sparkles, Settings, List } from 'lucide-react';
import { Task, CalendarEvent } from './types';
import { INITIAL_TASKS, MOCK_MEETINGS } from './constants';
import MatrixView from './components/MatrixView';
import ScheduleView from './components/ScheduleView';
import TaskListView from './components/TaskListView';
import DashboardView from './components/DashboardView';
import TaskForm from './components/TaskForm';
import { optimizeSchedule } from './services/openaiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'schedule' | 'list'>('dashboard');
  // Initialize state from LocalStorage if available, else use defaults
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('eisenflow_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('eisenflow_events');
    return saved ? JSON.parse(saved) : [];
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Date state - defaults to today
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

  // Current time state for "Now" component
  const [now, setNow] = useState(new Date());

  // Update "Now" every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Determine current event
  const currentEvent = events.find(e => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    return now >= start && now < end;
  });

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('eisenflow_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('eisenflow_events', JSON.stringify(events));
  }, [events]);

  // Load initial mocks only if no events exist (and it's the very first run, optional logic)
  useEffect(() => {
    if (events.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      const transformedEvents = MOCK_MEETINGS.map(m => ({
        ...m,
        start: `${today}T${m.start}:00`,
        end: `${today}T${m.end}:00`
      }));
      setEvents(transformedEvents);
    }
  }, []);

  const handleSaveTask = (task: Task) => {
    // Logic to handle completion timestamp
    const updatedTask = { ...task };
    if (updatedTask.status === 'completed' && !updatedTask.completedAt) {
      updatedTask.completedAt = new Date().toISOString();
    } else if (updatedTask.status !== 'completed') {
      updatedTask.completedAt = undefined;
    }

    if (editingTask) {
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    } else {
      setTasks([...tasks, updatedTask]);
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
    setScheduleError(null);
    try {
      // 1. Get fixed events (Outlook/Calendar)
      const fixedEvents = events.filter(e => e.isFixed);

      // 2. Generate new schedule for NEXT 7 DAYS
      const newWeeklySchedule = await optimizeSchedule(tasks, fixedEvents, currentDate, 7);

      // 3. Define the window to clear (currentDate to currentDate + 7 days)
      const startWindow = new Date(currentDate);
      const endWindow = new Date(startWindow);
      endWindow.setDate(endWindow.getDate() + 7);
      const endWindowStr = endWindow.toISOString().split('T')[0];

      // 4. Keep events OUTSIDE the window (Past events OR Future events beyond 7 days)
      // Note: We depend on string comparison. '2023-01-01' < '2023-01-02'.
      // e.start is ISO (YYYY-MM-DDTHH:mm). currentDate is YYYY-MM-DD.
      const preservedEvents = events.filter(e => {
        const eDate = e.start.split('T')[0];
        return eDate < currentDate || eDate >= endWindowStr;
      });

      // 5. Merge
      setEvents([...preservedEvents, ...newWeeklySchedule]);
    } catch (err: any) {
      console.error(err);
      setScheduleError(err.message || "Failed to generate schedule");
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Theme Helpers
  // Enable dark mode for all redesigned tabs
  const isDark = true;

  const mainWrapperClass = isDark
    ? "min-h-screen bg-gray-900 text-white font-sans flex flex-col md:flex-row overflow-hidden relative"
    : "min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col md:flex-row overflow-hidden";

  const sidebarClass = isDark
    ? "w-full md:w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 flex-shrink-0 flex flex-col h-auto md:h-screen relative z-20"
    : "w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col h-auto md:h-screen relative z-20";

  const navItemClass = (isActive: boolean) => isDark
    ? `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${isActive ? 'bg-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.1)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
    : `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`;

  return (
    <div className={mainWrapperClass}>

      {/* Dark Ambient Background for Dashboard */}
      {isDark && (
        <>
          <div className="absolute top-0 left-0 w-full h-full bg-[#121212] z-0"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none z-0"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-900/20 blur-[120px] pointer-events-none z-0"></div>
        </>
      )}

      {/* Sidebar Navigation */}
      <aside className={sidebarClass}>
        <div className={`p-6 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
          <div className={`flex items-center gap-2 font-bold text-xl ${isDark ? 'text-white' : 'text-indigo-600'}`}>
            <Sparkles size={24} className={isDark ? "fill-orange-400 text-orange-400" : "fill-indigo-100"} />
            <span>EisenFlow</span>
          </div>
        </div>

        <div className="p-4 pb-0">
          <button
            onClick={() => {
              setEditingTask(undefined);
              setIsFormOpen(true);
            }}
            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg group ${isDark
              ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white hover:shadow-orange-500/20 hover:scale-[1.02]'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              }`}
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span>New Task</span>
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={navItemClass(activeTab === 'dashboard')}>
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button onClick={() => setActiveTab('matrix')} className={navItemClass(activeTab === 'matrix')}>
            <LayoutGrid size={18} />
            Matrix View
          </button>
          <button onClick={() => setActiveTab('list')} className={navItemClass(activeTab === 'list')}>
            <List size={18} />
            List View
          </button>
          <button onClick={() => setActiveTab('schedule')} className={navItemClass(activeTab === 'schedule')}>
            <CalendarIcon size={18} />
            Smart Schedule
          </button>
        </nav>

        <div className={`p-4 mt-auto border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
          {!isDark && (
            <div
              onClick={() => setActiveTab('schedule')}
              className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-4 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
              <h4 className="font-bold text-xs uppercase tracking-wider opacity-70 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                Current Focus
              </h4>
              {currentEvent ? (
                <div>
                  <p className="font-bold text-lg leading-tight mb-1 line-clamp-2">{currentEvent.title}</p>
                  <p className="text-xs opacity-80">
                    Ends at {new Date(currentEvent.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-lg leading-tight mb-1">Free Time</p>
                </div>
              )}
            </div>
          )}
          {isDark && (
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 p-[2px]">
                  <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-orange-400">F</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold">Filomancio</p>
                  <p className="text-xs text-gray-500">Premium Plan</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">

        {/* Render Header Only for Non-Dashboard Views if desired, OR keep for all */}
        {/* We can remove this shared header as each view now handles its own header inside the GlassCard */}


        {/* View Content */}
        <div className={`flex-1 overflow-hidden ${isDark ? '' : 'p-4 md:p-6 bg-[#F8FAFC]'}`}>
          {activeTab === 'dashboard' ? (
            <DashboardView tasks={tasks} events={events} onNavigate={setActiveTab} />
          ) : activeTab === 'matrix' ? (
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
                onDateChange={setCurrentDate}
                error={scheduleError}
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