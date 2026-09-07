import type { TaskReminder, TimeReminder, LocationReminder, TimeReminderPreset } from '../types';
import { format, subMinutes, subHours, subDays, isSameDay } from 'date-fns';

export const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
  { id: 0, label: 'Sun', full: 'Sunday' },
];

/**
 * Calculates distance in meters between two GPS coordinates using the Haversine formula.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Geocodes an address string to { lat, lng } using OpenStreetMap Nominatim with safety fallback.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  if (!address || address.trim().length < 2) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim())}&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    }
  } catch (err) {
    console.warn('Geocoding lookup error:', err);
  }
  return null;
}

/**
 * Play a pleasant two-tone reminder chime using Web Audio API synthesis
 */
export function playReminderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Tone 1: Note 1 (D5 = 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Tone 2: Note 2 (A5 = 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.18);
    gain2.gain.setValueAtTime(0, now + 0.18);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.9);
  } catch (e) {
    console.warn('Could not play audio chime:', e);
  }
}

/**
 * Trigger a browser desktop notification if permission has been granted
 */
export async function triggerBrowserNotification(title: string, body: string, icon = '🔔') {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/vite.svg',
      });
    } catch {
      // Fallback in case of mobile browser restrictions
    }
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/vite.svg',
        });
      } catch {
        // Fallback
      }
    }
  }
}

/**
 * Calculates scheduled remindAt date string from a preset relative to task dueDate
 */
export function calculatePresetDate(dueDateIso: string, preset: TimeReminderPreset): string | null {
  if (!dueDateIso) return null;
  const dueDate = new Date(dueDateIso);
  if (isNaN(dueDate.getTime())) return null;

  switch (preset) {
    case 'at_time':
      return dueDate.toISOString();
    case '10m_before':
      return subMinutes(dueDate, 10).toISOString();
    case '30m_before':
      return subMinutes(dueDate, 30).toISOString();
    case '1h_before':
      return subHours(dueDate, 1).toISOString();
    case '1d_before':
      return subDays(dueDate, 1).toISOString();
    default:
      return dueDate.toISOString();
  }
}

/**
 * Generates concise user-friendly summary string for a task's reminder configuration
 */
export function getReminderSummary(reminder?: TaskReminder): {
  hasReminder: boolean;
  timeSummary?: string;
  locationSummary?: string;
} {
  if (!reminder) return { hasReminder: false };

  let timeSummary: string | undefined;
  let locationSummary: string | undefined;

  if (reminder.timeReminder?.enabled) {
    const tr = reminder.timeReminder;
    if (tr.repeatDays && tr.repeatDays.length > 0) {
      if (tr.repeatDays.length === 7) {
        timeSummary = `Every day at ${tr.time || '12:00'}`;
      } else if (tr.repeatDays.length === 5 && !tr.repeatDays.includes(0) && !tr.repeatDays.includes(6)) {
        timeSummary = `Weekdays at ${tr.time || '12:00'}`;
      } else {
        const dayLabels = tr.repeatDays
          .map(d => DAYS_OF_WEEK.find(x => x.id === d)?.label)
          .filter(Boolean)
          .join(', ');
        timeSummary = `${dayLabels} at ${tr.time || '12:00'}`;
      }
    } else if (tr.remindAt) {
      try {
        const d = new Date(tr.remindAt);
        if (!isNaN(d.getTime())) {
          timeSummary = format(d, 'MMM d, h:mm a');
        }
      } catch {
        timeSummary = 'Scheduled';
      }
    } else if (tr.preset) {
      timeSummary = `Reminder on due date (${tr.preset.replace('_', ' ')})`;
    }
  }

  if (reminder.locationReminder?.enabled && reminder.locationReminder.locationName) {
    const lr = reminder.locationReminder;
    const action = lr.triggerType === 'leave' ? 'When leaving' : 'When arriving at';
    const radius = lr.radiusMeters ? ` (${formatDistance(lr.radiusMeters)})` : '';
    locationSummary = `${action} ${lr.locationName}${radius}`;
  }

  return {
    hasReminder: Boolean(timeSummary || locationSummary),
    timeSummary,
    locationSummary,
  };
}
