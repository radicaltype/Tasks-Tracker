import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  MapPin,
  Mic,
  CheckCircle2,
  AlertCircle,
  Settings,
  RefreshCw,
  X,
  Smartphone,
  ShieldCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  queryAppPermissions,
  requestNotificationsPermission,
  requestLocationPermission,
  requestMicrophonePermission,
  requestAllAppPermissions,
  openNativeAndroidAppSettings,
  openNativeAndroidNotificationSettings,
  type AppPermissionsState,
  type PermissionStateValue,
} from '../lib/permissionsService';
import { playReminderChime, triggerBrowserNotification } from '../lib/reminderUtils';
import { cn } from '../lib/utils';

interface AppPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppPermissionsModal({ isOpen, onClose }: AppPermissionsModalProps) {
  const [permState, setPermState] = useState<AppPermissionsState>({
    notifications: 'prompt',
    location: 'prompt',
    microphone: 'prompt',
    isAndroidBridgeAvailable: false,
    packageName: 'app.tasktracker',
  });
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshPermissions = useCallback(async () => {
    const next = await queryAppPermissions();
    setPermState(next);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshPermissions();

    const handleAndroidPermEvent = () => {
      refreshPermissions();
    };
    window.addEventListener('androidPermissionsUpdated', handleAndroidPermEvent);
    return () => {
      window.removeEventListener('androidPermissionsUpdated', handleAndroidPermEvent);
    };
  }, [isOpen, refreshPermissions]);

  if (!isOpen) return null;

  const handleRequestNotifications = async () => {
    setLoadingKey('notifications');
    setStatusMessage(null);
    try {
      const res = await requestNotificationsPermission();
      await refreshPermissions();
      if (res === 'granted') {
        playReminderChime();
        triggerBrowserNotification('Notifications Enabled', 'Task reminders & alerts are active!');
        setStatusMessage('Notifications permission granted! Test notification sent.');
      } else if (res === 'denied') {
        setStatusMessage('Notifications blocked by device/browser. Use Android App Info -> Notifications to enable.');
      }
    } finally {
      setLoadingKey(null);
    }
  };

  const handleRequestLocation = async () => {
    setLoadingKey('location');
    setStatusMessage(null);
    try {
      const res = await requestLocationPermission();
      await refreshPermissions();
      if (res === 'granted') {
        setStatusMessage('GPS Location permission granted! Geofence arrival/departure alerts are active.');
      } else if (res === 'denied') {
        setStatusMessage('Location blocked. Open Android App Info -> Permissions -> Location to allow.');
      }
    } finally {
      setLoadingKey(null);
    }
  };

  const handleRequestMicrophone = async () => {
    setLoadingKey('microphone');
    setStatusMessage(null);
    try {
      const res = await requestMicrophonePermission();
      await refreshPermissions();
      if (res === 'granted') {
        setStatusMessage('Microphone permission granted! Voice task dictation is ready.');
      } else if (res === 'denied') {
        setStatusMessage('Microphone blocked. Open Android App Info -> Permissions -> Microphone to allow.');
      }
    } finally {
      setLoadingKey(null);
    }
  };

  const handleRequestAll = async () => {
    setLoadingKey('all');
    setStatusMessage(null);
    try {
      await requestAllAppPermissions();
      await refreshPermissions();
      setStatusMessage('Requested all app permissions (Notifications, Location, Microphone).');
    } finally {
      setLoadingKey(null);
    }
  };

  const renderBadge = (state: PermissionStateValue) => {
    if (state === 'granted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={11} />
          <span>Allowed</span>
        </span>
      );
    }
    if (state === 'denied') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
          <AlertCircle size={11} />
          <span>Blocked</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <span>Not Yet Allowed</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">App Permissions &amp; Alerts</h2>
              <p className="text-[11px] text-neutral-400">
                Notifications, GPS Location, Microphone &amp; Alarms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-left">
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start justify-between gap-2">
              <span>{statusMessage}</span>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                className="text-emerald-700 hover:text-emerald-950 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Quick Request All Bar */}
          <div className="flex items-center justify-between gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200/80">
            <div>
              <p className="text-xs font-bold text-neutral-900">Enable All App Permissions</p>
              <p className="text-[11px] text-neutral-500">
                Prompts Android / Browser for Notifications, GPS &amp; Mic
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={refreshPermissions}
                className="p-2 rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                title="Refresh permission status"
              >
                <RefreshCw size={14} />
              </button>
              <button
                type="button"
                onClick={handleRequestAll}
                disabled={loadingKey !== null}
                className="px-3 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {loadingKey === 'all' ? 'Requesting...' : 'Allow All'}
              </button>
            </div>
          </div>

