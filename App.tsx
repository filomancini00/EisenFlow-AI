import React, { useState, useEffect } from 'react';
import { useEventNotifications } from './hooks/useEventNotifications';
import { NotificationProvider } from './contexts/NotificationContext';

import { Plus, LayoutGrid, Calendar as CalendarIcon, LayoutDashboard, Sparkles, Settings, List, LogOut, User as UserIcon } from 'lucide-react';
import { Task, CalendarEvent } from './types';
import { INITIAL_TASKS, MOCK_MEETINGS } from './constants';
import MatrixView from './components/MatrixView';
import ScheduleView from './components/ScheduleView';
import TaskListView from './components/TaskListView';
import DashboardView from './components/DashboardView';
import TaskForm from './components/TaskForm';
import { optimizeSchedule } from './services/openaiService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';

import { supabase } from './services/supabaseClient';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { getGoogleCalendarEvents } from './services/googleCalendarService';
import ErrorBoundary from './components/ErrorBoundary';
import { expandFixedTasks } from './utils/scheduleUtils';

const EisenFlowApp: React.FC = () => {
  const { user, login, signup, logout, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'schedule' | 'list'>('dashboard');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Enable Browser Notifications
  useEventNotifications(events);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => localStorage.getItem('google_access_token'));

  // Persist Google Token

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

  // Load Data
  useEffect(() => {
    if (isAuthLoading) return;

    const loadData = async () => {
      if (user) {
        // Load from Supabase
        const { data: tasksData } = await supabase.from('tasks').select('*');
        if (tasksData) setTasks(tasksData as any);

        const { data: eventsData } = await supabase.from('events').select('*');
        if (eventsData) setEvents(eventsData as any);
      } else {
        // Load from Local Storage (Guest)
        const savedTasks = localStorage.getItem('eisenflow_tasks_guest');
        const savedEvents = localStorage.getItem('eisenflow_events_guest');

        if (savedTasks) setTasks(JSON.parse(savedTasks));
        else setTasks(INITIAL_TASKS);

        if (savedEvents) setEvents(JSON.parse(savedEvents));
        else {
          const today = new Date().toISOString().split('T')[0];
          const transformedEvents = MOCK_MEETINGS.map(m => ({
            ...m,
            start: `${today}T${m.start}:00`,
            end: `${today}T${m.end}:00`
          }));
          setEvents(transformedEvents);
        }
      }
    };

    loadData();
  }, [user, isAuthLoading]);

  // Persistence (Auto-Save mainly for Guest, for Supabase we save on action)
  useEffect(() => {
    if (isAuthLoading || user) return; // Don't auto-save to LS if user logged in
    localStorage.setItem('eisenflow_tasks_guest', JSON.stringify(tasks));
  }, [tasks, user, isAuthLoading]);

  useEffect(() => {
    if (isAuthLoading || user) return;
    localStorage.setItem('eisenflow_events_guest', JSON.stringify(events));
  }, [events, user, isAuthLoading]);

  // Real-time Linked Task Update & Auto-Expand Fixed Tasks
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    setEvents(prevEvents => {
      let updatedEvents = [...prevEvents];
      let hasChanges = false;

      // 1. Update Existing Linked Events (Title/Desc Changes)
      updatedEvents = updatedEvents.map(ev => {
        if (!ev.taskId) return ev;
        const task = tasks.find(t => t.id === ev.taskId);
        if (task && (ev.title !== task.title)) {
          hasChanges = true;
          return { ...ev, title: task.title };
        }
        return ev;
      });

      // 2. Refresh Fixed Tasks (Auto-generate for next 30 days to cover immediate needs)
      // This ensures that as soon as a user adds a Fixed Task, it appears in events (and thus notifications)
      // Use currentDate to be deterministic and avoid millisecond mismatches
      const newFixedEvents = expandFixedTasks(tasks, new Date(currentDate), 30);

      // Remove OLD Fixed events (that start with 'fixed-') because we are regenerating them
      // But keep everything else (Google events, AI generated flexible blocks, Meetings)
      const nonFixedEvents = updatedEvents.filter(e => !e.id.startsWith('fixed-'));

      // Check if new set is different from what we would have
      // We can just bluntly replace the 'fixed-' portion
      const currentFixedEvents = updatedEvents.filter(e => e.id.startsWith('fixed-'));

      if (JSON.stringify(currentFixedEvents) !== JSON.stringify(newFixedEvents) || hasChanges) {
        return [...nonFixedEvents, ...newFixedEvents];
      }

      return prevEvents;
    });
  }, [tasks]);


  const handleSaveTask = async (task: Task) => {
    // Logic to handle completion timestamp
    const updatedTask = { ...task };
    if (updatedTask.status === 'completed' && !updatedTask.completedAt) {
      updatedTask.completedAt = new Date().toISOString();
    } else if (updatedTask.status !== 'completed') {
      updatedTask.completedAt = undefined;
    }

    // Optimistic Update
    let newTasks;
    if (editingTask) {
      newTasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    } else {
      updatedTask.id = updatedTask.id || crypto.randomUUID(); // Ensure UUID for Supabase
      newTasks = [...tasks, updatedTask];
    }
    setTasks(newTasks);

    // Persist
    if (user) {
      // Sanitize payload for Supabase (remove fields not in DB schema)
      const { startTime, finishTime, ...taskPayload } = updatedTask;

      // Supabase Upsert
      const { error } = await supabase.from('tasks').upsert({
        ...taskPayload,
        user_id: user.id
      });
      if (error) console.error("Failed to save task:", error);
    }

    setIsFormOpen(false);
    setEditingTask(undefined);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (user) {
      await supabase.from('tasks').delete().eq('id', id);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };


  const handleAddEvent = async (event: CalendarEvent) => {
    if (events.some(e => e.id === event.id)) return;

    const newEvents = [...events, event];
    setEvents(newEvents);

    if (user) {
      await supabase.from('events').insert({
        ...event,
        user_id: user.id
      });
    }
  };


  // Helper to sync events
  const syncGoogleEvents = async (token: string) => {
    try {
      console.log("DEBUG: Syncing Google Calendar Events...");
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      const end = new Date(now);
      end.setDate(end.getDate() + 90);

      const refreshedGoogleEvents = await getGoogleCalendarEvents(token, start.toISOString(), end.toISOString());

      setEvents(prevEvents => {
        // Filter out existing google events to compare
        const existingGoogleEvents = prevEvents.filter(e => e.id.startsWith('google-'));

        // Simple comparison: Check if length differs or if IDs/Times differ
        // We can use JSON stringify for a quick deep check of the data subset
        const isDifferent = JSON.stringify(existingGoogleEvents) !== JSON.stringify(refreshedGoogleEvents);

        if (!isDifferent) {
          console.log("DEBUG: Google Events Unchanged. Skipping update.");
          return prevEvents;
        }

        console.log("DEBUG: Google Events Changed. Updating state.");
        const nonGoogleEvents = prevEvents.filter(e => !e.id.startsWith('google-'));
        return [...nonGoogleEvents, ...refreshedGoogleEvents];
      });

    } catch (err: any) {
      console.error("Failed to sync Google events", err);
      if (err.status === 401) {
        console.log("Google Token expired or invalid. disconnect.");
        setGoogleAccessToken(null);
      }
    }
  };

  // Google Login Hook
  const connectGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleAccessToken(tokenResponse.access_token);
      await syncGoogleEvents(tokenResponse.access_token);
    },
    onError: errorResponse => console.error(errorResponse),
    scope: 'https://www.googleapis.com/auth/calendar.readonly'
  });

  // Poll Google Calendar every 60 seconds (and sync immediately on load/connect)
  useEffect(() => {
    if (!googleAccessToken) return;

    // Immediate sync on mount/token change
    syncGoogleEvents(googleAccessToken);

    const intervalId = setInterval(() => {
      syncGoogleEvents(googleAccessToken);
    }, 60000); // 1 minute

    return () => clearInterval(intervalId);
  }, [googleAccessToken]);

  const handleConnectGoogle = () => {
    connectGoogle();
  };


  const generateSchedule = async () => {
    setIsLoadingSchedule(true);
    setScheduleError(null);

    // 0. Refresh Google Events if connected
    let currentEvents = [...events];

    if (googleAccessToken) {
      try {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        const end = new Date(now);
        end.setDate(end.getDate() + 90);

        const refreshedGoogleEvents = await getGoogleCalendarEvents(googleAccessToken, start.toISOString(), end.toISOString());

        // Sync Local Var for calculation
        const nonGoogleEvents = currentEvents.filter(e => !e.id.startsWith('google-'));
        currentEvents = [...nonGoogleEvents, ...refreshedGoogleEvents];

        // Also update React State
        setEvents(currentEvents);
      } catch (e) { console.error(e); }
    }

    console.log("DEBUG: generateSchedule START. Events in state:", currentEvents.length);
    if (currentEvents.length > 0) {
      console.log("DEBUG: First event sample:", currentEvents[0]);
      console.log("DEBUG: Fixed events count in state:", currentEvents.filter(e => e.isFixed).length);
      console.log("DEBUG: Events starting with 'google-':", currentEvents.filter(e => e.id.startsWith('google-')).length);
    }

    try {
      // 1. Separate tasks (Filter out completed ones)
      const pendingTasks = tasks.filter(t => t.status !== 'completed');
      const fixedTasks = pendingTasks.filter(t => t.isFixed);
      const flexibleTasks = pendingTasks.filter(t => !t.isFixed);

      // 2. Expand Fixed Tasks into Events (Recurrence Logic)
      const recurrenceEvents = expandFixedTasks(fixedTasks, new Date(currentDate), 7);

      // 3. Get existing fixed events (Outlook/Calendar)
      // Debug log
      console.log("DEBUG: Filtering existing fixed events from", currentEvents.length, "events");
      const existingFixedEvents = currentEvents.filter(e => !!e.isFixed && !e.id.startsWith('fixed-'));
      console.log("DEBUG: Found existingFixedEvents:", existingFixedEvents.length);

      const allFixedConstraints = [...existingFixedEvents, ...recurrenceEvents];

      // 4. Generate new schedule for NEXT 7 DAYS with Flexible Tasks only
      // Pass isWorkWeekOnly to the optimizer
      const optimizationResult = await optimizeSchedule(flexibleTasks, allFixedConstraints, currentDate, 7, dayStartHour, dayEndHour, isWorkWeekOnly);

      let newWeeklySchedule = optimizationResult.schedule;
      const unscheduledIds = optimizationResult.unscheduledTaskIds;

      // Notify about unscheduled tasks
      if (unscheduledIds && unscheduledIds.length > 0) {
        // Find titles for better message
        const count = unscheduledIds.length;
        setScheduleError(`Schedule generated, but ${count} tasks could not fit in availability.`);
        // Note: In a real app we'd use a Toast here, but setting error state works for visibility
      }

      // 4b. CORRECT THE QUADRANTS (Don't trust AI labels)
      newWeeklySchedule = newWeeklySchedule.map(ev => {
        const task = flexibleTasks.find(t => t.id === ev.taskId);
        if (!task) return ev;

        let trueQuadrant = 'Q4';
        if (task.relevance >= 3 && task.urgency >= 3) trueQuadrant = 'Q1';
        else if (task.relevance >= 3 && task.urgency < 3) trueQuadrant = 'Q2';
        else if (task.relevance < 3 && task.urgency >= 3) trueQuadrant = 'Q3';

        return { ...ev, quadrant: trueQuadrant };
      });

      // 5. Define the window to clear
      const endWindow = new Date(currentDate);
      endWindow.setDate(endWindow.getDate() + 7);
      const endWindowStr = endWindow.toISOString().split('T')[0];

      // 6. Keep FLEXIBLE events OUTSIDE the window (since we are replacing the window, and re-adding all fixed)
      const preservedFlexibleEvents = currentEvents.filter(e => {
        const eDate = e.start.split('T')[0];
        // Keep only if outside window AND NOT FIXED (because ALL fixed are in allFixedConstraints/existingFixedEvents)
        return (eDate < currentDate || eDate >= endWindowStr) && !e.isFixed;
      });

      console.log('DEBUG: generateSchedule', {
        totalEvents: events.length,
        fixed: existingFixedEvents.length,
        recurrence: recurrenceEvents.length,
        newWeekly: newWeeklySchedule.length,
        preservedFlex: preservedFlexibleEvents.length,
        unscheduled: unscheduledIds?.length || 0
      });

      // 7. Merge (All Fixed + Recurrent Expanded + AI Schedule + Preserved Flexible)
      // existingFixedEvents contains all Google/Outlook/ManualFixed events (both inside and outside window)
      const mergedEvents = [...existingFixedEvents, ...recurrenceEvents, ...newWeeklySchedule, ...preservedFlexibleEvents];
      console.log('DEBUG: Merged Events', mergedEvents.length);
      setEvents(mergedEvents);

      // Warning Toast / State (Non-blocking)
      if (unscheduledIds && unscheduledIds.length > 0) {
        const count = unscheduledIds.length;
        setScheduleWarning(`Schedule optimized, but ${count} lower-priority tasks could not fit.`);
      }

    } catch (err: any) {
      console.error("Schedule Generation Failed:", err);
      // Clean up the error message for display
      const errorMessage = err.message || (typeof err === 'string' ? err : "Failed to generate schedule due to an unknown error.");
      setScheduleError(errorMessage);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const [dayStartHour, setDayStartHour] = useState(9);
  const [dayEndHour, setDayEndHour] = useState(18);
  const [isWorkWeekOnly, setIsWorkWeekOnly] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load Settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('eisenflow_settings');
    if (savedSettings) {
      const { startHour, endHour, isWorkWeekOnly: savedIsWorkWeek } = JSON.parse(savedSettings);
      setDayStartHour(startHour);
      setDayEndHour(endHour);
      if (savedIsWorkWeek !== undefined) setIsWorkWeekOnly(savedIsWorkWeek);
    }
  }, []);

  const handleSaveSettings = (settings: { startHour: number; endHour: number; isWorkWeekOnly: boolean }) => {
    setDayStartHour(settings.startHour);
    setDayEndHour(settings.endHour);
    setIsWorkWeekOnly(settings.isWorkWeekOnly);
    localStorage.setItem('eisenflow_settings', JSON.stringify(settings));
    // Trigger re-generation? Maybe not automatically, but the next generation will respect it.
  };

  // Theme Helpers
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

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
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 mb-2 ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Settings size={18} />
            Settings
          </button>
          {!isDark && (
            // Light Mode Profile Card
            <div
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-4 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
              <h4 className="font-bold text-xs uppercase tracking-wider opacity-70 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                {user ? 'Logged In' : 'Guest Mode'}
              </h4>
              {/* ... */}
            </div>
          )}
          {isDark && (
            <div
              onClick={() => user ? logout() : setIsAuthModalOpen(true)}
              className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-pink-500 p-[2px]">
                  <div className="w-full h-full bg-black rounded-full flex items-center justify-center relative overflow-hidden">
                    {user ? (
                      <span className="text-xs font-bold text-orange-400">{user.name.charAt(0).toUpperCase()}</span>
                    ) : (
                      <UserIcon size={16} className="text-orange-400" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{user ? user.name : "Guest User"}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 group-hover:text-orange-400 transition-colors">
                    {user ? 'Sign Out' : 'Create Account'}
                    {user && <LogOut size={10} />}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* View Content */}
        <div className={`flex-1 overflow-hidden ${isDark ? '' : 'p-4 md:p-6 bg-[#F8FAFC]'}`}>
          {activeTab === 'dashboard' ? (
            <DashboardView
              tasks={tasks}
              events={events}
              userName={user?.name || "Guest"}
              onNavigate={setActiveTab}
              onAddTask={handleSaveTask}
              onDeleteTask={handleDeleteTask}
              onAddEvent={handleAddEvent}
            />
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
                warning={scheduleWarning}
                startHour={dayStartHour}
                endHour={dayEndHour}
                onConnectGoogle={handleConnectGoogle}
                googleConnected={!!googleAccessToken}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        login={login}
        signup={signup}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={{ startHour: dayStartHour, endHour: dayEndHour, isWorkWeekOnly }}
      />

    </div>
  );
};



export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    // ... code for missing client ID ... (keep as is, or simplify if I can't see it)
    // Actually I'll just rewrite the return to include ErrorBoundary
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="p-8 bg-gray-800 rounded-xl border border-red-500/50 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-4">Configuration Error</h2>
          <p className="mb-4">Google Client ID is missing in environment variables.</p>
          <code className="block p-3 bg-black/50 rounded text-sm text-gray-300 font-mono text-left">
            VITE_GOOGLE_CLIENT_ID=...
          </code>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <NotificationProvider>
            <EisenFlowApp />
          </NotificationProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}