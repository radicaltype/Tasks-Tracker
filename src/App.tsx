import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './lib/firebase';
import type { Task, View, TaskCategory } from './types';
import TaskCard from './components/TaskCard';
import AddTaskForm from './components/AddTaskForm';
import TaskDetails from './components/TaskDetails';
import Dashboard from './components/Dashboard';
import ReminderAlertModal from './components/ReminderAlertModal';
import { useReminderWatcher } from './hooks/useReminderWatcher';
import { Plus, LogOut, CheckCircle2, ListTodo, LogIn, LayoutDashboard, ArrowUpDown, Bell, Navigation, Tag, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, TASK_CATEGORIES, getCategoryConfig } from './lib/utils';

export type SortOption = 'created_desc' | 'priority_desc' | 'category_asc' | 'due_asc' | 'due_desc' | 'location';

export type FilterType = 'total' | 'pending' | 'completed' | 'alerts' | 'gps';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created_desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Tasks Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid)
    );

    return onSnapshot(q, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        taskList.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(taskList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });
  }, [user]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Auth error:", error);
    }
  };

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) {
      console.warn("User not authenticated");
      return;
    }
    try {
      const payload: Record<string, any> = {
        title: taskData.title?.trim() || 'Untitled Task',
        description: taskData.description ? taskData.description.trim() : '',
        dueDate: taskData.dueDate || '',
        location: taskData.location ? taskData.location.trim() : '',
        priority: taskData.priority || 'Medium',
        category: taskData.category || 'Work',
        completed: false,
        timerTotalSeconds: 0,
        subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks : [],
        userId: user.uid,
        createdAt: new Date().toISOString(),
      };

      if (taskData.reminder) {
        payload.reminder = taskData.reminder;
      }

      await addDoc(collection(db, 'tasks'), payload);
      setCurrentView('list');
    } catch (error) {
      console.error("Task creation failed:", error);
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const cleanUpdates: Record<string, any> = {};
      
      if (updates.title !== undefined) cleanUpdates.title = updates.title;
      if (updates.description !== undefined) cleanUpdates.description = updates.description;
      if (updates.dueDate !== undefined) cleanUpdates.dueDate = updates.dueDate;
      if (updates.location !== undefined) cleanUpdates.location = updates.location;
      if (updates.priority !== undefined) cleanUpdates.priority = updates.priority;
      if (updates.category !== undefined) cleanUpdates.category = updates.category;
      if (updates.completed !== undefined) cleanUpdates.completed = updates.completed;
      if (updates.timerTotalSeconds !== undefined) cleanUpdates.timerTotalSeconds = updates.timerTotalSeconds;
      if (updates.subtasks !== undefined) cleanUpdates.subtasks = updates.subtasks;
      if (updates.reminder !== undefined) cleanUpdates.reminder = updates.reminder;

      await updateDoc(taskRef, cleanUpdates);
      // Update local selected task if we're in details view
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error("Task update failed:", error);
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setCurrentView('list');
      setSelectedTask(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  const handleToggleTask = (taskId: string, completed: boolean) => {
    handleUpdateTask(taskId, { completed });
  };

  // Background Reminder and Geofence Tracker
  const {
    activeAlert,
    userCoords,
    gpsActive,
    handleDismissAlert,
    handleSnoozeAlert,
  } = useReminderWatcher({
    tasks,
    onUpdateTask: handleUpdateTask,
  });

  const pendingCount = useMemo(() => {
    return tasks.filter(t => !t.completed).length;
  }, [tasks]);

  const completedCount = useMemo(() => {
    return tasks.filter(t => t.completed).length;
  }, [tasks]);

  const activeRemindersCount = useMemo(() => {
    return tasks.filter(t => !t.completed && (t.reminder?.timeReminder?.enabled || t.reminder?.locationReminder?.enabled)).length;
  }, [tasks]);

  const categoryCounts = useMemo(() => {
    let baseList = tasks;
    if (filterType === 'pending') {
      baseList = tasks.filter(t => !t.completed);
    } else if (filterType === 'completed') {
      baseList = tasks.filter(t => t.completed);
    } else if (filterType === 'alerts') {
      baseList = tasks.filter(t => !t.completed && (t.reminder?.timeReminder?.enabled || t.reminder?.locationReminder?.enabled));
    } else if (filterType === 'gps') {
      baseList = tasks.filter(t => !t.completed && t.reminder?.locationReminder?.enabled);
    }
    const counts: Record<string, number> = {
      all: baseList.length,
    };
    TASK_CATEGORIES.forEach(cat => {
      counts[cat] = baseList.filter(t => t.category === cat).length;
    });
    return counts;
  }, [tasks, filterType]);

  const filteredTasks = useMemo(() => {
    const list = tasks.filter(t => {
      if (filterType === 'pending') {
        if (t.completed) return false;
      } else if (filterType === 'completed') {
        if (!t.completed) return false;
      } else if (filterType === 'alerts') {
        if (t.completed) return false;
        if (!(t.reminder?.timeReminder?.enabled || t.reminder?.locationReminder?.enabled)) return false;
      } else if (filterType === 'gps') {
        if (t.completed) return false;
        if (!t.reminder?.locationReminder?.enabled) return false;
      }
      // 'total' shows all tasks without filtering by completed status

      if (selectedCategory !== 'all') {
        if (t.category !== selectedCategory) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = t.title?.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });

    const priorityRank: Record<string, number> = {
      High: 3,
      Medium: 2,
      Low: 1,
    };

    return [...list].sort((a, b) => {
      if (sortBy === 'priority_desc') {
        const rankA = a.priority ? priorityRank[a.priority] || 2 : 2;
        const rankB = b.priority ? priorityRank[b.priority] || 2 : 2;
        if (rankB !== rankA) return rankB - rankA;
        // Secondary sort: newest
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'category_asc') {
        const catA = (a.category || 'zzz').toLowerCase();
        const catB = (b.category || 'zzz').toLowerCase();
        if (catA !== catB) return catA.localeCompare(catB);
        // Secondary sort: newest
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
      if (sortBy === 'due_asc') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'due_desc') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      if (sortBy === 'location') {
        const locA = (a.location || '').trim().toLowerCase();
        const locB = (b.location || '').trim().toLowerCase();
        if (!locA && !locB) return 0;
        if (!locA) return 1;
        if (!locB) return -1;
        return locA.localeCompare(locB);
      }
      // 'created_desc' (default)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [tasks, filterType, selectedCategory, sortBy, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-neutral-100 border-t-neutral-900 rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-400">Loading TaskFlow...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-neutral-900 rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-3">
          <CheckCircle2 className="text-white" size={40} />
        </div>
        <h1 className="text-4xl font-black text-neutral-900 tracking-tighter mb-4">Task Tracker</h1>
        <p className="text-neutral-500 max-w-[280px] mb-12 leading-relaxed">
          Manage your daily grind with a clean, focused task manager designed for execution.
        </p>
        <button
          onClick={handleSignIn}
          className="group flex items-center gap-3 bg-white border border-neutral-200 px-8 py-4 rounded-2xl font-bold text-neutral-900 hover:border-neutral-900 transition-all shadow-sm active:scale-95"
        >
          <LogIn size={20} />
          <span>Continue with Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto relative overflow-hidden flex flex-col shadow-2xl">
      <AnimatePresence mode="wait">
        {currentView === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -50, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex-1 flex flex-col h-full bg-neutral-50"
          >
            {/* Header */}
            <div className="p-6 bg-white border-b border-neutral-100 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h1 className="text-3xl font-black text-neutral-900 tracking-tighter">Tasks Tracker</h1>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <button 
                    onClick={() => { setFilterType('pending'); setSelectedCategory('all'); setSearchQuery(''); }}
                    className={cn(
                      "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md transition-all",
                      filterType === 'pending' 
                        ? "bg-emerald-600 text-white shadow-2xs" 
                        : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    )}
                    title="Show only pending tasks"
                  >
                    {pendingCount} Pending
                  </button>
                  <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                  <button 
                    onClick={() => { setFilterType('total'); setSelectedCategory('all'); setSearchQuery(''); }}
                    className={cn(
                      "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md transition-all",
                      filterType === 'total' 
                        ? "bg-neutral-900 text-white shadow-2xs" 
                        : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                    )}
                    title="Show all total tasks"
                  >
                    Total {tasks.length}
                  </button>
                  {activeRemindersCount > 0 && (
                    <>
                      <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                      <button 
                        onClick={() => { setFilterType('alerts'); setSelectedCategory('all'); setSearchQuery(''); }}
                        className={cn(
                          "text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-md transition-all",
                          filterType === 'alerts' 
                            ? "bg-blue-600 text-white shadow-2xs" 
                            : "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        )}
                        title="Show only tasks with alerts"
                      >
                        <Bell size={10} />
                        <span>{activeRemindersCount} Alerts</span>
                      </button>
                    </>
                  )}
                  {gpsActive && (
                    <>
                      <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                      <button 
                        onClick={() => { setFilterType('gps'); setSelectedCategory('all'); setSearchQuery(''); }}
                        className={cn(
                          "text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-md transition-all",
                          filterType === 'gps' 
                            ? "bg-orange-500 text-white shadow-2xs" 
                            : "text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                        )}
                        title="Show only tasks with GPS active"
                      >
                        <Navigation size={10} />
                        <span>GPS</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentView('dashboard')}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400"
                  title="Dashboard"
                >
                  <LayoutDashboard size={20} />
                </button>
                <button 
                  onClick={() => signOut(auth)}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
              {/* Search Bar */}
              <div className="relative mb-5 group">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-neutral-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search tasks by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-neutral-200/80 rounded-2xl py-3.5 pl-10 pr-10 text-sm font-medium focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100/50 shadow-2xs transition-all placeholder:text-neutral-400 placeholder:font-normal text-neutral-900"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-100 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex bg-neutral-200/50 p-1 rounded-xl">
                  <button
                    onClick={() => setFilterType('pending')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      filterType === 'pending' ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-700"
                    )}
                  >
                    Active ({pendingCount})
                  </button>
                  <button
                    onClick={() => setFilterType('total')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      filterType === 'total' ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-700"
                    )}
                  >
                    All ({tasks.length})
                  </button>
                  <button
                    onClick={() => setFilterType('completed')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      filterType === 'completed' ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-700"
                    )}
                  >
                    Done ({completedCount})
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center bg-white border border-neutral-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs hover:border-neutral-300 transition-colors">
                  <ArrowUpDown size={14} className="text-neutral-400 mr-1.5 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent text-xs font-semibold text-neutral-700 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="created_desc">Newest First</option>
                    <option value="priority_desc">Highest Priority</option>
                    <option value="category_asc">By Category</option>
                    <option value="due_asc">Earliest Due Date</option>
                    <option value="due_desc">Latest Due Date</option>
                    <option value="location">By Location</option>
                  </select>
                </div>
              </div>

              {/* Category Filter Pills (Filter / Hide other categories) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-3 pt-1 -mx-6 px-6 no-scrollbar mb-3">
                {/* All Pill */}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border",
                    selectedCategory === 'all'
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                      : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                  )}
                >
                  <span>All</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                    selectedCategory === 'all' ? "bg-neutral-700 text-neutral-200" : "bg-neutral-100 text-neutral-500"
                  )}>
                    {categoryCounts.all || 0}
                  </span>
                </button>

                {/* Category specific pills */}
                {TASK_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const cfg = getCategoryConfig(cat);
                  const count = categoryCounts[cat] || 0;

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border",
                        isSelected
                          ? `${cfg?.activeClass} shadow-2xs scale-[1.02]`
                          : count > 0
                            ? `${cfg?.badgeClass} ${cfg?.pillHover}`
                            : "bg-white text-neutral-500 border-neutral-200/80 hover:border-neutral-300"
                      )}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        isSelected ? "bg-white" : cfg?.dotClass
                      )} />
                      <span>{cat}</span>
                      {count > 0 && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                          isSelected ? "bg-black/20 text-white" : "bg-white/80 text-neutral-700 border border-neutral-200/50"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {filteredTasks.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-neutral-100">
                    <ListTodo className="text-neutral-200" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    {selectedCategory !== 'all'
                      ? `No ${selectedCategory} tasks found`
                      : filterType === 'completed'
                        ? 'No completed tasks found'
                        : filterType === 'alerts'
                          ? 'No tasks with active alerts found'
                          : filterType === 'gps'
                            ? 'No tasks with GPS reminders found'
                            : filterType === 'pending'
                              ? 'No active tasks found'
                              : 'No tasks found'}
                  </h3>
                  <p className="text-sm text-neutral-400 max-w-xs mb-4">
                    {selectedCategory !== 'all'
                      ? `You don't have any tasks in "${selectedCategory}" matching the current filter.`
                      : filterType === 'completed'
                        ? 'Completed tasks will show up here once checked off.'
                        : filterType === 'alerts'
                          ? 'None of your active tasks currently have reminders or location alerts configured.'
                          : filterType === 'gps'
                            ? 'None of your active tasks have GPS geofence alerts enabled.'
                            : filterType === 'pending'
                              ? "You're all caught up! Take a break or add something new."
                              : 'Get started by creating your first task.'}
                  </p>
                  {(selectedCategory !== 'all' || filterType !== 'total' || searchQuery) && (
                    <button
                      onClick={() => {
                        setFilterType('total');
                        setSelectedCategory('all');
                        setSearchQuery('');
                      }}
                      className="text-xs font-bold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-xl transition-colors"
                    >
                      Show all tasks
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task: Task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onToggle={handleToggleTask}
                      onUpdateTask={handleUpdateTask}
                      onClick={(t) => {
                        setSelectedTask(t);
                        setCurrentView('details');
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* FAB */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentView('add')}
              className="absolute bottom-6 right-6 w-16 h-16 bg-neutral-900 text-white rounded-3xl flex items-center justify-center shadow-2xl hover:bg-neutral-800 transition-colors z-20"
            >
              <Plus size={32} />
            </motion.button>
          </motion.div>
        )}

        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 z-30"
          >
            <Dashboard 
              tasks={tasks} 
              onBack={() => setCurrentView('list')} 
            />
          </motion.div>
        )}

        {currentView === 'add' && (
          <motion.div
            key="add"
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 z-30"
          >
            <AddTaskForm 
              onAdd={handleAddTask} 
              onCancel={() => setCurrentView('list')} 
              userCoords={userCoords}
            />
          </motion.div>
        )}

        {currentView === 'details' && selectedTask && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 100, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 z-30 shadow-2xl"
          >
            <TaskDetails 
              task={selectedTask}
              onBack={() => {
                setCurrentView('list');
                setSelectedTask(null);
              }}
              onUpdate={handleUpdateTask}
              onDelete={handleDeleteTask}
              userCoords={userCoords}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global In-App / Triggered Reminder Alert Modal */}
      <ReminderAlertModal
        alert={activeAlert}
        onDismiss={handleDismissAlert}
        onSnooze={handleSnoozeAlert}
        onCompleteTask={(taskId) => handleToggleTask(taskId, true)}
        onOpenTask={(task) => {
          setSelectedTask(task);
          setCurrentView('details');
        }}
      />
    </div>
  );
}