          {/* Individual Permission Cards */}
          <div className="space-y-2.5">
            {/* 1. Notifications */}
            <div className="p-3.5 rounded-2xl border border-neutral-200 bg-white flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                  <Bell size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-neutral-900">Notifications</span>
                    {renderBadge(permState.notifications)}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                    Required for scheduled due-date alerts, repeating reminders &amp; chime notifications.
                  </p>
                  <code className="text-[10px] text-neutral-400 font-mono block mt-1">
                    android.permission.POST_NOTIFICATIONS
                  </code>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestNotifications}
                disabled={loadingKey !== null}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors",
                  permState.notifications === 'granted'
                    ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {loadingKey === 'notifications'
                  ? '...'
                  : permState.notifications === 'granted'
                    ? 'Test'
                    : 'Allow'}
              </button>
            </div>

            {/* 2. Location / GPS */}
            <div className="p-3.5 rounded-2xl border border-neutral-200 bg-white flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-600 shrink-0 mt-0.5">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-neutral-900">Location (Fine &amp; Background GPS)</span>
                    {renderBadge(permState.location)}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                    Required for arrival &amp; departure geofence task reminders and live distance tracking.
                  </p>
                  <code className="text-[10px] text-neutral-400 font-mono block mt-1">
                    ACCESS_FINE_LOCATION · ACCESS_BACKGROUND_LOCATION
                  </code>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestLocation}
                disabled={loadingKey !== null}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors",
                  permState.location === 'granted'
                    ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                )}
              >
                {loadingKey === 'location'
                  ? '...'
                  : permState.location === 'granted'
                    ? 'Refresh'
                    : 'Allow'}
              </button>
            </div>

            {/* 3. Microphone */}
            <div className="p-3.5 rounded-2xl border border-neutral-200 bg-white flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0 mt-0.5">
                  <Mic size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-neutral-900">Microphone (Voice Input)</span>
                    {renderBadge(permState.microphone)}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                    Used for hands-free voice dictation when creating tasks or notes.
                  </p>
                  <code className="text-[10px] text-neutral-400 font-mono block mt-1">
                    android.permission.RECORD_AUDIO
                  </code>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestMicrophone}
                disabled={loadingKey !== null}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors",
                  permState.microphone === 'granted'
                    ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                )}
              >
                {loadingKey === 'microphone'
                  ? '...'
                  : permState.microphone === 'granted'
                    ? 'Verified'
                    : 'Allow'}
              </button>
            </div>

            {/* 4. Exact Alarms & Vibration */}
            <div className="p-3.5 rounded-2xl border border-neutral-200 bg-white flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 mt-0.5">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-neutral-900">Alarms, Reminders &amp; Vibration</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 size={11} />
                      <span>Declared in Manifest</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                    Enables exact scheduled task timers, boot recovery, and vibration feedback.
                  </p>
                  <code className="text-[10px] text-neutral-400 font-mono block mt-1">
                    SCHEDULE_EXACT_ALARM · VIBRATE · WAKE_LOCK
                  </code>
                </div>
              </div>
            </div>
          </div>

          {/* Native Android App Info Deep-Link Buttons */}
          {permState.isAndroidBridgeAvailable && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => openNativeAndroidAppSettings()}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
              >
                <Settings size={14} />
                <span>Open App Info</span>
                <ExternalLink size={11} />
              </button>
              <button
                type="button"
                onClick={() => openNativeAndroidNotificationSettings()}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-bold hover:bg-neutral-200 transition-colors"
              >
                <Bell size={14} />
                <span>Notification Settings</span>
              </button>
            </div>
          )}

          {/* Android APK Manifest Info Note */}
          <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Smartphone size={14} className="text-amber-700 shrink-0" />
              <span>Using the Installed Android APK?</span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Android populates <strong>Settings &rarr; Apps &rarr; Tasks Tracker &rarr; Permissions</strong> from{' '}
              <code className="font-mono bg-amber-100 px-1 rounded">AndroidManifest.xml</code> when the APK is built.
              If you installed an older APK build where permissions showed &ldquo;No permissions requested&rdquo;,
              rebuild &amp; install the latest APK (or convert via Capacitor) so Android lists{' '}
              <strong>Notifications, Location, Microphone, and Alarms &amp; reminders</strong> in App Info.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
