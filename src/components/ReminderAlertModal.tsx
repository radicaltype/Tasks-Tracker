import React from 'react';
import { Bell, MapPin, CheckCircle2, Clock, X, ExternalLink } from 'lucide-react';
import type { Task } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export interface ActiveAlert {
  task: Task;
  type: 'time' | 'location';
  message: string;
}

interface ReminderAlertModalProps {
  alert: ActiveAlert | null;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
  onCompleteTask: (taskId: string) => void;
  onOpenTask: (task: Task) => void;
}

export default function ReminderAlertModal({
  alert,
  onDismiss,
  onSnooze,
  onCompleteTask,
  onOpenTask,
}: ReminderAlertModalProps) {
  if (!alert) return null;

  const { task, type, message } = alert;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-neutral-100 flex flex-col gap-4 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={type === 'location' 
                ? "w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs animate-bounce"
                : "w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs animate-pulse"
              }>
                {type === 'location' ? <MapPin size={24} /> : <Bell size={24} />}
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 block">
                  {type === 'location' ? 'Location Reminder' : 'Task Reminder'}
                </span>
                <h3 className="text-lg font-bold text-neutral-900 leading-tight">
                  Reminder Alert
                </h3>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
              title="Dismiss"
            >
              <X size={18} />
            </button>
          </div>

          {/* Task Info Box */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-2">
            <h4 className="text-base font-bold text-neutral-900 leading-snug">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 pt-1">
              {type === 'location' ? (
                <span className="text-orange-600 flex items-center gap-1">
                  <MapPin size={13} />
                  <span>{message}</span>
                </span>
              ) : (
                <span className="text-blue-600 flex items-center gap-1">
                  <Clock size={13} />
                  <span>{message}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                onCompleteTask(task.id);
                onDismiss();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <CheckCircle2 size={16} />
              <span>Mark Task as Done</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSnooze(10)}
                className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock size={14} />
                <span>Snooze 10m</span>
              </button>

              <button
                onClick={() => {
                  onOpenTask(task);
                  onDismiss();
                }}
                className="py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Open Task</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
