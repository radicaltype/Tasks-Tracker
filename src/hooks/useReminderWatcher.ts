import { useState, useEffect, useRef, useCallback } from 'react';
import type { Task } from '../types';
import type { ActiveAlert } from '../components/ReminderAlertModal';
import { 
  calculateDistance, 
  formatDistance, 
  playReminderChime, 
  triggerBrowserNotification 
} from '../lib/reminderUtils';

interface UseReminderWatcherOptions {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

export function useReminderWatcher({ tasks, onUpdateTask }: UseReminderWatcherOptions) {
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  
  // Track triggered keys in local memory so we don't spam repeated alerts within the same minute/session
  const triggeredTimeKeysRef = useRef<Set<string>>(new Set());
  const triggeredLocKeysRef = useRef<Set<string>>(new Set());
  const prevDistancesRef = useRef<Record<string, number>>({});

  // 1. Geolocation Watcher
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsActive(true);
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        setGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 2. Periodic Time & Day Reminders Evaluator (runs every 10s)
  useEffect(() => {
    const checkTimeReminders = () => {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ...
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentHM = `${currentHours}:${currentMinutes}`;
      const nowMs = now.getTime();

      for (const task of tasks) {
        if (task.completed) continue;
        const reminder = task.reminder;
        if (!reminder?.timeReminder?.enabled) continue;

        const tr = reminder.timeReminder;

        // Check if snoozed
        if (tr.snoozedUntil) {
          const snoozeMs = new Date(tr.snoozedUntil).getTime();
          if (nowMs < snoozeMs) continue;
        }

        // Case A: Specific remindAt date-time
        if (tr.remindAt) {
          const targetDate = new Date(tr.remindAt);
          const targetMs = targetDate.getTime();
          // Trigger if within 30 minutes in the past and not yet triggered today
          const isDue = nowMs >= targetMs && (nowMs - targetMs) < 30 * 60 * 1000;
          const triggerKey = `${task.id}_time_${tr.remindAt}`;

          if (isDue && !triggeredTimeKeysRef.current.has(triggerKey)) {
            triggeredTimeKeysRef.current.add(triggerKey);

            playReminderChime();
            triggerBrowserNotification(
              `🔔 Task Reminder: ${task.title}`,
              task.description ? task.description : 'It is time to work on this task!'
            );

            setActiveAlert({
              task,
              type: 'time',
              message: `Scheduled reminder reached for "${task.title}"`,
            });
            break;
          }
        }

        // Case B: Repeating Day of week + Time
        if (tr.repeatDays && tr.repeatDays.includes(currentDay) && tr.time === currentHM) {
          const todayDateStr = now.toISOString().split('T')[0];
          const triggerKey = `${task.id}_repeat_${todayDateStr}_${currentHM}`;

          if (!triggeredTimeKeysRef.current.has(triggerKey)) {
            triggeredTimeKeysRef.current.add(triggerKey);

            playReminderChime();
            triggerBrowserNotification(
              `🔔 Repeating Task Reminder: ${task.title}`,
              `Scheduled for today at ${tr.time}`
            );

            setActiveAlert({
              task,
              type: 'time',
              message: `Repeating schedule for today at ${tr.time}`,
            });
            break;
          }
        }
      }
    };

    checkTimeReminders();
    const interval = setInterval(checkTimeReminders, 10000);
    return () => clearInterval(interval);
  }, [tasks]);

  // 3. Location Reminders Evaluator (runs when user coordinates update)
  useEffect(() => {
    if (!userCoords) return;

    for (const task of tasks) {
      if (task.completed) continue;
      const lr = task.reminder?.locationReminder;
      if (!lr?.enabled || !lr.lat || !lr.lng) continue;

      const dist = calculateDistance(userCoords.lat, userCoords.lng, lr.lat, lr.lng);
      const radius = lr.radiusMeters || 300;
      const prevDist = prevDistancesRef.current[task.id];
      prevDistancesRef.current[task.id] = dist;

      const isInside = dist <= radius;
      const triggerKey = `${task.id}_loc_${lr.triggerType}_${lr.locationName}`;

      if (lr.triggerType === 'arrive') {
        if (isInside && !triggeredLocKeysRef.current.has(triggerKey)) {
          triggeredLocKeysRef.current.add(triggerKey);

          playReminderChime();
          triggerBrowserNotification(
            `📍 Arrived near ${lr.locationName}`,
            `Task: ${task.title} (within ${formatDistance(dist)})`
          );

          setActiveAlert({
            task,
            type: 'location',
            message: `You arrived near "${lr.locationName}" (${formatDistance(dist)} away)`,
          });
          break;
        }
      } else if (lr.triggerType === 'leave') {
        // Triggered when leaving if previously inside radius
        if (prevDist !== undefined && prevDist <= radius && dist > radius && !triggeredLocKeysRef.current.has(triggerKey)) {
          triggeredLocKeysRef.current.add(triggerKey);

          playReminderChime();
          triggerBrowserNotification(
            `📍 Leaving ${lr.locationName}`,
            `Task: ${task.title}`
          );

          setActiveAlert({
            task,
            type: 'location',
            message: `You just left the area of "${lr.locationName}"`,
          });
          break;
        }
      }
    }
  }, [userCoords, tasks]);

  const handleDismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const handleSnoozeAlert = useCallback((minutes: number) => {
    if (!activeAlert) return;
    const task = activeAlert.task;
    const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();

    if (activeAlert.type === 'time' && task.reminder?.timeReminder) {
      onUpdateTask(task.id, {
        reminder: {
          ...task.reminder,
          timeReminder: {
            ...task.reminder.timeReminder,
            snoozedUntil: snoozeUntil,
          },
        },
      });
    } else if (activeAlert.type === 'location' && task.reminder?.locationReminder) {
      onUpdateTask(task.id, {
        reminder: {
          ...task.reminder,
          locationReminder: {
            ...task.reminder.locationReminder,
            snoozedUntil: snoozeUntil,
          },
        },
      });
    }

    setActiveAlert(null);
  }, [activeAlert, onUpdateTask]);

  return {
    activeAlert,
    userCoords,
    gpsActive,
    handleDismissAlert,
    handleSnoozeAlert,
  };
}
