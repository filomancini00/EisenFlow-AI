import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { Clock, Briefcase, Coffee, Video, Calendar, ArrowRight, ChevronLeft, ChevronRight, BrainCircuit, LayoutGrid, List, Columns } from 'lucide-react';
import GlassCard from './GlassCard';

interface ScheduleViewProps {
  events: CalendarEvent[];
  isLoading: boolean;
  onRefreshSchedule: () => void;
  dateStr: string;
  onDateChange: (date: string) => void;
  error: string | null;
}

type ViewMode = 'day' | 'week' | 'month';

const ScheduleView: React.FC<ScheduleViewProps> = ({ events, isLoading, onRefreshSchedule, dateStr, onDateChange, error }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('day');

  const currentDateObj = new Date(dateStr);

  // --- Date Helpers ---
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(dateStr);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    }
    onDateChange(d.toISOString().split('T')[0]);
  };

  const getDayEvents = (targetDateStr: string) => {
    return events.filter(e => e.start.startsWith(targetDateStr));
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- Renderers ---

  const renderDayView = () => {
    const dayEvents = getDayEvents(dateStr);
    const sortedEvents = [...dayEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return (
      <div className="space-y-4">
        <div className="absolute left-[88px] top-6 bottom-6 w-0.5 bg-white/10 hidden md:block"></div>
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500/50">
            <Calendar size={48} className="mb-4 opacity-50" />
            <p>No events scheduled for today.</p>
          </div>
        ) : (
          sortedEvents.map((event, index) => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            const durationMins = (end.getTime() - start.getTime()) / (1000 * 60);

            let cardStyles = 'bg-blue-500/20 border-blue-500/30 text-blue-100';
            let dotStyles = 'bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
            let iconColor = 'text-blue-400';

            if (event.type === 'break') {
              cardStyles = 'bg-white/5 border-white/5 text-gray-400';
              dotStyles = 'bg-gray-500 border-gray-400';
              iconColor = 'text-gray-500';
            } else if (event.isFixed) {
              cardStyles = 'bg-indigo-500/20 border-indigo-500/30 text-indigo-100';
              dotStyles = 'bg-indigo-500 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]';
              iconColor = 'text-indigo-400';
            }

            return (
              <div key={event.id} className="flex flex-col md:flex-row group relative animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                {/* Time Column */}
                <div className="w-20 pt-3 text-left md:text-right pr-6 flex-shrink-0 flex items-center gap-2 md:block">
                  <p className="text-sm font-bold text-white tracking-wide">{formatTime(event.start)}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{formatTime(event.end)}</p>
                </div>

                {/* Dot on Timeline */}
                <div className={`hidden md:block absolute left-[84px] top-4 w-2.5 h-2.5 rounded-full border-2 z-10 ${dotStyles}`}>
                </div>

                {/* Card */}
                <div className={`flex-1 rounded-2xl p-4 border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg mb-2 md:mb-0 ${cardStyles}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`p-2 rounded-lg bg-black/20 ${iconColor}`}>
                        {event.type === 'break' ? <Coffee size={16} /> : event.isFixed ? <Video size={16} /> : <Briefcase size={16} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm leading-tight">{event.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {event.type !== 'break' && (
                            <p className="text-[10px] opacity-60 uppercase tracking-wider font-bold">
                              {event.isFixed ? 'Outlook Meeting' : 'Recommended Focus'}
                            </p>
                          )}
                          {event.quadrant && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${event.quadrant === 'Q1' ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' :
                                event.quadrant === 'Q2' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' :
                                  'bg-gray-500/20 border-gray-500/30 text-gray-300'
                              }`}>
                              {event.quadrant}
                            </span>
                          )}
                        </div>
                        {event.reasoning && (
                          <p className="text-xs text-indigo-200/70 mt-1 italic flex items-center gap-1">
                            <BrainCircuit size={12} className="inline opacity-70" />
                            {event.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono opacity-80 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                      {Math.round(durationMins)}m
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDateObj);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-2 h-full min-w-[800px]">
        {weekDays.map((day, i) => {
          const dateS = day.toISOString().split('T')[0];
          const isToday = dateS === new Date().toISOString().split('T')[0];
          const isSelected = dateS === dateStr;
          const dEvents = getDayEvents(dateS);

          return (
            <div
              key={i}
              onClick={() => onDateChange(dateS)}
              className={`rounded-xl border flex flex-col h-full cursor-pointer transition-colors ${isSelected ? 'bg-white/10 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
            >
              <div className={`p-2 text-center border-b border-white/5 ${isToday ? 'bg-indigo-500/20 text-indigo-300' : ''}`}>
                <p className="text-xs opacity-60 uppercase">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                <p className={`font-bold ${isToday ? 'text-indigo-400' : ''}`}>{day.getDate()}</p>
              </div>
              <div className="flex-1 p-1 space-y-1 overflow-y-auto custom-scrollbar">
                {dEvents.map(ev => (
                  <div key={ev.id} className={`text-[10px] p-1.5 rounded truncate ${ev.isFixed ? 'bg-indigo-500/20 text-indigo-200' : 'bg-blue-500/20 text-blue-200'}`}>
                    {ev.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  };

  const renderMonthView = () => {
    const year = currentDateObj.getFullYear();
    const month = currentDateObj.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Fill days
    const days = [];
    // Prefix
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon start
    for (let i = 0; i < startPadding; i++) days.push(null);

    // Actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return (
      <div className="h-full flex flex-col">
        <div className="grid grid-cols-7 mb-2 text-center text-xs opacity-50">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
        <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
          {days.map((day, i) => {
            if (!day) return <div key={i}></div>;

            const dateS = day.toISOString().split('T')[0];
            const isToday = dateS === new Date().toISOString().split('T')[0];
            const isSelected = dateS === dateStr;
            const dEvents = getDayEvents(dateS);

            return (
              <div
                key={i}
                onClick={() => onDateChange(dateS)}
                className={`rounded-lg border p-1 flex flex-col relative cursor-pointer hover:bg-white/10 transition-colors ${isSelected ? 'bg-white/10 border-indigo-500/50' : 'bg-white/5 border-white/5'}`}
              >
                <span className={`text-xs font-bold self-end px-1 rounded ${isToday ? 'bg-indigo-500 text-white' : 'opacity-50'}`}>
                  {day.getDate()}
                </span>
                <div className="flex-1 flex flex-col justify-end gap-0.5">
                  {dEvents.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap content-end">
                      {dEvents.slice(0, 4).map((_, idx) => (
                        <div key={idx} className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                      ))}
                      {dEvents.length > 4 && <span className="text-[8px] text-gray-400">+</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full p-4 md:p-8 max-w-6xl mx-auto font-sans text-white flex flex-col">
      <GlassCard className="flex-1 flex flex-col overflow-hidden relative" noPadding>
        {/* Background Gradient */}
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="p-4 md:p-6 border-b border-white/10 flex flex-col xl:flex-row justify-between items-center gap-4 relative z-10 shrink-0">

          {/* Left: Navigation */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center bg-white/5 rounded-lg border border-white/5">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:text-white text-gray-400 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="px-4 py-2 font-mono text-sm border-x border-white/5 text-center min-w-[140px]">
                {viewMode === 'month'
                  ? currentDateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                  : currentDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                }
              </div>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:text-white text-gray-400 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* View Switcher */}
            <div className="flex p-1 bg-black/20 rounded-lg border border-white/5">
              {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${viewMode === mode ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            {viewMode === 'day' && (
              <button
                onClick={onRefreshSchedule}
                disabled={isLoading}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg
                    ${isLoading
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border border-white/10 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                  }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                    <span className="hidden md:inline">Optimizing...</span>
                  </>
                ) : (
                  <>
                    <BrainCircuit size={16} />
                    <span className="hidden md:inline">Generate Plan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="m-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-4 flex-shrink-0">
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
              <Video size={20} />
            </div>
            <div>
              <h4 className="font-bold text-rose-200">AI Schedule Generation Failed</h4>
              <p className="text-sm text-rose-300/80 mt-1">{error}</p>
              {error.includes("API Key") && (
                <p className="text-xs text-rose-300/60 mt-2 font-mono bg-black/20 p-2 rounded">
                  Please ensure valid VITE_GEMINI_API_KEY in .env
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6 relative custom-scrollbar z-10 w-full">
          {viewMode === 'day' && renderDayView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'month' && renderMonthView()}
        </div>

      </GlassCard>
    </div>
  );
};

export default ScheduleView;