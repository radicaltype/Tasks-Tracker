import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  MapPin, 
  Clock, 
  Calendar, 
  Navigation, 
  Sparkles, 
  Volume2, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Repeat, 
  Info,
  Compass
} from 'lucide-react';
import type { TaskReminder, TimeReminderPreset } from '../types';
import { 
  DAYS_OF_WEEK, 
  geocodeAddress, 
  calculateDistance, 
  formatDistance, 
  playReminderChime, 
  triggerBrowserNotification 
} from '../lib/reminderUtils';
import { cn } from '../lib/utils';

interface ReminderFormSectionProps {
  reminder?: TaskReminder;
  taskDueDate?: string;
  taskLocation?: string;
  onChange: (updatedReminder: TaskReminder) => void;
  userCoords?: { lat: number; lng: number } | null;
}

export default function ReminderFormSection({
  reminder,
  taskDueDate,
  taskLocation,
  onChange,
  userCoords,
}: ReminderFormSectionProps) {
  // Time reminder state
  const [timeEnabled, setTimeEnabled] = useState(reminder?.timeReminder?.enabled || false);
  const [timeMode, setTimeMode] = useState<'preset' | 'custom' | 'repeating'>(() => {
    if (reminder?.timeReminder?.repeatDays && reminder.timeReminder.repeatDays.length > 0) {
      return 'repeating';
    }
    if (reminder?.timeReminder?.preset === 'custom' || (!reminder?.timeReminder?.preset && reminder?.timeReminder?.remindAt)) {
      return 'custom';
    }
    return 'preset';
  });
  const [preset, setPreset] = useState<TimeReminderPreset>(reminder?.timeReminder?.preset || 'at_time');
  const [customDate, setCustomDate] = useState(() => {
    if (reminder?.timeReminder?.remindAt) {
      try {
        return new Date(reminder.timeReminder.remindAt).toISOString().split('T')[0];
      } catch {
        return '';
      }
    }
    return '';
  });
  const [customTime, setCustomTime] = useState(() => {
    if (reminder?.timeReminder?.remindAt) {
      try {
        const d = new Date(reminder.timeReminder.remindAt);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } catch {
        return '09:00';
      }
    }
    return '09:00';
  });
  const [repeatDays, setRepeatDays] = useState<number[]>(reminder?.timeReminder?.repeatDays || [1, 2, 3, 4, 5]);
  const [repeatTime, setRepeatTime] = useState(reminder?.timeReminder?.time || '09:00');

  // Location reminder state
  const [locEnabled, setLocEnabled] = useState(reminder?.locationReminder?.enabled || false);
  const [locName, setLocName] = useState(reminder?.locationReminder?.locationName || taskLocation || '');
  const [locLat, setLocLat] = useState<number | undefined>(reminder?.locationReminder?.lat);
  const [locLng, setLocLng] = useState<number | undefined>(reminder?.locationReminder?.lng);
  const [radiusMeters, setRadiusMeters] = useState(reminder?.locationReminder?.radiusMeters || 300);
  const [triggerType, setTriggerType] = useState<'arrive' | 'leave'>(reminder?.locationReminder?.triggerType || 'arrive');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Sync back when taskLocation changes and no reminder location is set
  useEffect(() => {
    if (taskLocation && !locName) {
      setLocName(taskLocation);
    }
  }, [taskLocation]);

  // Propagate state changes to parent
  useEffect(() => {
    let remindAt: string | undefined;

    if (timeEnabled) {
      if (timeMode === 'preset') {
        if (taskDueDate) {
          try {
            const due = new Date(taskDueDate);
            if (preset === '10m_before') due.setMinutes(due.getMinutes() - 10);
            else if (preset === '30m_before') due.setMinutes(due.getMinutes() - 30);
            else if (preset === '1h_before') due.setHours(due.getHours() - 1);
            else if (preset === '1d_before') due.setDate(due.getDate() - 1);
            remindAt = due.toISOString();
          } catch {
            remindAt = taskDueDate;
          }
        }
      } else if (timeMode === 'custom' && customDate) {
        remindAt = customTime ? `${customDate}T${customTime}:00` : `${customDate}T09:00:00`;
      }
    }

    const updated: TaskReminder = {
      timeReminder: {
        enabled: timeEnabled,
        remindAt,
        time: timeMode === 'repeating' ? repeatTime : undefined,
        repeatDays: timeMode === 'repeating' ? repeatDays : undefined,
        preset: timeMode === 'preset' ? preset : 'custom',
        lastTriggered: reminder?.timeReminder?.lastTriggered,
        snoozedUntil: reminder?.timeReminder?.snoozedUntil,
      },
      locationReminder: {
        enabled: locEnabled,
        locationName: locName.trim(),
        lat: locLat,
        lng: locLng,
        radiusMeters,
        triggerType,
        lastTriggered: reminder?.locationReminder?.lastTriggered,
        snoozedUntil: reminder?.locationReminder?.snoozedUntil,
      },
    };

    onChange(updated);
  }, [
    timeEnabled,
    timeMode,
    preset,
    customDate,
    customTime,
    repeatDays,
    repeatTime,
    locEnabled,
    locName,
    locLat,
    locLng,
    radiusMeters,
    triggerType,
    taskDueDate,
  ]);

  // Handle Geocoding lookup
  const handleLookupCoordinates = async (addressToLookup?: string) => {
    const target = addressToLookup || locName;
    if (!target.trim()) return;
    setIsGeocoding(true);
    try {
      const res = await geocodeAddress(target);
      if (res) {
        setLocLat(res.lat);
        setLocLng(res.lng);
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle GPS button (Use current position)
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocLat(pos.coords.latitude);
          setLocLng(pos.coords.longitude);
          if (!locName) {
            setLocName('Current Location');
          }
        },
        (err) => {
          console.warn('GPS location error:', err);
        }
      );
    }
  };

  const handleToggleDay = (dayId: number) => {
    if (repeatDays.includes(dayId)) {
      if (repeatDays.length > 1) {
        setRepeatDays(repeatDays.filter(d => d !== dayId));
      }
    } else {
      setRepeatDays([...repeatDays, dayId].sort());
    }
  };

  const handleTestAlert = () => {
    playReminderChime();
    triggerBrowserNotification('🔔 Reminder Test', 'Your task reminders are working smoothly!');
    setTestSuccess(true);
    setTimeout(() => setTestSuccess(false), 2500);
  };

  // Calculate live distance from user coords
  const currentDistance = (userCoords && locLat && locLng)
    ? calculateDistance(userCoords.lat, userCoords.lng, locLat, locLng)
    : null;

  return (
    <div className="space-y-4 pt-2 border-t border-neutral-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
            <Bell size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Smart Task Reminders
            </h3>
            <p className="text-[10px] text-neutral-400 font-medium">
              Time, day of week & location-based alerts
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestAlert}
          className="flex items-center gap-1 text-[10px] font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded-lg transition-colors"
          title="Play sample chime and trigger test notification"
        >
          {testSuccess ? <Check size={12} className="text-emerald-600" /> : <Volume2 size={12} />}
          <span>{testSuccess ? 'Chime Played!' : 'Test Alert'}</span>
        </button>
      </div>

      {/* 1. TIME & DAY REMINDERS SECTION */}
      <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            <span className="text-xs font-bold text-neutral-800">Time & Day Reminder</span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={timeEnabled}
              onChange={(e) => setTimeEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {timeEnabled && (
          <div className="space-y-3 pt-2 border-t border-neutral-200/60 animate-in fade-in duration-150">
            {/* Mode Selector */}
            <div className="grid grid-cols-3 gap-1 bg-neutral-200/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTimeMode('preset')}
                className={cn(
                  "py-1 text-[11px] font-bold rounded-lg transition-all",
                  timeMode === 'preset' ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
                )}
              >
                Due Presets
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('custom')}
                className={cn(
                  "py-1 text-[11px] font-bold rounded-lg transition-all",
                  timeMode === 'custom' ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
                )}
              >
                Specific Date
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('repeating')}
                className={cn(
                  "py-1 text-[11px] font-bold rounded-lg transition-all",
                  timeMode === 'repeating' ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500"
                )}
              >
                Repeat Days
              </button>
            </div>

            {/* PRESET MODE */}
            {timeMode === 'preset' && (
              <div className="space-y-2">
                {!taskDueDate && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-1.5">
                    <Info size={13} className="shrink-0" />
                    <span>Set a Due Date above to calculate relative reminder offsets.</span>
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'at_time', label: 'At due time' },
                    { id: '10m_before', label: '10 mins before' },
                    { id: '30m_before', label: '30 mins before' },
                    { id: '1h_before', label: '1 hour before' },
                    { id: '1d_before', label: '1 day before' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreset(p.id as TimeReminderPreset)}
                      className={cn(
                        "py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between",
                        preset === p.id 
                          ? "bg-blue-50 border-blue-300 text-blue-800 font-bold shadow-2xs" 
                          : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                      )}
                    >
                      <span>{p.label}</span>
                      {preset === p.id && <Check size={13} className="text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SPECIFIC DATE & TIME MODE */}
            {timeMode === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 mb-1 block">Reminder Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full text-xs bg-white p-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 mb-1 block">Time</label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full text-xs bg-white p-2 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>
            )}

            {/* REPEATING DAYS OF WEEK MODE */}
            {timeMode === 'repeating' && (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-neutral-400 mb-1 block">
                    Select Days of Week
                  </label>
                  <div className="flex items-center justify-between gap-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = repeatDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => handleToggleDay(day.id)}
                          className={cn(
                            "w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center",
                            isSelected
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100"
                          )}
                          title={day.full}
                        >
                          {day.label[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRepeatDays([1, 2, 3, 4, 5])}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100"
                    >
                      Weekdays
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepeatDays([0, 1, 2, 3, 4, 5, 6])}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100"
                    >
                      Every Day
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">At</span>
                    <input
                      type="time"
                      value={repeatTime}
                      onChange={(e) => setRepeatTime(e.target.value)}
                      className="text-xs bg-white px-2 py-1 rounded-lg border border-neutral-200 font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. LOCATION REMINDERS SECTION */}
      <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-orange-500" />
            <span className="text-xs font-bold text-neutral-800">Location Geofence Alert</span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={locEnabled}
              onChange={(e) => setLocEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
          </label>
        </div>

        {locEnabled && (
          <div className="space-y-3 pt-2 border-t border-neutral-200/60 animate-in fade-in duration-150">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Reminder Location / Address
                </label>
                <div className="flex items-center gap-1">
                  {taskLocation && taskLocation !== locName && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocName(taskLocation);
                        handleLookupCoordinates(taskLocation);
                      }}
                      className="text-[10px] font-bold text-orange-600 hover:underline"
                    >
                      Use task location
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="text-[10px] font-bold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 px-1.5 py-0.5 rounded flex items-center gap-1"
                    title="Pin my current GPS position"
                  >
                    <Navigation size={10} />
                    <span>My GPS</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="E.g. Supermarket, 123 Main St, Office..."
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  onBlur={() => handleLookupCoordinates()}
                  className="flex-1 text-xs bg-white p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-neutral-900"
                />
                <button
                  type="button"
                  onClick={() => handleLookupCoordinates()}
                  disabled={!locName.trim() || isGeocoding}
                  className="px-2.5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 disabled:bg-neutral-200 transition-colors"
                  title="Geocode address coordinates"
                >
                  {isGeocoding ? '...' : <Compass size={14} />}
                </button>
              </div>
            </div>

            {/* Coordinates & Proximity Status */}
            <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-neutral-100">
              <div className="flex items-center gap-1 text-neutral-600">
                {locLat && locLng ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Check size={12} />
                    <span>GPS Pinned ({locLat.toFixed(3)}, {locLng.toFixed(3)})</span>
                  </span>
                ) : (
                  <span className="text-neutral-400 italic">
                    Type address or tap "My GPS" to pin coordinates
                  </span>
                )}
              </div>

              {currentDistance !== null && (
                <span className="font-bold text-orange-600">
                  {formatDistance(currentDistance)} away
                </span>
              )}
            </div>

            {/* Trigger Type & Radius */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 mb-1 block">Trigger Event</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as 'arrive' | 'leave')}
                  className="w-full text-xs bg-white p-2 rounded-xl border border-neutral-200 font-semibold focus:outline-none"
                >
                  <option value="arrive">When I Arrive</option>
                  <option value="leave">When I Leave</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-neutral-400 mb-1 block">Alert Radius</label>
                <select
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full text-xs bg-white p-2 rounded-xl border border-neutral-200 font-semibold focus:outline-none"
                >
                  <option value={100}>100 meters (Nearby)</option>
                  <option value={300}>300 meters (Standard)</option>
                  <option value={500}>500 meters (Neighborhood)</option>
                  <option value={1000}>1 kilometer (Area)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
