import { useState, useEffect, useMemo, type FormEvent } from 'react';
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
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  signInWithGoogle, 
  signInWithEmail,
  signUpWithEmail,
  signInAsGuest,
  signOutUser, 
  isNativePlatform, 
  isWebViewEnvironment,
  type AuthDiagnosticInfo 
} from './lib/authService';
import AndroidAuthModal from './components/AndroidAuthModal';
import FirebaseAuthDiagnosticsModal from './components/FirebaseAuthDiagnosticsModal';
import { db, auth, OperationType, handleFirestoreError } from './lib/firebase';
import type { Task, View, TaskCategory } from './types';
import TaskCard from './components/TaskCard';
import AddTaskForm from './components/AddTaskForm';
import TaskDetails from './components/TaskDetails';
import Dashboard from './components/Dashboard';
import ReminderAlertModal from './components/ReminderAlertModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useReminderWatcher } from './hooks/useReminderWatcher';
import { Plus, LogOut, CheckCircle2, ListTodo, LogIn, LayoutDashboard, ArrowUpDown, Bell, Navigation, Tag, Hash, X, Search, Repeat, Smartphone, Mail, Lock, UserPlus, Sparkles, UserCheck, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, TASK_CATEGORIES, getCategoryConfig, normalizeTag } from './lib/utils';
import { calculateNextDueDate } from './lib/recurrenceUtils';

export type SortOption = 'created_desc' | 'priority_desc' | 'category_asc' | 'due_asc' | 'due_desc' | 'location';

