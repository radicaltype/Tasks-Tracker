import { useState, FormEvent, useRef } from 'react';
import { ArrowLeft, Calendar, MapPin, AlignLeft, Send, ListCheck, Plus, Trash2, Edit3, Flag, Tag, Mic, MicOff } from 'lucide-react';
import type { Task, SubTask, TaskReminder, Priority, TaskCategory } from '../types';
import { cn, TASK_CATEGORIES, getCategoryConfig } from '../lib/utils';
import SubtaskModal from './SubtaskModal';
import ReminderFormSection from './ReminderFormSection';

interface AddTaskFormProps {
  onAdd: (task: Omit<Task, 'id' | 'userId' | 'createdAt'>) => Promise<void> | void;
  onCancel: () => void;
  userCoords?: { lat: number; lng: number } | null;
}

export default function AddTaskForm({ onAdd, onCancel, userCoords }: AddTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [category, setCategory] = useState<TaskCategory | undefined>('Work');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [reminder, setReminder] = useState<TaskReminder | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Subtask modal state
  const [editingSubtask, setEditingSubtask] = useState<SubTask | null>(null);
  const [isAddSubtaskOpen, setIsAddSubtaskOpen] = useState(false);

  // Speech recognition state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTitle((prev) => (prev ? prev + ' ' + transcript : transcript));
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleQuickAddSubtask = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    setSubtasks([
      ...subtasks,
      { id: crypto.randomUUID(), title: newSubtaskTitle.trim(), completed: false }
    ]);
    setNewSubtaskTitle('');
  };

  const handleSaveSubtaskModal = (subtaskData: Omit<SubTask, 'id' | 'completed'> & { id?: string }) => {
    if (subtaskData.id) {
      setSubtasks(subtasks.map(s => s.id === subtaskData.id ? { ...s, ...subtaskData } : s));
    } else {
      const newSub: SubTask = {
        id: crypto.randomUUID(),
        title: subtaskData.title,
        description: subtaskData.description,
        dueDate: subtaskData.dueDate,
        location: subtaskData.location,
        completed: false,
      };
      setSubtasks([...subtasks, newSub]);
    }
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    let dueDate = '';
    if (date) {
      dueDate = time ? `${date}T${time}` : `${date}T00:00`;
    }

    try {
      setIsSubmitting(true);
      await onAdd({
        title: title.trim(),
        description: description.trim(),
        dueDate,
        location: location.trim(),
        priority,
        category: category || 'Work',
        completed: false,
        timerTotalSeconds: 0,
        subtasks,
        reminder,
      });
    } catch (err) {
      console.error("Error creating task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const computedDueDate = date ? (time ? `${date}T${time}` : `${date}T00:00`) : '';

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex items-center px-4 py-6 border-b border-neutral-100">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-full hover:bg-neutral-100 text-neutral-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="ml-2 text-2xl font-bold text-neutral-900">New Task</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-2 block">Task Title</label>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              placeholder="What needs to be done?"
              className="flex-1 text-2xl font-medium placeholder:text-neutral-200 border-none p-0 focus:ring-0 text-neutral-900 bg-transparent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={cn(
                "p-3 rounded-full transition-all shrink-0",
                isRecording 
                  ? "bg-red-100 text-red-500 hover:bg-red-200 animate-pulse" 
                  : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
              )}
              title={isRecording ? "Stop recording" : "Voice dictate title"}
            >
              {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Category Selector */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-neutral-50 rounded-xl text-neutral-400">
              <Tag size={20} />
            </div>
            <div className="flex-1">
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
          </div>

          {/* Priority Selector */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-neutral-50 rounded-xl text-neutral-400">
              <Flag size={20} />
            </div>
            <div className="flex-1">
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
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 bg-neutral-50 rounded-xl text-neutral-400">
              <AlignLeft size={20} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 block">Description</label>
              <textarea
                placeholder="Add more details..."
                className="w-full text-base placeholder:text-neutral-300 border-none p-0 focus:ring-0 min-h-[100px] resize-none text-neutral-800"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
              <ListCheck size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 block">Subtasks / Checklist</label>
                <button
                  type="button"
                  onClick={() => setIsAddSubtaskOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>With Details</span>
                </button>
              </div>
              
              {subtasks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {subtasks.map((st) => (
                    <div key={st.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-neutral-800 font-semibold block">{st.title}</span>
                        {st.description && <p className="text-[11px] text-neutral-500 truncate">{st.description}</p>}
                        {(st.dueDate || st.location) && (
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-500">
                            {st.dueDate && <span>📅 {st.dueDate.replace('T', ' ')}</span>}
                            {st.location && <span>📍 {st.location}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingSubtask(st)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a quick subtask step..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddSubtask();
                    }
                  }}
                  className="flex-1 text-xs bg-neutral-50 px-3 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
                />
                <button
                  type="button"
                  onClick={handleQuickAddSubtask}
                  disabled={!newSubtaskTitle.trim()}
                  className="flex items-center gap-1 px-3 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors"
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-400">
              <Calendar size={20} />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 block">Due Date</label>
                <input
                  type="date"
                  className="w-full text-base border-none p-0 focus:ring-0"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 block">Time</label>
                <input
                  type="time"
                  className="w-full text-base border-none p-0 focus:ring-0"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 bg-orange-50 rounded-xl text-orange-400">
              <MapPin size={20} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 block">Location</label>
              <input
                type="text"
                placeholder="Where?"
                className="w-full text-base placeholder:text-neutral-300 border-none p-0 focus:ring-0"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <ReminderFormSection
            reminder={reminder}
            taskDueDate={computedDueDate}
            taskLocation={location}
            onChange={setReminder}
            userCoords={userCoords}
          />
        </div>
      </form>

      <div className="p-6 border-t border-neutral-100">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-[0.98]",
            isSubmitting
              ? "bg-neutral-800 text-white cursor-wait opacity-80"
              : title.trim() 
                ? "bg-neutral-900 text-white shadow-xl shadow-neutral-200 hover:bg-black" 
                : "bg-neutral-100 text-neutral-300 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Saving Task...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Create Task</span>
            </>
          )}
        </button>
      </div>

      {(editingSubtask || isAddSubtaskOpen) && (
        <SubtaskModal
          subtask={editingSubtask}
          onSave={handleSaveSubtaskModal}
          onClose={() => {
            setEditingSubtask(null);
            setIsAddSubtaskOpen(false);
          }}
        />
      )}
    </div>
  );
}
