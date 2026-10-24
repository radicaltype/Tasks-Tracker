import type { RecurrenceRule, RecurrenceFrequency } from '../types';
import { addDays, addWeeks, addMonths, format, parseISO, isValid } from 'date-fns';

export const RECURRENCE_DAYS_OF_WEEK = [
  { id: 1, label: 'M', name: 'Mon', full: 'Monday' },
  { id: 2, label: 'T', name: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'W', name: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'T', name: 'Thu', full: 'Thursday' },
  { id: 5, label: 'F', name: 'Fri', full: 'Friday' },
  { id: 6, label: 'S', name: 'Sat', full: 'Saturday' },
  { id: 0, label: 'S', name: 'Sun', full: 'Sunday' },
];

/**
 * Returns a human-friendly string describing the recurrence interval.
 * e.g., "Daily", "Every 2 days", "Weekly on Mon, Wed", "Monthly (every 1 month)"
 */
export function getRecurrenceDescription(rule?: RecurrenceRule | null): string {
  if (!rule) return '';

  const { frequency, interval = 1, weekDays = [], endDate } = rule;
  let text = '';

  if (frequency === 'daily') {
    text = interval === 1 ? 'Repeats Daily' : `Repeats Every ${interval} Days`;
  } else if (frequency === 'weekly') {
    const base = interval === 1 ? 'Repeats Weekly' : `Repeats Every ${interval} Weeks`;
    if (weekDays.length > 0 && weekDays.length < 7) {
      const dayNames = weekDays
        .slice()
        .sort((a, b) => {
          // Mon=1 .. Sun=0, order nicely starting Mon (1..6, 0)
          const orderA = a === 0 ? 7 : a;
          const orderB = b === 0 ? 7 : b;
          return orderA - orderB;
        })
        .map(d => RECURRENCE_DAYS_OF_WEEK.find(item => item.id === d)?.name || '')
        .filter(Boolean);
      text = `${base} on ${dayNames.join(', ')}`;
    } else {
      text = base;
    }
  } else if (frequency === 'monthly') {
    text = interval === 1 ? 'Repeats Monthly' : `Repeats Every ${interval} Months`;
  }

  if (endDate) {
    try {
      const endD = new Date(endDate);
      if (isValid(endD)) {
        text += ` until ${format(endD, 'MMM d, yyyy')}`;
      }
    } catch {
      // ignore
    }
  }

  return text;
}

/**
 * Calculates the next due date timestamp (ISO string) based on the recurrence rule.
 * 
 * @param currentDueDate - The base due date ISO string (or empty if none)
 * @param rule - The recurrence rule definition
 * @returns ISO string of next due date, or null if rule has passed end date
 */
export function calculateNextDueDate(
  currentDueDate: string | undefined | null,
  rule: RecurrenceRule
): string | null {
  const baseDate = currentDueDate && isValid(parseISO(currentDueDate))
    ? parseISO(currentDueDate)
    : new Date();

  const interval = Math.max(1, rule.interval || 1);
  let nextDate: Date;

  if (rule.frequency === 'daily') {
    nextDate = addDays(baseDate, interval);
  } else if (rule.frequency === 'weekly') {
    if (rule.weekDays && rule.weekDays.length > 0) {
      // Find the next active day in the weekDays list
      const currentDay = baseDate.getDay();
      // Sort days in cycle starting from currentDay + 1
      let daysToAdd = 0;
      let found = false;

      for (let offset = 1; offset <= 7; offset++) {
        const targetDay = (currentDay + offset) % 7;
        if (rule.weekDays.includes(targetDay)) {
          daysToAdd = offset;
          found = true;
          break;
        }
      }

      if (found) {
        // If it wrapped around past a week and interval > 1, account for additional weeks
        if (interval > 1 && daysToAdd + currentDay >= 7) {
          nextDate = addWeeks(addDays(baseDate, daysToAdd), interval - 1);
        } else {
          nextDate = addDays(baseDate, daysToAdd);
        }
      } else {
        nextDate = addWeeks(baseDate, interval);
      }
    } else {
      nextDate = addWeeks(baseDate, interval);
    }
  } else if (rule.frequency === 'monthly') {
    nextDate = addMonths(baseDate, interval);
  } else {
    nextDate = addDays(baseDate, 1);
  }

  // Check end date restriction
  if (rule.endDate) {
    try {
      const endD = new Date(rule.endDate);
      if (isValid(endD) && nextDate.getTime() > endD.getTime()) {
        return null; // Past the recurrence end date
      }
    } catch {
      // continue
    }
  }

  return nextDate.toISOString();
}