export type FilterType = 'total' | 'pending' | 'completed' | 'alerts' | 'gps' | 'recurring';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<View>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('created_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authDiagnostic, setAuthDiagnostic] = useState<AuthDiagnosticInfo | null>(null);
  const [showAndroidAuthModal, setShowAndroidAuthModal] = useState(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [authTab, setAuthTab] = useState<'google' | 'email'>('google');
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');
  const [emailVal, setEmailVal] = useState('');
  const [passwordVal, setPasswordVal] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  // Auth Listener with fail-safe timeout
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: Ensure app never hangs indefinitely on the loading screen
    const timeout = setTimeout(() => {
      if (isMounted) {
        console.warn("Auth initialization timed out; revealing UI");
        setLoading(false);
      }
    }, 2000);

    const unsubscribe = onAuthStateChanged(
      auth, 
      (u) => {
        if (!isMounted) return;
        clearTimeout(timeout);
        setUser(u);
        setLoading(false);
      },
      (err) => {
        if (!isMounted) return;
        clearTimeout(timeout);
        console.error("Auth listener error:", err);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      unsubscribe();
    };
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
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const outcome = await signInWithGoogle();
      if (!outcome.success) {
        setAuthError(outcome.error || "Authentication failed");
        setAuthDiagnostic(outcome.diagnostic || null);
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setAuthError(error?.message || "Authentication error occurred");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailVal.trim() || !passwordVal.trim()) {
      setAuthError("Please provide both email and password.");
      return;
    }
    setIsEmailLoading(true);
    setAuthError(null);
    try {
      const outcome = emailMode === 'signup'
        ? await signUpWithEmail(emailVal, passwordVal)
        : await signInWithEmail(emailVal, passwordVal);
      if (!outcome.success) {
        setAuthError(outcome.error || "Authentication failed");
      }
    } catch (err: any) {
      setAuthError(err?.message || "Authentication error occurred");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsGuestLoading(true);
    setAuthError(null);
    try {
      const outcome = await signInAsGuest();
      if (!outcome.success) {
        setAuthError(outcome.error || "Failed to continue as guest");
      }
    } catch (err: any) {
      setAuthError(err?.message || "Guest sign-in error");
    } finally {
      setIsGuestLoading(false);
    }
  };

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) {
      console.warn("User not authenticated");
      return;
    }
    try {
      const sanitizedTags = (Array.isArray(taskData.tags) ? taskData.tags : [])
        .map(normalizeTag)
        .filter(Boolean)
        .slice(0, 20);

      const payload: Record<string, any> = {
        title: taskData.title?.trim() || 'Untitled Task',
        description: taskData.description ? taskData.description.trim() : '',
        dueDate: taskData.dueDate || '',
        location: taskData.location ? taskData.location.trim() : '',
        priority: taskData.priority || 'Medium',
        category: taskData.category || 'Work',
        tags: sanitizedTags,
        completed: false,
        timerTotalSeconds: 0,
        subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks : [],
        userId: user.uid,
        createdAt: new Date().toISOString(),
      };

      if (taskData.reminder) {
        payload.reminder = taskData.reminder;
      }

      if (taskData.recurrence) {
        payload.recurrence = taskData.recurrence;
      }

      if (taskData.notes !== undefined) {
        payload.notes = taskData.notes;
        payload.notesUpdatedAt = new Date().toISOString();
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
      if (updates.tags !== undefined) {
        cleanUpdates.tags = (Array.isArray(updates.tags) ? updates.tags : [])
          .map(normalizeTag)
          .filter(Boolean)
          .slice(0, 20);
      }
      if (updates.completed !== undefined) {
        cleanUpdates.completed = updates.completed;
        if (updates.completed) {
          cleanUpdates.completedAt = new Date().toISOString();
        }
      }
      if (updates.timerTotalSeconds !== undefined) cleanUpdates.timerTotalSeconds = updates.timerTotalSeconds;
      if (updates.subtasks !== undefined) cleanUpdates.subtasks = updates.subtasks;
      if (updates.reminder !== undefined) cleanUpdates.reminder = updates.reminder;
      if (updates.recurrence !== undefined) cleanUpdates.recurrence = updates.recurrence;
      if (updates.notes !== undefined) {
        cleanUpdates.notes = updates.notes;
        cleanUpdates.notesUpdatedAt = updates.notesUpdatedAt || new Date().toISOString();
      }

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

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    const targetTask = tasks.find(t => t.id === taskId);
    
    // First, update this task
    await handleUpdateTask(taskId, { completed });

    // If task is being marked as completed AND has a recurrence rule, schedule next occurrence
    if (completed && targetTask && targetTask.recurrence && user) {
      try {
        const nextDueDate = calculateNextDueDate(targetTask.dueDate, targetTask.recurrence);
        
        // If nextDueDate is not null (i.e. not past optional end date), spawn next recurring occurrence
        if (nextDueDate) {
          // Reset subtasks for next occurrence if any
          const freshSubtasks = (targetTask.subtasks || []).map(st => ({
            ...st,
            id: crypto.randomUUID(),
            completed: false,
          }));

          const nextTimesRepeated = (targetTask.recurrence.timesRepeated || 0) + 1;
          const nextRecurrenceRule = {
            ...targetTask.recurrence,
            timesRepeated: nextTimesRepeated,
          };

          // Adjust reminder if time-based
          let nextReminder = targetTask.reminder;
          if (targetTask.reminder?.timeReminder?.enabled) {
            nextReminder = {
              ...targetTask.reminder,
              timeReminder: {
                ...targetTask.reminder.timeReminder,
                remindAt: nextDueDate,
                lastTriggered: undefined,
                snoozedUntil: undefined,
              }
            };
          }

          const nextTaskPayload: Record<string, any> = {
            title: targetTask.title,
            description: targetTask.description || '',
            dueDate: nextDueDate,
            location: targetTask.location || '',
            priority: targetTask.priority || 'Medium',
            category: targetTask.category || 'Work',
            tags: Array.isArray(targetTask.tags) ? targetTask.tags : [],
            completed: false,
            timerTotalSeconds: 0,
            subtasks: freshSubtasks,
            userId: user.uid,
            createdAt: new Date().toISOString(),
            recurrence: nextRecurrenceRule,
            recurrenceParentId: targetTask.recurrenceParentId || targetTask.id,
          };

          if (nextReminder) {
            nextTaskPayload.reminder = nextReminder;
          }

          await addDoc(collection(db, 'tasks'), nextTaskPayload);
        }
      } catch (recurrenceErr) {
        console.error("Error creating next recurring task instance:", recurrenceErr);
      }
    }
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

  const recurringCount = useMemo(() => {
    return tasks.filter(t => !!t.recurrence).length;
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
    } else if (filterType === 'recurring') {
      baseList = tasks.filter(t => !!t.recurrence);
    }
    const counts: Record<string, number> = {
      all: baseList.length,
    };
    TASK_CATEGORIES.forEach(cat => {
      counts[cat] = baseList.filter(t => t.category === cat).length;
    });
    return counts;
  }, [tasks, filterType]);

  // All unique custom tags across all user tasks
  const allCustomTags = useMemo(() => {
    const tagMap = new Map<string, string>();
    tasks.forEach(t => {
      (t.tags || []).forEach(rawTag => {
        const cleaned = normalizeTag(rawTag);
        if (cleaned && !tagMap.has(cleaned.toLowerCase())) {
          tagMap.set(cleaned.toLowerCase(), cleaned);
        }
      });
    });
    return Array.from(tagMap.values()).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  // Counts for each custom tag in the current filterType + selectedCategory context
  const tagCounts = useMemo(() => {
    let baseList = tasks;
    if (filterType === 'pending') {
      baseList = baseList.filter(t => !t.completed);
    } else if (filterType === 'completed') {
      baseList = baseList.filter(t => t.completed);
    } else if (filterType === 'alerts') {
      baseList = baseList.filter(t => !t.completed && (t.reminder?.timeReminder?.enabled || t.reminder?.locationReminder?.enabled));
    } else if (filterType === 'gps') {
      baseList = baseList.filter(t => !t.completed && t.reminder?.locationReminder?.enabled);
    } else if (filterType === 'recurring') {
      baseList = baseList.filter(t => !!t.recurrence);
    }
    if (selectedCategory !== 'all') {
      baseList = baseList.filter(t => t.category === selectedCategory);
    }

    const counts: Record<string, number> = {
      all: baseList.length,
    };
    allCustomTags.forEach(tag => {
      counts[tag] = baseList.filter(t =>
        (t.tags || []).some(taskTag => taskTag.toLowerCase() === tag.toLowerCase())
      ).length;
    });
    return counts;
  }, [tasks, filterType, selectedCategory, allCustomTags]);

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
      } else if (filterType === 'recurring') {
        if (!t.recurrence) return false;
      }
      // 'total' shows all tasks without filtering by completed status

      if (selectedCategory !== 'all') {
        if (t.category !== selectedCategory) return false;
      }
      if (selectedTag !== 'all') {
        const hasTag = (t.tags || []).some(
          tag => tag.toLowerCase() === selectedTag.toLowerCase()
        );
        if (!hasTag) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().replace(/^#+/, '');
        const matchTitle = t.title?.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        const matchTags = (t.tags || []).some(tag => tag.toLowerCase().includes(query));
        if (!matchTitle && !matchDesc && !matchTags) return false;
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
  }, [tasks, filterType, selectedCategory, selectedTag, sortBy, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-xs">
          <div className="w-12 h-12 border-4 border-neutral-100 border-t-neutral-900 rounded-full animate-spin" />
          <div>
            <p className="text-sm font-bold text-neutral-900">Loading Tasks Tracker...</p>
            <p className="text-xs text-neutral-400 mt-1">Connecting to Firebase service</p>
          </div>
          <button
            type="button"
            onClick={() => setLoading(false)}
            className="mt-2 text-xs text-neutral-500 hover:text-neutral-900 font-semibold underline underline-offset-2 transition-colors"
          >
            Skip waiting &amp; open app &rarr;
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        {/* Brand Header */}
        <div className="w-14 h-14 bg-neutral-900 rounded-3xl flex items-center justify-center mb-3 shadow-lg rotate-2 text-white">
          <CheckCircle2 size={30} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mb-1">Task Tracker</h1>
        <p className="text-neutral-500 text-xs sm:text-sm max-w-[290px] mb-5 leading-normal">
          Fast, focused task execution with real-time sync &amp; offline support.
        </p>

        {/* Auth Card */}
        <div className="max-w-sm w-full bg-white rounded-3xl border border-neutral-200/80 shadow-xl p-5 text-left space-y-4">
          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-2xl text-xs font-bold">
            <button
              onClick={() => { setAuthTab('google'); setAuthError(null); }}
              className={cn(
                "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5",
                authTab === 'google' 
                  ? "bg-white text-neutral-900 shadow-xs" 
                  : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              <LogIn size={14} />
              <span>Google</span>
            </button>
            <button
              onClick={() => { setAuthTab('email'); setAuthError(null); }}
              className={cn(
                "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5",
                authTab === 'email' 
                  ? "bg-white text-neutral-900 shadow-xs" 
                  : "text-neutral-500 hover:text-neutral-900"
              )}
            >
              <Mail size={14} />
              <span>Email &amp; Pass</span>
            </button>
          </div>

          {/* Compact Dismissible Error Notification */}
          {authError && (
            <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-left animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                  <span>Notice</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded-md"
                  aria-label="Dismiss error"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] text-amber-900 mt-1 leading-snug">
                {authError.includes('Android WebViews') || authError.includes('popup')
                  ? "Google popup sign-in is blocked in Android WebViews. Sign in with Email or continue as Guest below."
                  : authError}
              </p>
              <div className="mt-2.5 flex items-center gap-2 pt-1.5 border-t border-amber-200/60">
                <button
                  type="button"
                  onClick={() => { setAuthTab('email'); setAuthError(null); }}
                  className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 flex items-center gap-1"
                >
                  <Mail size={12} />
                  <span>Use Email</span>
                </button>
                <span className="text-amber-300">·</span>
                <button
                  type="button"
                  onClick={() => { setAuthError(null); handleGuestSignIn(); }}
                  className="text-[11px] font-bold text-neutral-800 hover:text-black underline underline-offset-2 flex items-center gap-1"
                >
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Instant Guest</span>
                </button>
                <span className="text-amber-300">·</span>
                <button
                  type="button"
                  onClick={() => setShowDiagnosticsModal(true)}
                  className="text-[11px] font-bold text-amber-900 hover:text-amber-950 underline underline-offset-2 flex items-center gap-1"
                >
                  <ShieldCheck size={12} />
                  <span>Diagnose</span>
                </button>
              </div>
            </div>
          )}

          {/* Google Sign In Tab */}
          {authTab === 'google' && (
            <div className="space-y-3 pt-1">
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-3 bg-neutral-900 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-neutral-800 transition-all shadow-md active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSigningIn ? (
                  <div className="w-4 h-4 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{isSigningIn ? "Signing in..." : "Continue with Google"}</span>
              </button>

              <p className="text-[11px] text-neutral-400 text-center leading-tight">
                Works seamlessly in standard browsers and Google Play Services.
              </p>
            </div>
          )}

          {/* Email & Password Tab */}
          {authTab === 'email' && (
            <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={emailVal}
                    onChange={(e) => setEmailVal(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={passwordVal}
                    onChange={(e) => setPasswordVal(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isEmailLoading}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white py-2.5 rounded-2xl font-bold text-xs hover:bg-neutral-800 transition-all shadow-md active:scale-98 disabled:opacity-60"
              >
                {isEmailLoading ? (
                  <div className="w-4 h-4 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
                ) : emailMode === 'signup' ? (
                  <UserPlus size={15} />
                ) : (
                  <LogIn size={15} />
                )}
                <span>{isEmailLoading ? "Processing..." : emailMode === 'signup' ? "Create Account" : "Sign In with Email"}</span>
              </button>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode(emailMode === 'login' ? 'signup' : 'login');
                    setAuthError(null);
                  }}
                  className="text-xs text-neutral-600 hover:text-neutral-900 underline underline-offset-2 font-medium"
                >
                  {emailMode === 'login' 
                    ? "Need an account? Create one" 
                    : "Already have an account? Sign In"}
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="relative py-0.5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold text-neutral-400">
              <span className="bg-white px-2">or quick start</span>
            </div>
          </div>

          {/* Guest Mode */}
          <button
            onClick={handleGuestSignIn}
            disabled={isGuestLoading}
            className="w-full flex items-center justify-center gap-2 border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-98 disabled:opacity-60 shadow-2xs"
          >
            {isGuestLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
            ) : (
              <Sparkles size={14} className="text-amber-500" />
            )}
            <span>Continue as Guest (Instant Access)</span>
          </button>
        </div>

        {/* Minimal Subtle Footer Links */}
        <div className="mt-5 flex items-center justify-center gap-3 text-xs text-neutral-400">
          <button
            onClick={() => setShowDiagnosticsModal(true)}
            className="hover:text-neutral-700 transition-colors flex items-center gap-1.5 font-medium"
          >
            <ShieldCheck size={13} />
            <span>Diagnostics</span>
          </button>
          <span>·</span>
          <button
            onClick={() => setShowAndroidAuthModal(true)}
            className="hover:text-neutral-700 transition-colors flex items-center gap-1.5 font-medium"
          >
            <Smartphone size={13} />
            <span>Android APK Guide</span>
          </button>
        </div>

        <AndroidAuthModal
          isOpen={showAndroidAuthModal}
          onClose={() => setShowAndroidAuthModal(false)}
          error={authError}
          diagnostic={authDiagnostic}
          onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
        />

        <FirebaseAuthDiagnosticsModal
          isOpen={showDiagnosticsModal}
          onClose={() => setShowDiagnosticsModal(false)}
          initialError={authError}
          onSelectEmailMode={() => { setAuthTab('email'); setAuthError(null); }}
          onSelectGuestMode={() => { handleGuestSignIn(); }}
        />
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
                  {recurringCount > 0 && (
                    <>
                      <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                      <button 
                        onClick={() => { setFilterType('recurring'); setSelectedCategory('all'); setSearchQuery(''); }}
                        className={cn(
                          "text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 px-2 py-0.5 rounded-md transition-all",
                          filterType === 'recurring' 
                            ? "bg-purple-700 text-white shadow-2xs" 
                            : "text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                        )}
                        title="Show recurring tasks"
                      >
                        <Repeat size={10} />
                        <span>{recurringCount} Repeat</span>
                      </button>
                    </>
                  )}
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
                <PWAInstallButton />
                {user.isAnonymous && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full" title="Signed in as Guest">
                    Guest
                  </span>
                )}
                {user.email && (
                  <span className="hidden sm:inline-block text-[11px] font-medium text-neutral-400 max-w-[120px] truncate" title={user.email}>
                    {user.email}
                  </span>
                )}
                <button 
                  onClick={() => setShowDiagnosticsModal(true)}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-amber-700 transition-colors"
                  title="Firebase Auth & APK Diagnostics (Check SHA-1 & Config)"
                >
                  <ShieldCheck size={20} />
                </button>
                <button 
                  onClick={() => setCurrentView('dashboard')}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400"
                  title="Dashboard"
                >
                  <LayoutDashboard size={20} />
                </button>
                <button 
                  onClick={() => signOutUser()}
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
                  placeholder="Search tasks by title, description, or #tag..."
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
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 -mx-6 px-6 no-scrollbar mb-2">
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

              {/* Custom Tags Filter Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-0.5 -mx-6 px-6 no-scrollbar mb-3">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-neutral-400 mr-1 shrink-0">
                  <Hash size={11} />
                  <span>Tags:</span>
                </div>

                {allCustomTags.length > 0 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedTag('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 border",
                        selectedTag === 'all'
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                          : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                      )}
                    >
                      <span>All Tags</span>
                    </button>

                    {allCustomTags.map((tag) => {
                      const isTagSelected = selectedTag.toLowerCase() === tag.toLowerCase();
                      const count = tagCounts[tag] || 0;

                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSelectedTag(isTagSelected ? 'all' : tag)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1 border",
                            isTagSelected
                              ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                              : count > 0
                                ? "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                                : "bg-neutral-50 text-neutral-400 border-neutral-200/60 hover:border-neutral-300"
                          )}
                        >
                          <span className="opacity-60">#</span>
                          <span>{tag}</span>
                          {count > 0 && (
                            <span
                              className={cn(
                                "text-[10px] px-1 rounded-xs font-bold",
                                isTagSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"
                              )}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentView('add')}
                    className="text-[11px] font-medium text-neutral-400 hover:text-neutral-700 transition-colors shrink-0"
                  >
                    No custom tags yet — add #tags when creating or editing tasks
                  </button>
                )}
              </div>

              {filteredTasks.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-neutral-100">
                    <ListTodo className="text-neutral-200" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-2">
                    {selectedTag !== 'all'
                      ? `No tasks tagged #${selectedTag}`
                      : selectedCategory !== 'all'
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
                    {selectedTag !== 'all'
                      ? `You don't have any tasks with the "#${selectedTag}" tag matching the current filter.`
                      : selectedCategory !== 'all'
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
                  {(selectedCategory !== 'all' || selectedTag !== 'all' || filterType !== 'total' || searchQuery) && (
                    <button
                      onClick={() => {
                        setFilterType('total');
                        setSelectedCategory('all');
                        setSelectedTag('all');
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
                      onDelete={handleDeleteTask}
                      selectedTag={selectedTag === 'all' ? undefined : selectedTag}
                      onSelectTag={(tag) => {
                        setSelectedTag(prev => prev.toLowerCase() === tag.toLowerCase() ? 'all' : tag);
                      }}
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
              onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
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
              existingTags={allCustomTags}
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
              existingTags={allCustomTags}
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

      <FirebaseAuthDiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
        initialError={authError}
      />

      <OfflineIndicator />
    </div>
  );
}

