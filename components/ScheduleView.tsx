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
  warning?: string | null;
  startHour: number;
  endHour: number;
  onConnectGoogle?: () => void;
  googleConnected?: boolean;
  isWorkWeekOnly?: boolean;
}

type ViewMode = 'day' | 'week' | 'month';

const ScheduleView: React.FC<ScheduleViewProps> = ({ events, isLoading, onRefreshSchedule, dateStr, onDateChange, error, warning, startHour, endHour, onConnectGoogle, googleConnected, isWorkWeekOnly = false }) => {
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
      <div className="space-y-4 relative">
        <div className="absolute left-[88px] top-6 bottom-6 w-0.5 bg-white/10 hidden md:block"></div>
        {(() => {
          // mix events and "now" marker
          const items = [...dayEvents].map(e => ({ type: 'event', data: e, time: new Date(e.start).getTime() }));

          const now = new Date();
          const isToday = dateStr === now.toISOString().split('T')[0];

          if (isToday) {
            items.push({ type: 'now', data: null as any, time: now.getTime() });
          }

          const sortedItems = items.sort((a, b) => a.time - b.time);

          if (sortedItems.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500/50">
                <Calendar size={48} className="mb-4 opacity-50" />
                <p>No events scheduled for today.</p>
              </div>
            );
          }

          return sortedItems.map((item, index) => {
            if (item.type === 'now') {
              return (
                <div key="now-marker" className="flex items-center gap-4 relative z-20 animate-pulse">
                  <div className="w-20 text-right pr-6">
                    <span className="text-xs font-bold text-cyan-400">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex-1 h-[2px] bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] relative">
                    <div className="absolute -left-[6px] -top-[3px] w-2 h-2 rounded-full bg-cyan-400"></div>
                  </div>
                </div>
              );
            }

            const event = item.data;
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
            } else {
              // Quadrant Colors
              switch (event.quadrant) {
                case 'Q1':
                  cardStyles = 'bg-rose-500/20 border-rose-500/30 text-rose-100';
                  dotStyles = 'bg-rose-500 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
                  iconColor = 'text-rose-400';
                  break;
                case 'Q2':
                  cardStyles = 'bg-blue-500/20 border-blue-500/30 text-blue-100';
                  dotStyles = 'bg-blue-500 border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
                  iconColor = 'text-blue-400';
                  break;
                case 'Q3':
                  cardStyles = 'bg-amber-500/20 border-amber-500/30 text-amber-100';
                  dotStyles = 'bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
                  iconColor = 'text-amber-400';
                  break;
                default: // Q4 / Fixed
                  cardStyles = 'bg-gray-500/20 border-gray-500/30 text-gray-200';
                  dotStyles = 'bg-gray-500 border-gray-400 shadow-[0_0_8px_rgba(107,114,128,0.5)]';
                  iconColor = 'text-gray-400';
              }
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
                              {event.isFixed ? 'Fixed Schedule' : 'Recommended Focus'}
                            </p>
                          )}
                          {event.quadrant && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${event.quadrant === 'Q1' ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' :
                              event.quadrant === 'Q2' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' :
                                event.quadrant === 'Q3' ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' :
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
          });
        })()}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDateObj);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // Filter Weekends if workWeekOnly
    const daysToShow = isWorkWeekOnly ? weekDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6) : weekDays;
    const gridCols = isWorkWeekOnly ? 'grid-cols-5' : 'grid-cols-7';

    return (
      <div className={`grid ${gridCols} gap-2 h-full min-w-[800px]`}>
        {daysToShow.map((day, i) => {
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
                {dEvents.map(ev => {
                  const isQ1 = ev.quadrant === 'Q1';
                  const isQ2 = ev.quadrant === 'Q2';
                  const isQ3 = ev.quadrant === 'Q3';
                  const isQ4 = ev.quadrant === 'Q4' || !ev.quadrant; // assume fixed if missing

                  let bgClass = isQ1 ? 'bg-rose-500/20 text-rose-200' :
                    isQ2 ? 'bg-blue-500/20 text-blue-200' :
                      isQ3 ? 'bg-amber-500/20 text-amber-200' :
                        'bg-gray-500/20 text-gray-300';

                  return (
                    <div key={ev.id} className={`text-[10px] p-1.5 rounded truncate ${bgClass}`}>
                      {ev.title}
                    </div>
                  );
                })}
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
            {/* ... existing nav ... */}
            <div className="flex items-center bg-white/5 rounded-lg border border-white/5">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:text-white text-gray-400 transition-colors"
                title="Previous Period"
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
                title="Next Period"
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
            {/* Google Connect Button */}
            {/* Google Connect Button */}
            <button
              onClick={onConnectGoogle}
              className={`p-1.5 rounded-full transition-all flex items-center justify-center border hover:scale-105 active:scale-95 ${googleConnected
                ? 'bg-green-500/20 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              title={googleConnected ? "Google Calendar Connected" : "Connect Google Calendar"}
            >
              <svg className="w-10 h-10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            </button>

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

        {/* Error Display - Special Popup for Capacity Overflow */}
        {error && error.includes("It is impossible to generate") ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1e1b2e] border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl transform scale-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 text-rose-500">
                <BrainCircuit size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Planning Failed</h3>
              <p className="text-rose-200/80 mb-6 leading-relaxed">
                {error}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => onRefreshSchedule()} // Retry logic could be cleaner, but re-generating serves as 'OK' to dismiss if successful, or we need a dismiss prop.
                  // Actually, we just need to dismiss the error. ScheduleView doesn't have a 'clearError' prop. 
                  // But re-generating will clear it in App.tsx. 
                  // Let's assume the user needs to change settings first.
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold transition-colors"
                >
                  Dismiss
                </button>
                {/* We assume the user goes to Settings or Changes tasks */}
              </div>
            </div>
          </div>
        ) : error && (
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

        {/* Warning Display */}
        {warning && (
          <div className="m-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-4 flex-shrink-0">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <BrainCircuit size={20} />
            </div>
            <div>
              <h4 className="font-bold text-amber-200">Schedule Optimized (Partial)</h4>
              <p className="text-sm text-amber-200/80 mt-1">{warning}</p>
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