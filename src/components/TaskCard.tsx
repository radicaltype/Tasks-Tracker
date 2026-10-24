import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  Calendar, 
  MapPin, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ListCheck, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Edit3, 
  Trash2,
  AlignLeft,
  Bell,
  Repeat,
  FileText,
  RotateCcw
} from 'lucide-react';
import type { Task, SubTask } from '../types';
import { cn, formatTime, getGoogleMapsUrl, getGoogleCalendarUrl, getPriorityConfig, getCategoryConfig } from '../lib/utils';
import { getReminderSummary } from '../lib/reminderUtils';
import { getRecurrenceDescription } from '../lib/recurrenceUtils';
import { motion, AnimatePresence } from 'motion/react';
import SubtaskModal from './SubtaskModal';

interface TaskCardProps {
  task: Task;
  onToggle: (taskId: string, completed: boolean) => void;
  onClick: (task: Task) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
  onSelectTag?: (tag: string) => void;
  selectedTag?: string;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onClick, onUpdateTask, onDelete, onSelectTag, selectedTag }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<SubTask | null>(null);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const subtasks = task.subtasks || [];
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  const reminderSummary = getReminderSummary(task.reminder);
  const priorityConfig = getPriorityConfig(task.priority);
  const categoryConfig = getCategoryConfig(task.category);

  const handleToggleSubtask = (e: React.MouseEvent, subtaskId: string) => {
    e.stopPropagation();
    if (!onUpdateTask) return;
    const updated = subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    onUpdateTask(task.id, { subtasks: updated });
  };

  const handleDeleteSubtask = (e: React.MouseEvent, subtaskId: string) => {
    e.stopPropagation();
    if (!onUpdateTask) return;
    const updated = subtasks.filter(s => s.id !== subtaskId);
    onUpdateTask(task.id, { subtasks: updated });
  };

  const handleSaveSubtask = (subtaskData: Omit<SubTask, 'id' | 'completed'> & { id?: string }) => {
    if (!onUpdateTask) return;

    if (subtaskData.id) {
      // Edit existing
      const updated = subtasks.map(s => s.id === subtaskData.id ? { ...s, ...subtaskData } : s);
      onUpdateTask(task.id, { subtasks: updated });
    } else {
      // Add new
      const newSub: SubTask = {
        id: crypto.randomUUID(),
        title: subtaskData.title,
        description: subtaskData.description,
        dueDate: subtaskData.dueDate,
        location: subtaskData.location,
        completed: false,
      };
      onUpdateTask(task.id, { subtasks: [...subtasks, newSub] });
    }
  };

  return (
    <>
      <div className="relative mb-3 rounded-3xl overflow-hidden select-none">
        {/* Swipe action underlay revealed when dragging */}
        <div className="absolute inset-0 flex pointer-events-none rounded-3xl overflow-hidden">
          {/* Swiping right -> Mark Completed / Reopen */}
          <div className="w-1/2 bg-emerald-600 text-white flex items-center justify-start pl-6 gap-2 font-bold text-xs tracking-wide">
            {task.completed ? <RotateCcw size={20} /> : <CheckCircle2 size={20} />}
            <span>{task.completed ? 'Reopen' : 'Complete'}</span>
          </div>
          {/* Swiping left -> Delete */}
          <div className="w-1/2 bg-rose-600 text-white flex items-center justify-end pr-6 gap-2 font-bold text-xs tracking-wide">
            <span>Delete</span>
            <Trash2 size={20} />
          </div>
        </div>

        {/* Foreground Draggable Task Card */}
        <motion.div
          layout
          drag={isExpanded ? false : "x"}
          dragDirectionLock
          dragSnapToOrigin
          dragConstraints={{ left: -140, right: 140 }}
          dragElastic={0.25}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(_, info) => {
            setTimeout(() => setIsDragging(false), 60);
            if (info.offset.x > 70) {
              onToggle(task.id, !task.completed);
            } else if (info.offset.x < -70) {
              setConfirmDelete(true);
            }
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn(
            "group relative bg-white border border-neutral-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all overflow-hidden touch-pan-y",
            priorityConfig && !task.completed && `border-l-4 ${priorityConfig.borderClass}`,
            task.completed && "opacity-60"
          )}
        >
          {/* Inline Delete Confirmation Overlay */}
          <AnimatePresence>
            {confirmDelete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="absolute inset-0 z-30 bg-neutral-900/95 backdrop-blur-xs text-white rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Trash2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[220px]">
                      Delete "{task.title}"?
                    </p>
                    <p className="text-[11px] text-neutral-400">Remove directly from list.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDelete) onDelete(task.id);
                      setConfirmDelete(false);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            className="flex items-start gap-4 cursor-pointer"
            onClick={() => {
              if (isDragging) return;
              onClick(task);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(task.id, !task.completed);
              }}
              className="mt-1 transition-transform active:scale-90 hover:opacity-85"
              title={task.completed ? "Mark as active" : "Mark as completed"}
              aria-label={task.completed ? "Mark as active" : "Mark as completed"}
            >
              {task.completed ? (
                <CheckCircle2 className="text-emerald-500" size={24} />
              ) : (
                <Circle className="text-neutral-300 hover:text-emerald-500" size={24} />
              )}
            </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className={cn(
                "text-lg font-semibold text-neutral-900 truncate",
                task.completed && "line-through text-neutral-400"
              )}>
                {task.title}
              </h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {categoryConfig && (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-tight border shrink-0",
                    categoryConfig.badgeClass
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", categoryConfig.dotClass)} />
                    <span>{categoryConfig.label}</span>
                  </span>
                )}
                {priorityConfig && (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-tight border shrink-0",
                    priorityConfig.badgeClass
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityConfig.dotClass)} />
                    <span>{priorityConfig.label}</span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
              {task.dueDate && (
                <a
                  href={getGoogleCalendarUrl(task)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-blue-600 transition-colors hover:underline"
                  title="Add to Calendar"
                >
                  <Calendar size={13} className="text-blue-500" />
                  <span>{format(new Date(task.dueDate), 'MMM d, h:mm a')}</span>
                </a>
              )}
              
              {task.location && (
                <a
                  href={getGoogleMapsUrl(task.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-orange-600 transition-colors hover:underline"
                  title="Open location in map app"
                >
                  <MapPin size={13} className="text-orange-500" />
                  <span className="truncate max-w-[120px]">{task.location}</span>
                </a>
              )}

              {/* Recurrence Badge */}
              {task.recurrence && (
                <div 
                  className="flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50/90 border border-purple-200/80 px-2 py-0.5 rounded-full font-medium"
                  title={getRecurrenceDescription(task.recurrence)}
                >
                  <Repeat size={11} className="text-purple-600 shrink-0" />
                  <span className="truncate max-w-[130px]">{getRecurrenceDescription(task.recurrence)}</span>
                </div>
              )}

              {/* Reminders Badges */}
              {reminderSummary.timeSummary && (
                <div 
                  className="flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50/90 border border-blue-100/80 px-2 py-0.5 rounded-full font-medium"
                  title={`Time Reminder: ${reminderSummary.timeSummary}`}
                >
                  <Bell size={11} className="text-blue-500 shrink-0" />
                  <span className="truncate max-w-[120px]">{reminderSummary.timeSummary}</span>
                </div>
              )}

              {reminderSummary.locationSummary && !reminderSummary.timeSummary && (
                <div 
                  className="flex items-center gap-1 text-[11px] text-orange-700 bg-orange-50/90 border border-orange-100/80 px-2 py-0.5 rounded-full font-medium"
                  title={`Location Reminder: ${reminderSummary.locationSummary}`}
                >
                  <Bell size={11} className="text-orange-500 shrink-0" />
                  <span className="truncate max-w-[120px]">{reminderSummary.locationSummary}</span>
                </div>
              )}

              {/* Subtask pill button on main screen */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all border",
                  isExpanded 
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" 
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100/60"
                )}
                title="Expand / Collapse Subtasks"
              >
                <ListCheck size={13} className={isExpanded ? "text-white" : "text-indigo-500"} />
                <span>{completedSubtasks}/{totalSubtasks} subtasks</span>
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {task.notes && task.notes.replace(/<[^>]*>/g, '').trim().length > 0 && (
                <div 
                  className="flex items-center gap-1 text-[11px] text-teal-700 bg-teal-50/90 border border-teal-100/80 px-2 py-0.5 rounded-full font-medium"
                  title="Task has rich text notes / documentation"
                >
                  <FileText size={11} className="text-teal-600 shrink-0" />
                  <span>Notes</span>
                </div>
              )}

              {task.timerTotalSeconds > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                  <Clock size={12} />
                  <span>{formatTime(task.timerTotalSeconds)}</span>
                </div>
              )}
            </div>

            {/* Custom Tags Row */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {task.tags.map((tag) => {
                  const isTagActive = selectedTag && selectedTag.toLowerCase() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTag) onSelectTag(tag);
                      }}
                      className={cn(
                        "inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors border",
                        isTagActive
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200/80 hover:bg-neutral-100 hover:text-neutral-900"
                      )}
                      title={`Filter by #${tag}`}
                    >
                      <span className="opacity-60">#</span>
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Action Icons: Quick Action Buttons & Details Chevron */}
          <div className="flex items-center gap-1 shrink-0 self-center">
            {/* Quick Action Button: Toggle Completion */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(task.id, !task.completed);
              }}
              className={cn(
                "p-2 rounded-xl transition-all",
                task.completed
                  ? "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                  : "text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 active:scale-95"
              )}
              title={task.completed ? "Reopen task" : "Quick complete"}
              aria-label={task.completed ? "Reopen task" : "Quick complete"}
            >
              {task.completed ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}
            </button>

            {/* Quick Action Button: Delete directly from list view */}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-xl transition-colors active:scale-95"
                title="Quick delete task"
                aria-label="Quick delete task"
              >
                <Trash2 size={16} />
              </button>
            )}

            {/* Open Details Chevron */}
            <div 
              className="p-1 text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-1 transition-all"
              title="View task details"
            >
              <ChevronRight size={20} />
            </div>
          </div>
        </div>

        {/* EXPANDABLE SUBTASKS SECTION ON MAIN SCREEN */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-neutral-100 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Subtasks Breakdown
                </span>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {progressPercent}% Done
                </span>
              </div>

              {/* Progress Bar */}
              {totalSubtasks > 0 && (
                <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              {/* Subtask list */}
              {totalSubtasks === 0 ? (
                <p className="text-xs text-neutral-400 italic py-1">No subtasks added yet.</p>
              ) : (
                <div className="space-y-2">
                  {subtasks.map((st) => (
                    <div 
                      key={st.id} 
                      className={cn(
                        "p-3 rounded-2xl border transition-all bg-neutral-50/80 hover:bg-neutral-100/60 border-neutral-100",
                        st.completed && "opacity-60 bg-neutral-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleToggleSubtask(e, st.id)}
                          className="flex items-start gap-2.5 text-left flex-1 min-w-0"
                        >
                          <div className="mt-0.5 shrink-0">
                            {st.completed ? (
                              <CheckCircle2 size={18} className="text-emerald-500" />
                            ) : (
                              <Circle size={18} className="text-neutral-300 hover:text-neutral-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className={cn(
                              "text-xs font-semibold text-neutral-800 block leading-tight",
                              st.completed && "line-through text-neutral-400 font-normal"
                            )}>
                              {st.title}
                            </span>

                            {/* Subtask description */}
                            {st.description && (
                              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                                {st.description}
                              </p>
                            )}

                            {/* Subtask options badges (Due Date & Location) */}
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {st.dueDate && (
                                <a
                                  href={getGoogleCalendarUrl({ title: `${task.title}: ${st.title}`, description: st.description || '', dueDate: st.dueDate, location: st.location || '' })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
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
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md font-medium hover:underline"
                                >
                                  <MapPin size={10} />
                                  <span className="truncate max-w-[100px]">{st.location}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSubtask(st);
                            }}
                            className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-md transition-colors"
                            title="Edit subtask options"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSubtask(e, st.id)}
                            className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete subtask"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add subtask button on main screen card */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddSubtaskOpen(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs mt-2"
              >
                <Plus size={14} />
                <span>Add Subtask with Options</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
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
    </>
  );
};

export default TaskCard;
