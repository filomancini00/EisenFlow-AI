import React from 'react';
import { Task, CalendarEvent } from '../types';
import { TrendingUp, CheckCircle, Clock, AlertCircle, ArrowRight, CreditCard, MoreVertical, Wallet, ArrowUpRight, ArrowDownRight, Bell, Search, Plus } from 'lucide-react';
import GlassCard from './GlassCard';

interface DashboardViewProps {
  tasks: Task[];
  events: CalendarEvent[];
  userName?: string;
  onNavigate: (tab: 'dashboard' | 'matrix' | 'schedule' | 'list') => void;
}

const StatPill: React.FC<{ icon: React.ReactNode; label: string; value: string; trend?: string; trendUp?: boolean; onClick?: () => void; highlight?: boolean }> = ({ icon, label, value, trend, trendUp, onClick, highlight }) => (
  <div onClick={onClick} className={onClick ? "cursor-pointer transition-transform hover:scale-[1.02]" : ""}>
    <GlassCard className={`flex items-center gap-4 flex-1 min-w-[200px] ${highlight ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : ''}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${highlight ? 'bg-orange-500/20' : 'bg-white/10'}`}>
        {icon}
      </div>
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
        <h3 className="text-2xl font-bold">{value}</h3>
        {trend && (
          <div className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </div>
        )}
      </div>
    </GlassCard>
  </div>
);

const DashboardView: React.FC<DashboardViewProps> = ({ tasks, events, userName = "Filomancio", onNavigate }) => {
  const [trendPeriod, setTrendPeriod] = React.useState<'week' | 'month'>('week');
  const [showAnalyticsModal, setShowAnalyticsModal] = React.useState(false);
  const [analyticsView, setAnalyticsView] = React.useState<'trend' | 'workload'>('trend');

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;

  // Calculate estimated hours remaining
  const hoursRemaining = tasks
    .filter(t => t.status !== 'completed')
    .reduce((acc, t) => acc + t.estimatedHours, 0);

  // Get upcoming tasks
  const upcomingTasks = tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  // --- Real Analytic Logic ---

  // 1. Productivity Trend (Completed Tasks over time)
  const getTrendData = () => {
    const now = new Date();
    const dataPoints = [];
    const days = trendPeriod === 'week' ? 7 : 30;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Count tasks completed on this day
      // Note: We rely on t.completedAt being set. If legacy tasks don't have it, they won't show.
      const count = tasks.filter(t => {
        if (t.status !== 'completed' || !t.completedAt) return false;
        return t.completedAt.startsWith(dateStr);
      }).length;

      dataPoints.push({ date: dateStr, count });
    }
    return dataPoints;
  };

  const trendData = getTrendData();
  const maxTrend = Math.max(...trendData.map(d => d.count), 1);

  // 2. Weekly Daily Workload (Stacked Bar)
  const getWeeklyWorkload = () => {
    const dailyStats = [];
    const now = new Date(); // Start from today

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });

      // Find events for this day
      // Note: events are ISO strings.
      const dayEvents = events.filter(e => e.start.startsWith(dateStr) && e.type === 'task_block');

      const stats = {
        day: dayLabel,
        Q1: 0, Q2: 0, Q3: 0, Q4: 0,
        total: 0
      };

      dayEvents.forEach(e => {
        const durationHours = (new Date(e.end).getTime() - new Date(e.start).getTime()) / (1000 * 60 * 60);
        if (e.quadrant === 'Q1') stats.Q1 += durationHours;
        else if (e.quadrant === 'Q2') stats.Q2 += durationHours;
        else if (e.quadrant === 'Q3') stats.Q3 += durationHours;
        else if (e.quadrant === 'Q4') stats.Q4 += durationHours;
        // Fallback if quadrant missing but mapped to task? (Assuming events have quadrant populated by service)
      });

      stats.total = stats.Q1 + stats.Q2 + stats.Q3 + stats.Q4;
      dailyStats.push(stats);
    }
    return dailyStats;
  };

  const weeklyWorkload = getWeeklyWorkload();
  const maxDailyHours = Math.max(...weeklyWorkload.map(d => d.total), 1); // For scaling

  // 2b. Quadrant Pending Hours (Needed for AI Strategy Card)
  const quadrantStats = {
    Q1: tasks.filter(t => t.relevance >= 3 && t.urgency >= 3 && t.status !== 'completed').reduce((acc, t) => acc + t.estimatedHours, 0),
    Q2: tasks.filter(t => t.relevance >= 3 && t.urgency < 3 && t.status !== 'completed').reduce((acc, t) => acc + t.estimatedHours, 0),
    Q3: tasks.filter(t => t.relevance < 3 && t.urgency >= 3 && t.status !== 'completed').reduce((acc, t) => acc + t.estimatedHours, 0),
    Q4: tasks.filter(t => t.relevance < 3 && t.urgency < 3 && t.status !== 'completed').reduce((acc, t) => acc + t.estimatedHours, 0),
  };

  // 3. Goals (Completion Rates)
  const calculateGoal = (filterFn: (t: Task) => boolean) => {
    const relevantTasks = tasks.filter(filterFn);
    if (relevantTasks.length === 0) return 0;
    const completed = relevantTasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / relevantTasks.length) * 100);
  };

  const goals = [
    { label: 'Clear Critical (Q1)', value: calculateGoal(t => t.relevance >= 3 && t.urgency >= 3), color: 'bg-rose-500', shadow: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]' },
    { label: 'Strategic (Q2)', value: calculateGoal(t => t.relevance >= 3 && t.urgency < 3), color: 'bg-blue-500', shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.5)]' },
    { label: 'Overall Progress', value: Math.round((completedTasks / (totalTasks || 1)) * 100), color: 'bg-emerald-500', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]' },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 md:p-8 font-sans text-white relative">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            My Dashboard <CreditCard className="text-orange-400" size={28} />
          </h2>
          {/* Search/Actions Bar */}
          <div className="flex items-center gap-4 bg-black/20 p-2 pr-6 rounded-full border border-white/5 backdrop-blur-md">
            <div className="bg-white/5 rounded-full p-2">
              <Search className="text-gray-400" size={20} />
            </div>
            <input
              type="text"
              placeholder="Search for tasks..."
              className="bg-transparent border-none outline-none text-white text-sm w-48 placeholder-gray-500"
            />
            <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
            <button className="text-gray-400 hover:text-white transition-colors"><Bell size={20} /></button>
            <button className="text-gray-400 hover:text-white transition-colors"><Plus size={20} /></button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex flex-col md:flex-row gap-4">
          <StatPill
            icon={<Clock size={24} />}
            label="Total Focus Hours"
            value={`${hoursRemaining}h`}
            trend="Remaining Work"
            trendUp={false}
            onClick={() => onNavigate('schedule')}
          />
          <StatPill
            icon={<CheckCircle size={24} />}
            label="Tasks Completed"
            value={`${completedTasks}`}
            trend={`${Math.round((completedTasks / (totalTasks || 1)) * 100)}% Rate`}
            trendUp={true}
            onClick={() => onNavigate('list')}
          />
          <StatPill
            icon={<AlertCircle size={24} />}
            label="Pending Tasks"
            value={`${pendingTasks}`}
            trend="Active"
            trendUp={false}
            onClick={() => onNavigate('matrix')}
          />
          <StatPill
            icon={<TrendingUp size={24} />}
            label="Analytics View"
            value="Open"
            trend="Visualize Data"
            trendUp={true}
            onClick={() => setShowAnalyticsModal(true)}
            highlight={true}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column (Chart) */}
          <div className="lg:col-span-2 space-y-8">
            <GlassCard className="h-[400px] relative overflow-hidden flex flex-col justify-between group">
              {/* Background Gradient/Glow */}
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-orange-500/10 to-transparent pointer-events-none"></div>

              <div className="flex justify-between items-start relative z-10">
                <div>
                  <h3 className="text-xl font-bold text-orange-100">Productivity Trend</h3>
                  <p className="text-orange-200/60 text-sm mt-1">Tasks completed over time</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTrendPeriod('week')}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-colors border border-white/5 ${trendPeriod === 'week' ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setTrendPeriod('month')}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-colors border border-white/5 ${trendPeriod === 'month' ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    Month
                  </button>
                </div>
              </div>

              {/* Area Chart Implementation */}
              <div className="flex-1 flex items-end justify-center relative mt-8 px-4 pb-8">
                {/* Chart Container */}
                <div className="w-full h-48 relative">
                  {/* Y-Axis Grid & Labels - Improved Contrast */}
                  {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                    <div key={tick} className="absolute w-full flex items-center" style={{ bottom: `${tick * 100}%` }}>
                      <div className="w-full h-[1px] bg-white/10"></div>
                      <span className="absolute -left-6 text-[10px] text-gray-400">{Math.round(tick * maxTrend)}</span>
                    </div>
                  ))}

                  <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox={`0 0 100 100`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#F97316" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* The Area Fill */}
                    <polygon
                      points={`0,100 ${trendData.map((d, i) => {
                        const x = (i / (trendData.length - 1)) * 100;
                        const y = 100 - (d.count / maxTrend) * 100;
                        return `${x},${y}`;
                      }).join(" ")} 100,100`}
                      fill="url(#areaGradient)"
                    />

                    {/* The Line Stroke */}
                    <polyline
                      points={trendData.map((d, i) => {
                        const x = (i / (trendData.length - 1)) * 100;
                        const y = 100 - (d.count / maxTrend) * 100;
                        return `${x},${y}`;
                      }).join(" ")}
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      className="drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]"
                    />

                    {/* Data Points on Hover (or fixed for density) */}
                    {trendData.map((d, i) => {
                      const x = (i / (trendData.length - 1)) * 100;
                      const y = 100 - (d.count / maxTrend) * 100;
                      return (
                        <circle key={i} cx={`${x}%`} cy={`${y}%`} r="3" fill="white" className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                          <title>{d.date}: {d.count} tasks</title>
                        </circle>
                      );
                    })}
                  </svg>

                  {/* X-Axis Labels */}
                  <div className="absolute -bottom-6 w-full flex justify-between text-[10px] text-gray-400 font-medium tracking-wide">
                    {trendData.filter((_, i) => i % Math.ceil(trendData.length / 6) === 0).map((d, i) => (
                      <span key={i}>{d.date.slice(5).replace('-', '/')}</span>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Real Progress Goals</h4>
                  <span className="text-xs text-gray-400 cursor-pointer hover:text-white">Auto-Tracked</span>
                </div>
                <div className="space-y-4">
                  {goals.map((goal, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">{goal.label}</span>
                        <span className="font-bold">{goal.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${goal.color} rounded-full ${goal.shadow}`} style={{ width: `${goal.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold">Weekly Workload (Stacked)</h4>
                </div>
                {/* Stacked Bar Chart */}
                <div className="flex items-end justify-between h-32 gap-3 mt-4 px-2">
                  {weeklyWorkload.map((day, i) => {
                    // Calculate height percentages for each segment
                    const hQ1 = (day.Q1 / maxDailyHours) * 100;
                    const hQ2 = (day.Q2 / maxDailyHours) * 100;
                    const hQ3 = (day.Q3 / maxDailyHours) * 100;
                    const hQ4 = (day.Q4 / maxDailyHours) * 100;

                    return (
                      <div key={i} className="flex-1 flex flex-col-reverse justify-start bg-white/5 rounded-t-sm relative group h-full overflow-hidden">
                        {/* Stacked Segments: Q1 (Red) at Bottom, then Q2, Q3, Q4 */}
                        {/* Wait, flex-col-reverse puts first child at bottom. So Q1 first child. */}

                        {/* Q1: Do First (Red) */}
                        {day.Q1 > 0 && (
                          <div style={{ height: `${hQ1}%` }} className="w-full bg-rose-500 transition-all hover:bg-rose-400">
                            {/* Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-12 left-1/2 -translate-x-1/2 z-20 bg-black/90 text-white text-[10px] p-2 rounded w-max">
                              Q1: {day.Q1.toFixed(1)}h
                            </div>
                          </div>
                        )}
                        {/* Q2: Schedule (Blue) */}
                        {day.Q2 > 0 && <div style={{ height: `${hQ2}%` }} className="w-full bg-blue-500 transition-all hover:bg-blue-400"></div>}
                        {/* Q3: Delegate (Amber) */}
                        {day.Q3 > 0 && <div style={{ height: `${hQ3}%` }} className="w-full bg-amber-500 transition-all hover:bg-amber-400"></div>}
                        {/* Q4: Eliminate (Green) */}
                        {day.Q4 > 0 && <div style={{ height: `${hQ4}%` }} className="w-full bg-emerald-500 transition-all hover:bg-emerald-400"></div>}

                        {/* Label */}
                        <div className="absolute bottom-0 w-full text-center text-[9px] text-white/40 pb-1 pointer-events-none">{day.day}</div>

                        {/* Floating Total Hour Label on Top */}
                        <div className="absolute top-1 w-full text-center text-[9px] font-bold text-white/50">{day.total > 0 ? day.total.toFixed(0) + 'h' : ''}</div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Right Column (Profile & Actions - Kept same structure but dynamic user) */}
          <div className="space-y-6">
            <GlassCard className="text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/5 to-transparent"></div>
              <div className="absolute top-4 right-4 text-gray-400 cursor-pointer hover:text-white">
                <MoreVertical size={20} />
              </div>

              <div className="relative z-10 mt-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-orange-400 to-pink-500 rounded-full p-[2px]">
                  <div className="w-full h-full bg-gray-900 rounded-full flex items-center justify-center overflow-hidden">
                    <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-pink-500">
                      {userName.charAt(0)}
                    </span>
                  </div>
                </div>
                <h3 className="mt-4 text-xl font-bold">{userName}</h3>
                <p className="text-gray-400 text-sm">Productivity Master</p>

                <div className="flex justify-center gap-6 mt-8">
                  <div
                    onClick={() => setShowAnalyticsModal(true)}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors border border-white/5">
                      <TrendingUp size={20} className="text-orange-400" />
                    </div>
                    <span className="text-[10px] font-medium opacity-60">Analytics</span>
                  </div>
                  <div
                    onClick={() => onNavigate('list')}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors border border-white/5">
                      <CheckCircle size={20} className="text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-medium opacity-60">Tasks</span>
                  </div>
                  <div
                    onClick={() => onNavigate('schedule')}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors border border-white/5">
                      <Bell size={20} className="text-blue-400" />
                    </div>

                    <span className="text-[10px] font-medium opacity-60">Alerts</span>
                  </div>
                </div>

                {/* AI Strategy Insight Card */}
                <div className="mt-8 mx-2 bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-white/10 rounded-2xl p-5 text-left relative overflow-hidden group hover:scale-[1.02] transition-transform shadow-2xl">
                  {/* Dynamic Glow based on mode */}
                  <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl -mr-10 -mt-10 opacity-30
                    ${quadrantStats.Q1 > 5 ? 'bg-rose-500' : quadrantStats.Q2 > 5 ? 'bg-blue-500' : 'bg-emerald-500'}
                  `}></div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">✨</span>
                        <span className="text-xs font-mono text-white/50 tracking-widest uppercase">AI Insight</span>
                      </div>
                      {/* Mode Badge */}
                      <div className={`px-2 py-1 rounded text-[10px] font-bold border border-white/10
                         ${quadrantStats.Q1 > 5 ? 'bg-rose-500/20 text-rose-300' : quadrantStats.Q2 > 5 ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}
                       `}>
                        {quadrantStats.Q1 > 5 ? 'CRITICAL FOCUS' : quadrantStats.Q2 > 5 ? 'STRATEGIC GROWTH' : 'MAINTENANCE'}
                      </div>
                    </div>

                    <div className="mb-6 min-h-[40px]">
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {quadrantStats.Q1 > 5
                          ? `You have ${quadrantStats.Q1}h of urgent tasks. Focus on clearing these immediately to reduce stress.`
                          : quadrantStats.Q2 > 5
                            ? `Urgency is low. Use this time for ${quadrantStats.Q2}h of high-value strategic work.`
                            : "Workload is balanced. Great time to review your backlog or learn a new skill."
                        }
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wide">Suggested Next Action</p>
                      <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" onClick={() => onNavigate('list')}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                           ${upcomingTasks[0]?.urgency > 3 ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}
                        `}>
                          {upcomingTasks[0]?.title.charAt(0) || "-"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white line-clamp-1">{upcomingTasks[0]?.title || "No pending tasks"}</p>
                          <p className="text-[10px] text-gray-500">
                            {upcomingTasks[0] ? `Due ${new Date(upcomingTasks[0].deadline).toLocaleDateString()}` : "Relax!"}
                          </p>
                        </div>
                        <ArrowRight size={14} className="ml-auto text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard noPadding className="overflow-hidden">
              <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h4 className="font-bold text-sm">Upcoming Deadlines</h4>
                <ArrowRight size={16} className="text-gray-500" />
              </div>
              <div className="p-2">
                {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
                  <div key={task.id} className="p-3 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold
                        ${task.urgency > 3 ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}
                      `}>
                        {task.title.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-200 group-hover:text-white transition-colors">{task.title}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {new Date(task.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded bg-white/5 text-[10px] font-bold text-gray-400">
                      {task.estimatedHours}h
                    </div>
                  </div>
                )) : (
                  <div className="p-4 text-center text-gray-500 text-sm">No upcoming deadlines</div>
                )}
                <div className="p-2 mt-2 border-t border-white/5">
                  <button
                    onClick={() => onNavigate('list')}
                    className="w-full py-2 text-xs text-center text-gray-400 hover:text-white transition-colors"
                  >
                    See all tasks
                  </button>
                </div>
              </div>
            </GlassCard>

          </div>
        </div>
      </div>

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <GlassCard className="w-full max-w-5xl h-[80vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 p-2">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="text-orange-400" /> Analytics Deep Dive
              </h2>

              {/* Tab Switcher */}
              <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                <button
                  onClick={() => setAnalyticsView('trend')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${analyticsView === 'trend' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  Productivity Trend
                </button>
                <button
                  onClick={() => setAnalyticsView('workload')}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${analyticsView === 'workload' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  Your Workload
                </button>
              </div>

              <button onClick={() => setShowAnalyticsModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="flex-1 bg-black/20 rounded-xl border border-white/5 p-6 relative overflow-hidden flex flex-col">
              {analyticsView === 'trend' ? (
                <div className="w-full h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-300">Tasks Completed Over Time</h3>
                    <div className="flex gap-2">
                      <button onClick={() => setTrendPeriod('week')} className={`px-3 py-1 rounded text-xs border border-white/10 ${trendPeriod === 'week' ? 'bg-white/20' : 'bg-transparent'}`}>Week</button>
                      <button onClick={() => setTrendPeriod('month')} className={`px-3 py-1 rounded text-xs border border-white/10 ${trendPeriod === 'month' ? 'bg-white/20' : 'bg-transparent'}`}>Month</button>
                    </div>
                  </div>
                  {/* Reuse Scaled Area Chart */}
                  <div className="flex-1 relative w-full">
                    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="modalAreaGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#F97316" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon
                        points={`0,100 ${trendData.map((d, i) => `${(i / (trendData.length - 1)) * 100},${100 - (d.count / maxTrend) * 100}`).join(" ")} 100,100`}
                        fill="url(#modalAreaGradient)"
                      />
                      <polyline
                        points={trendData.map((d, i) => `${(i / (trendData.length - 1)) * 100},${100 - (d.count / maxTrend) * 100}`).join(" ")}
                        fill="none"
                        stroke="#F97316"
                        strokeWidth="1" // Thinner visual stroke when scaled up, or use vector-effect
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    {/* Modal X-Axis Labels */}
                    <div className="absolute bottom-0 w-full flex justify-between text-xs text-gray-500 pt-2 border-t border-white/10">
                      {trendData.map((d, i) => (
                        <div key={i} className="text-center w-8">
                          <div className="h-2 w-[1px] bg-white/20 mx-auto mb-1"></div>
                          {d.date.slice(5)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col">
                  <h3 className="text-lg font-bold text-gray-300 mb-8">projected Workload (Next 7 Days)</h3>
                  {/* Reuse Stacked Bar Chart Logic but Bigger */}
                  <div className="flex-1 flex items-end justify-between gap-6 px-8 pb-8">
                    {weeklyWorkload.map((day, i) => {
                      const hQ1 = (day.Q1 / maxDailyHours) * 100;
                      const hQ2 = (day.Q2 / maxDailyHours) * 100;
                      const hQ3 = (day.Q3 / maxDailyHours) * 100;
                      const hQ4 = (day.Q4 / maxDailyHours) * 100;

                      return (
                        <div key={i} className="flex-1 flex flex-col-reverse justify-start bg-white/5 rounded-lg relative group h-full overflow-hidden">
                          {/* Stacked Segments */}
                          {day.Q1 > 0 && <div style={{ height: `${hQ1}%` }} className="w-full bg-rose-500 hover:bg-rose-400 relative group/segment"><span className="opacity-0 group-hover/segment:opacity-100 absolute inset-0 flex items-center justify-center text-xs font-bold">{day.Q1.toFixed(1)}h</span></div>}
                          {day.Q2 > 0 && <div style={{ height: `${hQ2}%` }} className="w-full bg-blue-500 hover:bg-blue-400 relative group/segment"><span className="opacity-0 group-hover/segment:opacity-100 absolute inset-0 flex items-center justify-center text-xs font-bold">{day.Q2.toFixed(1)}h</span></div>}
                          {day.Q3 > 0 && <div style={{ height: `${hQ3}%` }} className="w-full bg-amber-500 hover:bg-amber-400 relative group/segment"><span className="opacity-0 group-hover/segment:opacity-100 absolute inset-0 flex items-center justify-center text-xs font-bold">{day.Q3.toFixed(1)}h</span></div>}
                          {day.Q4 > 0 && <div style={{ height: `${hQ4}%` }} className="w-full bg-emerald-500 hover:bg-emerald-400 relative group/segment"><span className="opacity-0 group-hover/segment:opacity-100 absolute inset-0 flex items-center justify-center text-xs font-bold">{day.Q4.toFixed(1)}h</span></div>}

                          <div className="absolute bottom-2 w-full text-center text-sm text-white/40 pb-1 pointer-events-none font-bold uppercase tracking-wider">{day.day}</div>
                          <div className="absolute top-2 w-full text-center text-lg font-bold text-white/50">{day.total.toFixed(1)}h</div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex justify-center gap-8 mt-4 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-500 rounded-full"></div><span className="text-gray-400 text-sm">Urgent (Q1)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-gray-400 text-sm">Strategic (Q2)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-500 rounded-full"></div><span className="text-gray-400 text-sm">Delegate (Q3)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-gray-400 text-sm">Eliminate (Q4)</span></div>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
