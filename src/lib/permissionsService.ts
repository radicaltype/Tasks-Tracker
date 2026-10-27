export type PermissionStateValue = 'granted' | 'denied' | 'prompt' | 'unsupported';

export interface AppPermissionsState {
  notifications: PermissionStateValue;
  location: PermissionStateValue;
  microphone: PermissionStateValue;
  isAndroidBridgeAvailable: boolean;
  packageName?: string;
  sdkInt?: number;
}

interface AndroidPermissionsBridgeInterface {
  getPermissionsStatus: () => string;
  requestNotificationPermission: () => void;
  requestLocationPermission: () => void;
  requestMicrophonePermission: () => void;
  requestAllPermissions: () => void;
  openAppSettings: () => void;
  openAppNotificationSettings: () => void;
}

declare global {
  interface Window {
    AndroidPermissionsBridge?: AndroidPermissionsBridgeInterface;
  }
}

export function hasAndroidPermissionsBridge(): boolean {
  return typeof window !== 'undefined' && typeof window.AndroidPermissionsBridge !== 'undefined';
}

export async function queryAppPermissions(): Promise<AppPermissionsState> {
  const isAndroidBridgeAvailable = hasAndroidPermissionsBridge();

  // 1. If native Android bridge is present (Capacitor Android APK), read native OS permission states first
  if (isAndroidBridgeAvailable && window.AndroidPermissionsBridge) {
    try {
      const raw = window.AndroidPermissionsBridge.getPermissionsStatus();
      const parsed = JSON.parse(raw || '{}');
      return {
        notifications: parsed.notifications === 'granted' ? 'granted' : 'prompt',
        location: parsed.location === 'granted' ? 'granted' : 'prompt',
        microphone: parsed.microphone === 'granted' ? 'granted' : 'prompt',
        isAndroidBridgeAvailable: true,
        packageName: parsed.packageName || 'app.tasktracker',
        sdkInt: parsed.sdkInt,
      };
    } catch (err) {
      console.warn('Failed to parse AndroidPermissionsBridge status:', err);
    }
  }

  // 2. Standard Web / PWA Permissions API check
  let notifications: PermissionStateValue = 'unsupported';
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') notifications = 'granted';
    else if (Notification.permission === 'denied') notifications = 'denied';
    else notifications = 'prompt';
  }

  let location: PermissionStateValue = 'prompt';
  let microphone: PermissionStateValue = 'prompt';

  if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
    try {
      const geoStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      location = geoStatus.state as PermissionStateValue;
    } catch {
      location = 'geolocation' in navigator ? 'prompt' : 'unsupported';
    }

    try {
      const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      microphone = micStatus.state as PermissionStateValue;
    } catch {
      microphone = navigator.mediaDevices ? 'prompt' : 'unsupported';
    }
  }

  return {
    notifications,
    location,
    microphone,
    isAndroidBridgeAvailable,
    packageName: 'app.tasktracker',
  };
}

export async function requestNotificationsPermission(): Promise<PermissionStateValue> {
  if (hasAndroidPermissionsBridge() && window.AndroidPermissionsBridge) {
    try {
      window.AndroidPermissionsBridge.requestNotificationPermission();
    } catch (e) {
      console.warn('Android notification request error:', e);
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const res = await Notification.requestPermission();
      return res as PermissionStateValue;
    } catch {
      return Notification.permission as PermissionStateValue;
    }
  }

  const updated = await queryAppPermissions();
  return updated.notifications;
}

export async function requestLocationPermission(): Promise<PermissionStateValue> {
  if (hasAndroidPermissionsBridge() && window.AndroidPermissionsBridge) {
    try {
      window.AndroidPermissionsBridge.requestLocationPermission();
    } catch (e) {
      console.warn('Android location request error:', e);
    }
  }

  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('granted'),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            resolve('denied');
          } else {
            // Position unavailable / timeout still means permission wasn't blocked
            resolve('granted');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  return 'unsupported';
}

export async function requestMicrophonePermission(): Promise<PermissionStateValue> {
  if (hasAndroidPermissionsBridge() && window.AndroidPermissionsBridge) {
    try {
      window.AndroidPermissionsBridge.requestMicrophonePermission();
    } catch (e) {
      console.warn('Android microphone request error:', e);
    }
  }

  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch {
      return 'denied';
    }
  }

  const updated = await queryAppPermissions();
  return updated.microphone;
}

export async function requestAllAppPermissions(): Promise<AppPermissionsState> {
  if (hasAndroidPermissionsBridge() && window.AndroidPermissionsBridge) {
    try {
      window.AndroidPermissionsBridge.requestAllPermissions();
    } catch (e) {
      console.warn('Android requestAllPermissions error:', e);
    }
  }

  await requestNotificationsPermission();
  await requestLocationPermission();
  await requestMicrophonePermission();

  return queryAppPermissions();
}

export function openNativeAndroidAppSettings(): boolean {
  if (hasAndroidPermissionsBridge() && window.AndroidPermissionsBridge) {
    window.AndroidPermissionsBridge.openAppSettings();
    return true;
  }
  return false;
}

export function openNativeAndroidNotificationSettings(): boolean {
  if (hasAndroidPermissionsBridge() && window.AndroidPermissionsBridge) {
    window.AndroidPermissionsBridge.openAppNotificationSettings();
    return true;
  }
  return false;
}
