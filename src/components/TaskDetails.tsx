import { useState, useEffect, FormEvent } from 'react';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Pencil, 
  X, 
  Save, 
  AlignLeft,
  AlertTriangle,
  ExternalLink,
  Download,
  ListCheck,
  Plus,
  Edit3,
  Bell,
  Volume2,
  Navigation,
  Flag,
  Tag,
  Hash,
  Repeat,
  FileText
} from 'lucide-react';
import type { Task, SubTask, TaskReminder, Priority, TaskCategory, RecurrenceRule } from '../types';
import { cn, formatTime, getGoogleMapsUrl, getGoogleCalendarUrl, downloadIcsFile, getPriorityConfig, getCategoryConfig, TASK_CATEGORIES, normalizeTag } from '../lib/utils';
import { getReminderSummary, playReminderChime, triggerBrowserNotification, formatDistance, calculateDistance } from '../lib/reminderUtils';
import { getRecurrenceDescription } from '../lib/recurrenceUtils';
import Timer from './Timer';
import SubtaskModal from './SubtaskModal';
import ReminderFormSection from './ReminderFormSection';
import { RecurrenceSelector } from './RecurrenceSelector';
import TaskRichNotes from './TaskRichNotes';
import TagManagerInput from './TagManagerInput';

interface TaskDetailsProps {
  task: Task;
  onBack: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  userCoords?: { lat: number; lng: number } | null;
  existingTags?: string[];
}

