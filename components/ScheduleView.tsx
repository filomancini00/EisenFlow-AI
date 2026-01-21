import React from 'react';
import { CalendarEvent } from '../types';
import { Clock, Briefcase, Coffee, Video, Calendar } from 'lucide-react';

interface ScheduleViewProps {
  events: CalendarEvent[];
  isLoading: boolean;
  onRefreshSchedule: () => void;
  dateStr: string;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ events, isLoading, onRefreshSchedule, dateStr }) => {
  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEventColor = (type: CalendarEvent['type'], isFixed: boolean) => {
    if (type === 'break') return 'bg-gray-100 border-gray-200 text-gray-600';
    if (isFixed) return 'bg-indigo-50 border-indigo-200 text-indigo-800'; // Meetings
    return 'bg-white border-l-4 border-l-blue-500 border-y border-r border-gray-200 shadow-sm'; // Tasks
  };

  const getEventIcon = (type: CalendarEvent['type'], isFixed: boolean) => {
    if (type === 'break') return <Coffee size={16} />;
    if (type === 'meeting' || isFixed) return <Video size={16} />;
    return <Briefcase size={16} />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
        <div>
           <h2 className="text-xl font-bold text-gray-800">Your Smart Schedule</h2>
           <p className="text-sm text-gray-500">Optimized for {new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <button 
          onClick={onRefreshSchedule}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
            ${isLoading 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
            }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
              Optimizing...
            </>
          ) : (
            <>
              <Clock size={16} />
              Refresh Plan
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative">
        {/* Timeline Line */}
        <div className="absolute left-[88px] top-6 bottom-6 w-0.5 bg-gray-100"></div>

        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <Calendar size={48} className="mb-4 text-gray-200" />
             <p>No schedule generated yet.</p>
             <p className="text-sm">Click "Refresh Plan" to generate your daily plan using AI.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEvents.map((event) => {
              const start = new Date(event.start);
              const end = new Date(event.end);
              const durationMins = (end.getTime() - start.getTime()) / (1000 * 60);

              return (
                <div key={event.id} className="flex group relative">
                  {/* Time Column */}
                  <div className="w-20 pt-2 text-right pr-6 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-800">{formatTime(event.start)}</p>
                    <p className="text-xs text-gray-400">{formatTime(event.end)}</p>
                  </div>

                  {/* Dot on Timeline */}
                  <div className={`absolute left-[84px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ring-gray-200 z-10 
                    ${event.type === 'break' ? 'bg-gray-400' : event.isFixed ? 'bg-indigo-500' : 'bg-blue-500'}`}>
                  </div>

                  {/* Card */}
                  <div className={`flex-1 rounded-lg p-3 ${getEventColor(event.type, event.isFixed)} transition-transform hover:scale-[1.01]`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`${event.type === 'break' ? 'text-gray-500' : 'text-indigo-600/80'}`}>
                          {getEventIcon(event.type, event.isFixed)}
                        </span>
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                      </div>
                      <span className="text-xs font-mono opacity-60 bg-white/50 px-1.5 py-0.5 rounded">
                        {durationMins >= 60 
                          ? `${(durationMins / 60).toFixed(1).replace('.0', '')}h` 
                          : `${durationMins}m`}
                      </span>
                    </div>
                    {event.type !== 'break' && (
                      <p className="text-xs opacity-75 mt-1 ml-6">
                        {event.isFixed ? 'Outlook Meeting' : 'Recommended Focus Task'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleView;