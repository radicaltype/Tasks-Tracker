import { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  Target,
  Zap,
  TrendingUp,
  RotateCw,
  Sparkles,
  Timer,
  Hourglass,
  CheckCircle,
  BarChart2,
  Flag,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Task } from '../types';
import { formatTime, cn, getPriorityConfig, TASK_CATEGORIES, getCategoryConfig } from '../lib/utils';
import { startOfDay, subDays, isSameDay, format } from 'date-fns';

interface DashboardProps {
  tasks: Task[];
  onBack: () => void;
}

const MOTIVATIONAL_TIPS = [
  {
    quote: "Execution is the only differentiator.",
    tip: "Focus on finishing one task at a time rather than multitasking.",
    tag: "Efficiency Tip #01"
  },
  {
    quote: "Small daily steps compound into massive achievements.",
    tip: "Break large goals into micro-tasks that take 15 minutes or less.",
    tag: "Efficiency Tip #02"
  },
  {
    quote: "Action eliminates anxiety. Start before you feel ready.",
    tip: "The 2-Minute Rule: If a task takes under 2 minutes, do it right now.",
    tag: "Efficiency Tip #03"
  },
  {
    quote: "Time management is attention management.",
    tip: "Use the built-in timer to stay locked in on a single objective.",
    tag: "Efficiency Tip #04"
  },
  {
    quote: "Done is always better than perfect.",
    tip: "Perfectionism delays progress. Complete the draft first, refine later.",
    tag: "Efficiency Tip #05"
  },
  {
    quote: "Energy, not time, is your fundamental currency.",
    tip: "Tackle your highest-priority task during your peak energy hours.",
    tag: "Efficiency Tip #06"
  },
  {
    quote: "What gets measured gets managed.",
    tip: "Track time for recurring tasks to build accurate productivity estimates.",
    tag: "Efficiency Tip #07"
  },
  {
    quote: "Simplicity is the key to velocity.",
    tip: "Ruthlessly clear away low-value clutter to create space for big wins.",
    tag: "Efficiency Tip #08"
  }
];

export default function Dashboard({ tasks, onBack }: DashboardProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [isTipRotating, setIsTipRotating] = useState(false);

  const handleNextTip = () => {
    setIsTipRotating(true);
    setTipIndex((prev) => (prev + 1) % MOTIVATIONAL_TIPS.length);
    setTimeout(() => setIsTipRotating(false), 400);
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const completedTasks = tasks.filter(t => t.completed);
    const completed = completedTasks.length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Time Stats
    const totalSeconds = tasks.reduce((acc, t) => acc + (t.timerTotalSeconds || 0), 0);
    const tasksWithTime = tasks.filter(t => (t.timerTotalSeconds || 0) > 0);
    const completedWithTime = completedTasks.filter(t => (t.timerTotalSeconds || 0) > 0);
    
    const completedSeconds = completedTasks.reduce((acc, t) => acc + (t.timerTotalSeconds || 0), 0);
    
    // Average time per completed task (with timer logged)
    const avgCompletedSeconds = completedWithTime.length > 0 
      ? Math.round(completedSeconds / completedWithTime.length) 
      : 0;

    // Average time overall per timed task
    const avgOverallSeconds = tasksWithTime.length > 0
      ? Math.round(totalSeconds / tasksWithTime.length)
      : 0;

    // Task with max logged time
    const maxTimeTask = tasksWithTime.length > 0
      ? [...tasksWithTime].sort((a, b) => b.timerTotalSeconds - a.timerTotalSeconds)[0]
      : null;

    // Max seconds for relative progress bar scaling
    const maxTaskSeconds = maxTimeTask ? maxTimeTask.timerTotalSeconds : 1;

    // Sort tasks by time spent descending
    const tasksByTime = [...tasks].sort((a, b) => (b.timerTotalSeconds || 0) - (a.timerTotalSeconds || 0));

    // Last 7 days activity
    const activityData = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(startOfDay(new Date()), 6 - i);
      const dayTasks = tasks.filter(t => 
        t.completed && t.createdAt && isSameDay(new Date(t.createdAt), date)
      ).length;
      return {
        name: format(date, 'EEE'),
        count: dayTasks
      };
    });

    const pieData = [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Pending', value: pending, color: '#f4f4f5' }
    ];

    const highPriorityTasks = tasks.filter(t => t.priority === 'High');
    const medPriorityTasks = tasks.filter(t => t.priority === 'Medium' || !t.priority);
    const lowPriorityTasks = tasks.filter(t => t.priority === 'Low');

    const priorityBreakdown = {
      high: {
        total: highPriorityTasks.length,
        active: highPriorityTasks.filter(t => !t.completed).length,
      },
      medium: {
        total: medPriorityTasks.length,
        active: medPriorityTasks.filter(t => !t.completed).length,
      },
      low: {
        total: lowPriorityTasks.length,
        active: lowPriorityTasks.filter(t => !t.completed).length,
      },
    };

    const categoryBreakdown = TASK_CATEGORIES.map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      const completedCount = catTasks.filter(t => t.completed).length;
      const activeCount = catTasks.length - completedCount;
      const config = getCategoryConfig(cat);
      return {
        category: cat,
        total: catTasks.length,
        completed: completedCount,
        active: activeCount,
        config,
      };
    });

    return {
      total,
      completed,
      pending,
      completionRate,
      totalSeconds,
      completedSeconds,
      avgCompletedSeconds,
      avgOverallSeconds,
      maxTimeTask,
      maxTaskSeconds,
      tasksByTime,
      tasksWithTimeCount: tasksWithTime.length,
      activityData,
      pieData,
      priorityBreakdown,
      categoryBreakdown
    };
  }, [tasks]);

  const currentTip = MOTIVATIONAL_TIPS[tipIndex];

  return (
    <div className="flex flex-col h-full bg-neutral-50 overflow-y-auto">
      {/* Sticky Header */}
      <div className="flex items-center px-4 py-6 bg-white border-b border-neutral-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="ml-2 text-2xl font-bold text-neutral-900 tracking-tight">Productivity</h1>
      </div>

      <div className="p-6 space-y-6">
        {/* Hero Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-900 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between aspect-square">
            <div className="bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center">
              <Trophy size={20} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-4xl font-black tracking-tighter mb-1">{stats.completionRate}%</div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Total Progress</div>
            </div>
          </div>

          <div className="bg-white border border-neutral-100 p-5 rounded-3xl shadow-xs flex flex-col justify-between aspect-square">
            <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tighter mb-1 truncate">{formatTime(stats.totalSeconds)}</div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">Total Time Logged</div>
            </div>
          </div>
        </div>

        {/* PRIORITY BREAKDOWN CARD */}
        <div className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Task Priorities</h3>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Distribution & Active Counts</p>
            </div>
            <Flag className="text-neutral-400" size={18} />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* High */}
            <div className="p-3.5 bg-rose-50/70 border border-rose-100 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">High</span>
              </div>
              <div>
                <span className="text-xl font-black text-rose-950 block">{stats.priorityBreakdown.high.total}</span>
                <span className="text-[10px] text-rose-600 font-medium">{stats.priorityBreakdown.high.active} pending</span>
              </div>
            </div>

            {/* Medium */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Medium</span>
              </div>
              <div>
                <span className="text-xl font-black text-amber-950 block">{stats.priorityBreakdown.medium.total}</span>
                <span className="text-[10px] text-amber-700 font-medium">{stats.priorityBreakdown.medium.active} pending</span>
              </div>
            </div>

            {/* Low */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Low</span>
              </div>
              <div>
                <span className="text-xl font-black text-slate-900 block">{stats.priorityBreakdown.low.total}</span>
                <span className="text-[10px] text-slate-500 font-medium">{stats.priorityBreakdown.low.active} pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY BREAKDOWN CARD */}
        <div className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Task Categories</h3>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Distribution Across Life Domains</p>
            </div>
            <Tag className="text-neutral-400" size={18} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {stats.categoryBreakdown.map((item) => (
              <div 
                key={item.category}
                className={cn(
                  "p-3.5 rounded-2xl border flex flex-col justify-between transition-all",
                  item.config?.badgeClass
                )}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", item.config?.dotClass)} />
                  <span className="text-[10px] font-bold uppercase tracking-wider truncate">{item.category}</span>
                </div>
                <div>
                  <span className="text-xl font-black text-neutral-900 block">{item.total}</span>
                  <span className="text-[10px] text-neutral-500 font-medium">{item.active} active</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TIME COMPLETION STATISTICS SECTION */}
        <div className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Task Completion Time Stats</h3>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Average & Duration Breakdown</p>
            </div>
            <Timer className="text-emerald-500" size={20} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 block mb-1">
                Avg Completed Task Time
              </span>
              <span className="text-lg font-black text-neutral-900">
                {stats.avgCompletedSeconds > 0 ? formatTime(stats.avgCompletedSeconds) : '00:00'}
              </span>
            </div>

            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400 block mb-1">
                Most Time Spent
              </span>
              <span className="text-lg font-black text-neutral-900 truncate block">
                {stats.maxTimeTask ? formatTime(stats.maxTimeTask.timerTotalSeconds) : '00:00'}
              </span>
              {stats.maxTimeTask && (
                <span className="text-[10px] text-neutral-500 truncate block mt-0.5">
                  {stats.maxTimeTask.title}
                </span>
              )}
            </div>
          </div>

          {/* Detailed Per-Task Time List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              Time Logged Per Task
            </h4>

            {stats.tasksByTime.length === 0 ? (
              <p className="text-xs text-neutral-400 italic py-2">No tasks available to show statistics.</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {stats.tasksByTime.map((task) => {
                  const seconds = task.timerTotalSeconds || 0;
                  const pct = stats.maxTaskSeconds > 0 ? Math.min(100, Math.max(8, (seconds / stats.maxTaskSeconds) * 100)) : 0;

                  return (
                    <div key={task.id} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100/80 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {task.completed ? (
                            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Hourglass size={14} className="text-amber-500 shrink-0" />
                          )}
                          <span className={cn(
                            "text-xs font-semibold text-neutral-800 truncate",
                            task.completed && "line-through text-neutral-400"
                          )}>
                            {task.title}
                          </span>
                        </div>

                        <span className="text-xs font-mono font-bold text-neutral-700 shrink-0 bg-white px-2 py-0.5 rounded-lg border border-neutral-200/60 shadow-2xs">
                          {seconds > 0 ? formatTime(seconds) : '00:00'}
                        </span>
                      </div>

                      {/* Visual Time Bar */}
                      <div className="w-full bg-neutral-200/60 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            task.completed ? "bg-emerald-500" : "bg-neutral-800"
                          )}
                          style={{ width: `${seconds > 0 ? pct : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Status Breakdown Section */}
        <div className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Task Breakdown</h3>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Completed vs Pending</p>
            </div>
            <Target className="text-neutral-300" size={20} />
          </div>

          <div className="flex items-center gap-8">
            <div className="w-24 h-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-neutral-600">Done</span>
                </div>
                <span className="text-xs font-black">{stats.completed}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-neutral-200" />
                  <span className="text-xs font-semibold text-neutral-600">Pending</span>
                </div>
                <span className="text-xs font-black">{stats.pending}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="bg-white border border-neutral-100 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Weekly Activity</h3>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Tasks Done This Week</p>
            </div>
            <TrendingUp className="text-emerald-500" size={20} />
          </div>

          <div className="h-40 w-full -ml-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.activityData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#A3A3A3' }}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }} 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                          {payload[0].value} Done
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 4, 4]} 
                >
                  {stats.activityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count > 0 ? '#10b981' : '#f4f4f5'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* INTERACTIVE MOTIVATIONAL QUOTE / TIP CARD */}
        <motion.div 
          onClick={handleNextTip}
          whileTap={{ scale: 0.98 }}
          className="bg-emerald-900 p-6 rounded-3xl text-white overflow-hidden relative cursor-pointer select-none group shadow-lg hover:bg-emerald-950 transition-colors"
          title="Tap to see a new productivity tip"
        >
          <Zap className="absolute -right-4 -bottom-4 text-emerald-800 opacity-40 group-hover:scale-110 transition-transform" size={120} />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-800/80 text-emerald-300 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-700/50">
                <Sparkles size={12} className="text-emerald-400" />
                <span>{currentTip.tag}</span>
              </span>

              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 group-hover:text-white transition-colors">
                <RotateCw size={13} className={cn("transition-transform", isTipRotating && "animate-spin")} />
                <span>Tap for new tip</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tipIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="space-y-1.5"
              >
                <h4 className="text-lg font-bold italic tracking-tight leading-snug">
                  "{currentTip.quote}"
                </h4>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  {currentTip.tip}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between pt-1 text-[10px] text-emerald-400/80 font-medium border-t border-emerald-800/60">
              <span>Tip {tipIndex + 1} of {MOTIVATIONAL_TIPS.length}</span>
              <span>Tap card to cycle ↺</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

