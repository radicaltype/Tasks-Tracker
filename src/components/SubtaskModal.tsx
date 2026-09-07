import React, { useState, FormEvent } from 'react';
import { X, Calendar, MapPin, AlignLeft, Check } from 'lucide-react';
import type { SubTask } from '../types';

interface SubtaskModalProps {
  subtask?: SubTask | null;
  onSave: (subtaskData: Omit<SubTask, 'id' | 'completed'> & { id?: string }) => void;
  onClose: () => void;
}

export default function SubtaskModal({ subtask, onSave, onClose }: SubtaskModalProps) {
  const [title, setTitle] = useState(subtask?.title || '');
  const [description, setDescription] = useState(subtask?.description || '');
  const [date, setDate] = useState(() => {
    if (subtask?.dueDate) {
      try {
        return new Date(subtask.dueDate).toISOString().split('T')[0];
      } catch {
        return '';
      }
    }
    return '';
  });
  const [time, setTime] = useState(() => {
    if (subtask?.dueDate) {
      try {
        const d = new Date(subtask.dueDate);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } catch {
        return '';
      }
    }
    return '';
  });
  const [location, setLocation] = useState(subtask?.location || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let dueDate = '';
    if (date) {
      dueDate = time ? `${date}T${time}` : `${date}T00:00`;
    }

    onSave({
      id: subtask?.id,
      title: title.trim(),
      description: description.trim(),
      dueDate,
      location: location.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-neutral-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="text-lg font-bold text-neutral-900">
            {subtask ? 'Edit Subtask' : 'New Subtask'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 block">
              Subtask Title *
            </label>
            <input
              type="text"
              autoFocus
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold bg-neutral-50 px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
              required
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 flex items-center gap-1">
              <AlignLeft size={12} />
              Description
            </label>
            <textarea
              placeholder="Add details for this step..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full text-xs bg-neutral-50 px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 flex items-center gap-1">
              <Calendar size={12} />
              Due Date & Time
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full text-xs bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 mb-1 flex items-center gap-1">
              <MapPin size={12} />
              Location
            </label>
            <input
              type="text"
              placeholder="Where should this take place?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs bg-neutral-50 px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <Check size={14} />
              <span>Save Subtask</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
