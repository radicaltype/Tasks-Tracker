import React, { useState } from 'react';
import { Repeat, Calendar, Info, X, Check } from 'lucide-react';
import type { RecurrenceRule, RecurrenceFrequency } from '../types';
import { RECURRENCE_DAYS_OF_WEEK, getRecurrenceDescription } from '../lib/recurrenceUtils';
import { cn } from '../lib/utils';

interface RecurrenceSelectorProps {
  rule?: RecurrenceRule;
  onChange: (rule: RecurrenceRule | undefined) => void;
  baseDueDate?: string;
}

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  rule,
  onChange,
  baseDueDate,
}) => {
  const isEnabled = !!rule;
  const frequency: RecurrenceFrequency = rule?.frequency || 'daily';
  const interval = rule?.interval || 1;
  const weekDays = rule?.weekDays || [];
  const endDate = rule?.endDate || '';

  const handleToggle = (enabled: boolean) => {
    if (!enabled) {
      onChange(undefined);
    } else {
      // Default to daily repeat
      onChange({
        frequency: 'daily',
        interval: 1,
      });
    }
  };

  const handleFrequencyChange = (newFreq: RecurrenceFrequency) => {
    let newWeekDays = weekDays;
    if (newFreq === 'weekly' && (!weekDays || weekDays.length === 0)) {
      // Pick current day or base due date day of week as initial selection
      const d = baseDueDate ? new Date(baseDueDate) : new Date();
      const day = isNaN(d.getTime()) ? new Date().getDay() : d.getDay();
      newWeekDays = [day];
    }
    onChange({
      frequency: newFreq,
      interval: interval || 1,
      weekDays: newFreq === 'weekly' ? newWeekDays : undefined,
      endDate: endDate || undefined,
    });
  };

  const handleIntervalChange = (newInterval: number) => {
    const safeInterval = Math.max(1, Math.min(99, newInterval || 1));
    onChange({
      frequency,
      interval: safeInterval,
      weekDays: frequency === 'weekly' ? weekDays : undefined,
      endDate: endDate || undefined,
    });
  };

  const handleToggleDay = (dayId: number) => {
    let nextDays: number[];
    if (weekDays.includes(dayId)) {
      if (weekDays.length === 1) return; // Keep at least one selected day
      nextDays = weekDays.filter(d => d !== dayId);
    } else {
      nextDays = [...weekDays, dayId];
    }
    onChange({
      frequency,
      interval,
      weekDays: nextDays,
      endDate: endDate || undefined,
    });
  };

  const handleEndDateChange = (val: string) => {
    onChange({
      frequency,
      interval,
      weekDays: frequency === 'weekly' ? weekDays : undefined,
      endDate: val || undefined,
    });
  };

  return (
    <div className="flex items-start gap-4">
      <div className={cn(
        "p-2 rounded-xl transition-colors",
        isEnabled ? "bg-purple-100 text-purple-700" : "bg-neutral-50 text-neutral-400"
      )}>
        <Repeat size={20} />
      </div>

      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 block">
              Repeat / Recurring Task
            </label>
            <span className="text-xs text-neutral-500 font-medium">
              Automatically creates next occurrence when completed
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {isEnabled && (
          <div className="p-4 bg-purple-50/70 border border-purple-100/90 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Frequency Tabs: Daily, Weekly, Monthly */}
            <div>
              <label className="text-[10px] uppercase tracking-widest font-bold text-purple-800 block mb-1.5">
                Repeat Interval
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleFrequencyChange(tab.id as RecurrenceFrequency)}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                      frequency === tab.id
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-white text-purple-900 border-purple-200/80 hover:bg-purple-100/50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interval number selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-neutral-700">Every</span>
              <div className="flex items-center gap-1.5 bg-white border border-purple-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={interval}
                  onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 1)}
                  className="w-10 text-center text-xs font-bold text-purple-950 focus:outline-none"
                />
              </div>
              <span className="text-xs font-semibold text-neutral-700">
                {frequency === 'daily' && (interval === 1 ? 'day' : 'days')}
                {frequency === 'weekly' && (interval === 1 ? 'week' : 'weeks')}
                {frequency === 'monthly' && (interval === 1 ? 'month' : 'months')}
              </span>
            </div>

            {/* Weekly Days of Week Picker */}
            {frequency === 'weekly' && (
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-purple-800 block mb-1.5">
                  Repeat On Days
                </label>
                <div className="flex gap-1.5 justify-between">
                  {RECURRENCE_DAYS_OF_WEEK.map((day) => {
                    const isSelected = weekDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => handleToggleDay(day.id)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center border",
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                            : "bg-white text-purple-900 border-purple-200/80 hover:bg-purple-100/60"
                        )}
                        title={day.full}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Optional End Date */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-widest font-bold text-purple-800 block">
                  End Repeat (Optional)
                </label>
                {endDate && (
                  <button
                    type="button"
                    onClick={() => handleEndDateChange('')}
                    className="text-[10px] font-semibold text-purple-600 hover:text-purple-800"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full text-xs bg-white border border-purple-200 rounded-xl px-3 py-2 text-purple-950 focus:outline-none focus:border-purple-500"
                placeholder="Never ends"
              />
            </div>

            {/* Description Pill */}
            <div className="p-2.5 bg-purple-100/70 border border-purple-200/80 rounded-xl flex items-center gap-2 text-xs text-purple-900 font-medium">
              <Info size={14} className="text-purple-600 shrink-0" />
              <span>{getRecurrenceDescription(rule)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