export default function TaskDetails({ task, onBack, onUpdate, onDelete, userCoords, existingTags = [] }: TaskDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quickTagInput, setQuickTagInput] = useState('');

  // Subtask Modal & state
  const [editingSubtask, setEditingSubtask] = useState<SubTask | null>(null);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);

  // Edit Form state
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<Priority>(task.priority || 'Medium');
  const [category, setCategory] = useState<TaskCategory | undefined>(task.category);
  const [editingTags, setEditingTags] = useState<string[]>(task.tags || []);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState(task.location || '');
  const [editingSubtasks, setEditingSubtasks] = useState<SubTask[]>(task.subtasks || []);
  const [editingReminder, setEditingReminder] = useState<TaskReminder | undefined>(task.reminder);
  const [editingRecurrence, setEditingRecurrence] = useState<RecurrenceRule | undefined>(task.recurrence);
  const [editingNotes, setEditingNotes] = useState<string>(task.notes || '');

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'Medium');
    setCategory(task.category);
    setEditingTags(task.tags || []);
    setLocation(task.location || '');
    setEditingSubtasks(task.subtasks || []);
    setEditingReminder(task.reminder);
    setEditingRecurrence(task.recurrence);
    setEditingNotes(task.notes || '');

    if (task.dueDate) {
      try {
        const d = new Date(task.dueDate);
        if (!isNaN(d.getTime())) {
          setDate(format(d, 'yyyy-MM-dd'));
          setTime(format(d, 'HH:mm'));
        } else {
          setDate('');
          setTime('');
        }
      } catch {
        setDate('');
        setTime('');
      }
    } else {
      setDate('');
      setTime('');
    }
  }, [task, isEditing]);

  const handleSaveTimer = (seconds: number) => {
    onUpdate(task.id, { timerTotalSeconds: task.timerTotalSeconds + seconds });
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let dueDate = '';
    if (date) {
      dueDate = time ? `${date}T${time}` : `${date}T00:00`;
    }

    onUpdate(task.id, {
      title: title.trim(),
      description: description.trim(),
      dueDate,
      location: location.trim(),
      priority,
      category,
      tags: editingTags,
      subtasks: editingSubtasks,
      reminder: editingReminder,
      recurrence: editingRecurrence,
      notes: editingNotes,
      notesUpdatedAt: editingNotes !== task.notes ? new Date().toISOString() : task.notesUpdatedAt,
    });

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleQuickSetPriority = (newPriority: Priority) => {
    onUpdate(task.id, { priority: newPriority });
  };

  const handleQuickSetCategory = (newCategory?: TaskCategory) => {
    onUpdate(task.id, { category: newCategory });
  };

  // Quick toggle time reminder from display mode
  const handleQuickToggleTimeReminder = () => {
    const isCurrentlyEnabled = task.reminder?.timeReminder?.enabled;
    const updatedReminder: TaskReminder = {
      ...task.reminder,
      timeReminder: {
        ...(task.reminder?.timeReminder || { preset: 'at_time' }),
        enabled: !isCurrentlyEnabled,
        remindAt: task.reminder?.timeReminder?.remindAt || task.dueDate || new Date().toISOString(),
      },
    };
    onUpdate(task.id, { reminder: updatedReminder });
  };

  // Quick toggle location reminder from display mode
  const handleQuickToggleLocReminder = () => {
    const isCurrentlyEnabled = task.reminder?.locationReminder?.enabled;
    const updatedReminder: TaskReminder = {
      ...task.reminder,
      locationReminder: {
        ...(task.reminder?.locationReminder || {
          locationName: task.location || 'Current Location',
          radiusMeters: 300,
          triggerType: 'arrive',
        }),
        enabled: !isCurrentlyEnabled,
        locationName: task.reminder?.locationReminder?.locationName || task.location || 'Location',
      },
    };
    onUpdate(task.id, { reminder: updatedReminder });
  };

  // Test notification helper
  const handleTestChime = () => {
    playReminderChime();
    triggerBrowserNotification(`🔔 Reminder: ${task.title}`, task.description || 'Reminder test alert');
  };

  // Subtask Handlers
  const handleSaveSubtask = (subtaskData: Omit<SubTask, 'id' | 'completed'> & { id?: string }) => {
    const current = isEditing ? editingSubtasks : (task.subtasks || []);

    if (subtaskData.id) {
      const updated = current.map(s => s.id === subtaskData.id ? { ...s, ...subtaskData } : s);
      if (isEditing) {
        setEditingSubtasks(updated);
      } else {
        onUpdate(task.id, { subtasks: updated });
      }
    } else {
      const newSub: SubTask = {
        id: crypto.randomUUID(),
        title: subtaskData.title,
        description: subtaskData.description,
        dueDate: subtaskData.dueDate,
        location: subtaskData.location,
        completed: false,
      };
      const updated = [...current, newSub];
      if (isEditing) {
        setEditingSubtasks(updated);
      } else {
        onUpdate(task.id, { subtasks: updated });
      }
    }
  };

  const handleToggleSubtask = (subtaskId: string) => {
    const current = task.subtasks || [];
    const updated = current.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    onUpdate(task.id, { subtasks: updated });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (isEditing) {
      setEditingSubtasks(editingSubtasks.filter(s => s.id !== subtaskId));
    } else {
      const current = task.subtasks || [];
      const updated = current.filter(s => s.id !== subtaskId);
      onUpdate(task.id, { subtasks: updated });
    }
  };

  // Calculate Subtask Progress
  const subtasks = isEditing ? editingSubtasks : (task.subtasks || []);
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const reminderSummary = getReminderSummary(task.reminder);
  const priorityConfig = getPriorityConfig(task.priority);
  const categoryConfig = getCategoryConfig(task.category);
  const locReminder = task.reminder?.locationReminder;
  const locDistance = (userCoords && locReminder?.lat && locReminder?.lng)
    ? calculateDistance(userCoords.lat, userCoords.lng, locReminder.lat, locReminder.lng)
    : null;

  const computedEditDueDate = date ? (time ? `${date}T${time}` : `${date}T00:00`) : '';

  return (
    <div className="flex flex-col h-full bg-neutral-50 relative">
      {/* Top Navigation Header */}
      <div className="flex items-center justify-between px-4 py-5 bg-white border-b border-neutral-100 z-10">
        <button 
          onClick={onBack} 
          className="p-2 -ml-2 rounded-full hover:bg-neutral-100 text-neutral-600 transition-colors"
          title="Back to tasks"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="flex items-center gap-1">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors"
              >
                <Pencil size={15} />
                <span>Edit</span>
              </button>

              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                title="Delete task"
              >
                <Trash2 size={20} />
              </button>
            </>
          ) : (
            <button
              onClick={handleCancelEdit}
              className="p-2 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors"
              title="Cancel editing"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          /* EDIT MODE */
          <form onSubmit={handleSaveEdit} className="p-6 bg-white space-y-6">
            <h2 className="text-xl font-black text-neutral-900 tracking-tight">Edit Task</h2>

            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-2 block">
                Task Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="w-full text-xl font-semibold text-neutral-900 border-b border-neutral-200 focus:border-neutral-900 focus:outline-none pb-2"
                required
              />
            </div>

            <div className="space-y-5">
              {/* Category Selector in Edit Mode */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">
                    Category
                  </label>
                  {category && (
                    <button
                      type="button"
                      onClick={() => setCategory(undefined)}
                      className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {TASK_CATEGORIES.map((cat) => {
                    const cfg = getCategoryConfig(cat);
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(isSelected ? undefined : (cat as TaskCategory))}
                        className={cn(
                          "py-1.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0",
                          isSelected 
                            ? `${cfg?.activeClass} shadow-2xs scale-[1.02]` 
                            : `${cfg?.badgeClass} hover:opacity-90`
                        )}
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          isSelected ? "bg-white" : cfg?.dotClass
                        )} />
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Tags in Edit Mode */}
              <div>
                <TagManagerInput
                  tags={editingTags}
                  onChange={setEditingTags}
                  existingTags={existingTags}
                  compact
                />
              </div>

              {/* Priority Selector in Edit Mode */}
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1.5 block">
                  Priority Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'Low', label: 'Low', badge: 'bg-slate-50 border-slate-200 text-slate-700', active: 'bg-slate-900 text-white border-slate-900 shadow-xs', dot: 'bg-slate-400' },
                    { id: 'Medium', label: 'Medium', badge: 'bg-amber-50 border-amber-200 text-amber-800', active: 'bg-amber-600 text-white border-amber-600 shadow-xs', dot: 'bg-amber-400' },
                    { id: 'High', label: 'High', badge: 'bg-rose-50 border-rose-200 text-rose-700', active: 'bg-rose-600 text-white border-rose-600 shadow-xs', dot: 'bg-rose-400' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id as Priority)}
                      className={cn(
                        "py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5",
                        priority === p.id 
                          ? p.active 
                          : `${p.badge} hover:opacity-80`
                      )}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        priority === p.id ? "bg-white" : p.dot
                      )} />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-2 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task details..."
                  className="w-full text-sm text-neutral-700 bg-neutral-50 p-3 rounded-xl border border-neutral-200 focus:border-neutral-900 focus:outline-none min-h-[120px] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 block">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 block">
                    Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-sm bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 block">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location or address"
                  className="w-full text-sm bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 focus:outline-none"
                />
              </div>

              {/* Subtasks in Edit Mode */}
              <div className="pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 block">
                    Subtasks / Steps
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddSubtaskOpen(true)}
                    className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                  >
                    <Plus size={14} />
                    <span>Add Subtask</span>
                  </button>
                </div>

                <div className="space-y-2 mb-3">
                  {editingSubtasks.map((st) => (
                    <div key={st.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-800 font-semibold">{st.title}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingSubtask(st)}
                            className="text-neutral-400 hover:text-neutral-700 p-1"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtask(st.id)}
                            className="text-neutral-400 hover:text-red-500 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {st.description && <p className="text-[11px] text-neutral-500">{st.description}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recurrence in Edit Mode */}
              <RecurrenceSelector
                rule={editingRecurrence}
                onChange={setEditingRecurrence}
                baseDueDate={computedEditDueDate}
              />

              {/* Reminders in Edit Mode */}
              <ReminderFormSection
                reminder={editingReminder}
                taskDueDate={computedEditDueDate}
                taskLocation={location}
                onChange={setEditingReminder}
                userCoords={userCoords}
              />

              {/* Rich Notes in Edit Mode */}
              <div className="pt-2 border-t border-neutral-100">
                <TaskRichNotes
                  initialNotes={editingNotes}
                  notesUpdatedAt={task.notesUpdatedAt}
                  taskTitle={title || task.title}
                  onSave={(notesHtml) => {
                    setEditingNotes(notesHtml);
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 py-3 text-sm font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md",
                  title.trim() ? "bg-neutral-900 hover:bg-neutral-800" : "bg-neutral-300 cursor-not-allowed"
                )}
              >
                <Save size={16} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          /* DISPLAY MODE */
          <>
            <div className="p-6 bg-white border-b border-neutral-100 space-y-6">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => onUpdate(task.id, { completed: !task.completed })}
                  className="mt-1 transition-transform active:scale-90"
                  title={task.completed ? "Mark as incomplete" : "Mark as completed"}
                >
                  {task.completed ? (
                    <CheckCircle2 className="text-emerald-500" size={28} />
                  ) : (
                    <Circle className="text-neutral-300" size={28} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className={cn(
                      "text-2xl font-bold text-neutral-900 leading-snug",
                      task.completed && "line-through text-neutral-400"
                    )}>
                      {task.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {categoryConfig && (
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0",
                          categoryConfig.badgeClass
                        )}>
                          <span className={cn("w-2 h-2 rounded-full shrink-0", categoryConfig.dotClass)} />
                          <span>{categoryConfig.label}</span>
                        </div>
                      )}
                      {priorityConfig && (
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0",
                          priorityConfig.badgeClass
                        )}>
                          <span className={cn("w-2 h-2 rounded-full shrink-0", priorityConfig.dotClass)} />
                          <span>{priorityConfig.label} Priority</span>
                        </div>
                      )}
                      {task.notes && task.notes.replace(/<[^>]*>/g, '').trim().length > 0 && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 bg-teal-50 text-teal-700 border-teal-200">
                          <FileText size={12} className="text-teal-600 shrink-0" />
                          <span>Notes</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Quick Switcher */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-1 flex items-center gap-1">
                      <Tag size={11} /> Category:
                    </span>
                    {TASK_CATEGORIES.map((cat) => {
                      const isCurrent = task.category === cat;
                      const cfg = getCategoryConfig(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleQuickSetCategory(isCurrent ? undefined : cat)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1",
                            isCurrent
                              ? `${cfg?.activeClass} shadow-2xs`
                              : `${cfg?.badgeClass} hover:opacity-80`
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isCurrent ? "bg-white" : cfg?.dotClass)} />
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                    {task.category && (
                      <button
                        type="button"
                        onClick={() => handleQuickSetCategory(undefined)}
                        className="text-[10px] font-medium text-neutral-400 hover:text-neutral-600 underline ml-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Priority Quick Switcher */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-1 flex items-center gap-1">
                      <Flag size={11} /> Priority:
                    </span>
                    {(['Low', 'Medium', 'High'] as Priority[]).map((p) => {
                      const isCurrent = (task.priority || 'Medium') === p;
                      const cfg = getPriorityConfig(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleQuickSetPriority(p)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1",
                            isCurrent
                              ? `${cfg?.badgeClass} ring-1 ring-neutral-300 shadow-2xs`
                              : "bg-white text-neutral-500 hover:text-neutral-900 border-neutral-200"
                          )}
                        >
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg?.dotClass)} />
                          <span>{p}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Tags Quick Manager in Display Mode */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-1 flex items-center gap-1">
                      <Hash size={11} /> Tags:
                    </span>
                    {(task.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[11px] font-semibold"
                      >
                        <span className="text-neutral-400">#</span>
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (task.tags || []).filter((t) => t !== tag);
                            onUpdate(task.id, { tags: updated });
                          }}
                          className="text-neutral-400 hover:text-white ml-0.5"
                          title={`Remove #${tag}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    {(task.tags || []).length < 20 && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const cleaned = normalizeTag(quickTagInput);
                          if (!cleaned) return;
                          const current = task.tags || [];
                          if (!current.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
                            onUpdate(task.id, { tags: [...current, cleaned] });
                          }
                          setQuickTagInput('');
                        }}
                        className="inline-flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={quickTagInput}
                          onChange={(e) => setQuickTagInput(e.target.value)}
                          placeholder="+ Add tag"
                          maxLength={30}
                          className="w-24 px-2 py-0.5 text-[11px] bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:border-neutral-900 focus:bg-white text-neutral-800 placeholder:text-neutral-400"
                        />
                        {normalizeTag(quickTagInput) && (
                          <button
                            type="submit"
                            className="px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] font-bold hover:bg-neutral-800"
                          >
                            Add
                          </button>
                        )}
                      </form>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {task.description && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">
                      Description
                    </label>
                    <p className="text-neutral-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {task.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* DUE DATE CARD */}
                  {task.dueDate ? (
                    <div className="flex flex-col justify-between p-3.5 bg-blue-50/60 hover:bg-blue-100/70 border border-blue-100 rounded-2xl transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-500 text-white rounded-lg shadow-xs">
                            <Calendar size={16} />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-blue-600">Due Date</span>
                        </div>
                        <a 
                          href={getGoogleCalendarUrl(task)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-blue-400 hover:text-blue-700 transition-colors"
                          title="Open in Google Calendar"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-neutral-900 block">
                          {format(new Date(task.dueDate), 'PPP p')}
                        </span>

                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-100/80">
                          <a
                            href={getGoogleCalendarUrl(task)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <span>Add to Calendar</span>
                            <ExternalLink size={10} />
                          </a>
                          <span className="text-[10px] text-blue-300">•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              downloadIcsFile(task);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 hover:underline"
                            title="Download .ics event file"
                          >
                            <Download size={10} />
                            <span>.ics</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="p-2 bg-neutral-200 text-neutral-500 rounded-lg">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 block">Due Date</span>
                        <span className="text-xs font-medium text-neutral-400">No due date set</span>
                      </div>
                    </div>
                  )}

                  {/* LOCATION CARD */}
                  {task.location ? (
                    <a
                      href={getGoogleMapsUrl(task.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col justify-between p-3.5 bg-orange-50/60 hover:bg-orange-100/70 border border-orange-100 rounded-2xl transition-all cursor-pointer group"
                      title="Tap to open location in Google Maps / Navigation app"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-orange-500 text-white rounded-lg shadow-xs">
                            <MapPin size={16} />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-orange-600">Location</span>
                        </div>
                        <ExternalLink size={14} className="text-orange-400 group-hover:text-orange-600 transition-colors" />
                      </div>

                      <div>
                        <span className="text-xs font-bold text-neutral-900 group-hover:text-orange-800 transition-colors block">
                          {task.location}
                        </span>
                        <div className="mt-2 pt-2 border-t border-orange-100/80 flex items-center justify-between text-[11px] font-semibold text-orange-600 group-hover:underline">
                          <span>Open map navigation</span>
                          <ExternalLink size={10} />
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                      <div className="p-2 bg-neutral-200 text-neutral-500 rounded-lg">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 block">Location</span>
                        <span className="text-xs font-medium text-neutral-400">No location set</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* RECURRING SCHEDULE CARD */}
                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100/90 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-600 text-white rounded-lg shadow-xs">
                        <Repeat size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                          Recurring Repetition
                        </h4>
                        <p className="text-[10px] text-purple-700 font-medium">
                          {task.recurrence ? 'Task automatically repeats' : 'No repetition set'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[10px] font-bold text-purple-700 bg-purple-100/80 hover:bg-purple-200/80 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      {task.recurrence ? 'Change' : 'Set Repeat'}
                    </button>
                  </div>

                  {task.recurrence ? (
                    <div className="p-3 bg-white rounded-xl border border-purple-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0 animate-pulse" />
                        <span className="text-xs font-bold text-purple-950">
                          {getRecurrenceDescription(task.recurrence)}
                        </span>
                      </div>
                      {task.recurrence.timesRepeated ? (
                        <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                          Repeated {task.recurrence.timesRepeated}×
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 font-medium pl-1">
                      Set this task to repeat daily, weekly, or monthly so you never miss a routine task.
                    </p>
                  )}
                </div>

                {/* SMART REMINDERS & ALERTS CARD */}
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500 text-white rounded-lg shadow-xs">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                          Task Reminders
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-medium">
                          Time, Day & Location Alerts
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleTestChime}
                        className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-700 rounded-lg text-[10px] font-bold border border-neutral-200 transition-colors shadow-2xs"
                        title="Play test audio chime"
                      >
                        <Volume2 size={11} />
                        <span>Test Chime</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-2 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-bold transition-colors"
                      >
                        Configure
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {/* Time & Day Item */}
                    <div className="p-3 bg-white rounded-xl border border-neutral-200/60 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0 mt-0.5",
                          task.reminder?.timeReminder?.enabled ? "bg-blue-50 text-blue-600" : "bg-neutral-100 text-neutral-400"
                        )}>
                          <Clock size={15} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                            Time & Day Alert
                          </span>
                          <span className={cn(
                            "text-xs font-semibold block truncate",
                            task.reminder?.timeReminder?.enabled ? "text-neutral-900" : "text-neutral-400"
                          )}>
                            {reminderSummary.timeSummary || "No time reminder set"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleQuickToggleTimeReminder}
                        className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-md shrink-0 transition-colors",
                          task.reminder?.timeReminder?.enabled 
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        )}
                      >
                        {task.reminder?.timeReminder?.enabled ? "Active" : "Turn On"}
                      </button>
                    </div>

                    {/* Location Geofence Item */}
                    <div className="p-3 bg-white rounded-xl border border-neutral-200/60 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={cn(
                          "p-1.5 rounded-lg shrink-0 mt-0.5",
                          task.reminder?.locationReminder?.enabled ? "bg-orange-50 text-orange-600" : "bg-neutral-100 text-neutral-400"
                        )}>
                          <MapPin size={15} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                            Location Alert
                          </span>
                          <span className={cn(
                            "text-xs font-semibold block truncate",
                            task.reminder?.locationReminder?.enabled ? "text-neutral-900" : "text-neutral-400"
                          )}>
                            {reminderSummary.locationSummary || (task.location ? `Alert on arrival: ${task.location}` : "No location alert set")}
                          </span>
                          {locDistance !== null && task.reminder?.locationReminder?.enabled && (
                            <span className="text-[10px] font-bold text-orange-600 block mt-0.5">
                              📍 {formatDistance(locDistance)} away
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleQuickToggleLocReminder}
                        className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-md shrink-0 transition-colors",
                          task.reminder?.locationReminder?.enabled 
                            ? "bg-orange-100 text-orange-700 hover:bg-orange-200" 
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        )}
                      >
                        {task.reminder?.locationReminder?.enabled ? "Active" : "Turn On"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SUBTASKS & CHECKLIST SECTION */}
            <div className="p-6 bg-white border-b border-neutral-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                    <ListCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Subtasks & Steps</h3>
                    <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Break down main task goal</p>
                  </div>
                </div>

                {totalSubtasks > 0 && (
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    {completedSubtasks} of {totalSubtasks} ({progressPercent}%)
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {totalSubtasks > 0 && (
                <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              {/* Subtask items list */}
              <div className="space-y-2 pt-1">
                {subtasks.map((st) => (
                  <div 
                    key={st.id}
                    className="p-3 bg-neutral-50 hover:bg-neutral-100/70 rounded-2xl border border-neutral-200/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className="flex items-start gap-3 text-left flex-1 min-w-0 pr-2"
                      >
                        <div className="mt-0.5 shrink-0">
                          {st.completed ? (
                            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Circle size={20} className="text-neutral-300 shrink-0 hover:text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className={cn(
                            "text-xs font-semibold text-neutral-800 leading-snug block",
                            st.completed && "line-through text-neutral-400 font-normal"
                          )}>
                            {st.title}
                          </span>

                          {st.description && (
                            <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                              {st.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {st.dueDate && (
                              <a
                                href={getGoogleCalendarUrl({ title: `${task.title}: ${st.title}`, description: st.description || '', dueDate: st.dueDate, location: st.location || '' })}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-medium hover:underline"
                              >
                                <Calendar size={10} />
                                <span>{format(new Date(st.dueDate), 'MMM d, h:mm a')}</span>
                              </a>
                            )}

                            {st.location && (
                              <a
                                href={getGoogleMapsUrl(st.location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md font-medium hover:underline"
                              >
                                <MapPin size={10} />
                                <span className="truncate max-w-[120px]">{st.location}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingSubtask(st)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors rounded-lg hover:bg-neutral-200/60"
                          title="Edit subtask options"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtask(st.id)}
                          className="p-1 text-neutral-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                          title="Delete subtask"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Subtask Button */}
              <button
                type="button"
                onClick={() => setIsAddSubtaskOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors shadow-xs"
              >
                <Plus size={15} />
                <span>Add Subtask with Options</span>
              </button>
            </div>

            {/* RICH TEXT NOTES & DOCUMENTATION SECTION */}
            <div className="p-6 bg-white border-b border-neutral-100">
              <TaskRichNotes
                initialNotes={task.notes}
                notesUpdatedAt={task.notesUpdatedAt}
                taskTitle={task.title}
                onSave={(notesHtml) => {
                  onUpdate(task.id, { notes: notesHtml, notesUpdatedAt: new Date().toISOString() });
                }}
              />
            </div>

            {/* TIME TRACKING SECTION */}
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Time Tracking</label>
                  {task.timerTotalSeconds > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <Clock size={14} />
                      <span>Total: {formatTime(task.timerTotalSeconds)}</span>
                    </div>
                  )}
                </div>
                
                <Timer initialSeconds={0} onSave={handleSaveTimer} />
                
                <p className="text-[11px] text-neutral-400 italic text-center">
                  Track how long you spend working on this task.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Subtask Edit/Add Modal */}
      {(editingSubtask || isAddSubtaskOpen) && (
        <SubtaskModal
          subtask={editingSubtask}
          onSave={handleSaveSubtask}
          onClose={() => {
            setEditingSubtask(null);
            setIsAddSubtaskOpen(false);
          }}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">Delete Task?</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Are you sure you want to delete <span className="font-semibold text-neutral-800">"{task.title}"</span>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(task.id);
                }}
                className="flex-1 py-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
