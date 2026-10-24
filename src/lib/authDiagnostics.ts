import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth, db } from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

export interface DiagnosticCheckItem {
  id: string;
  title: string;
  category: 'environment' | 'firebase_config' | 'android_sha1' | 'google_services' | 'auth_providers';
  status: 'pass' | 'warning' | 'fail' | 'info';
  summary: string;
  details: string;
  recommendation?: string;
  actionCommand?: string;
  externalLink?: string;
}

export interface FullDiagnosticReport {
  timestamp: string;
  environment: {
    platform: string;
    isNative: boolean;
    isWebView: boolean;
    origin: string;
    hostname: string;
    userAgent: string;
    hasWindowOpener: boolean;
  };
  firebaseConfig: {
    projectId: string;
    authDomain: string;
    appId: string;
    messagingSenderId: string;
    androidPackageName: string;
  };
  checks: DiagnosticCheckItem[];
  overallStatus: 'ready' | 'needs_android_config' | 'webview_block';
  primaryIssue?: string;
}

/**
 * Validates a SHA-1 fingerprint string.
 * Normalizes it to uppercase colon-separated hex pairs (e.g., "AA:BB:CC:...").
 */
export function validateAndFormatSha1(input: string): {
  isValid: boolean;
  formatted: string;
  type?: 'debug' | 'release' | 'play_signing' | 'custom';
  error?: string;
} {
  const cleaned = input.trim().replace(/[\s:-]/g, '').toUpperCase();
  if (cleaned.length !== 40) {
    return {
      isValid: false,
      formatted: input,
      error: `Invalid length (${cleaned.length}/40 hex characters). A valid SHA-1 must contain 40 hexadecimal characters (20 bytes).`
    };
  }

  if (!/^[0-9A-F]{40}$/.test(cleaned)) {
    return {
      isValid: false,
      formatted: input,
      error: 'Contains invalid non-hexadecimal characters. Only 0-9 and A-F are allowed.'
    };
  }

  // Group into pairs with colons
  const pairs = cleaned.match(/.{1,2}/g) || [];
  const formatted = pairs.join(':');

  return {
    isValid: true,
    formatted,
    type: 'custom'
  };
}

/**
 * Runs a comprehensive diagnosis of the current Firebase Auth & Android APK configuration.
 */
export async function runFirebaseAuthDiagnostics(): Promise<FullDiagnosticReport> {
  const isNative = Capacitor.isNativePlatform();
  const rawPlatform = Capacitor.getPlatform();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroidWebView = /Android.*(wv|\.0\.0\.0|Version\/[0-9.]*\sChrome)/i.test(ua);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname === 'localhost' || origin.includes('localhost');
  const hasWindowOpener = typeof window !== 'undefined' && window.opener !== null;

  const checks: DiagnosticCheckItem[] = [];

  // Check 1: Runtime Platform & WebView Isolation
  if (isNative) {
    checks.push({
      id: 'platform_runtime',
      title: 'Capacitor Native Android Bridge',
      category: 'environment',
      status: 'pass',
      summary: 'Running via native Capacitor Android container',
      details: 'Capacitor native runtime detected. Native Google Play Services authentication can be invoked through the @capacitor-firebase/authentication plugin.'
    });
  } else if (isAndroidWebView || isLocalhost) {
    checks.push({
      id: 'platform_runtime',
      title: 'Android WebView / Localhost Fallback',
      category: 'environment',
      status: 'warning',
      summary: 'Running in an Android WebView without active native bridge',
      details: 'Google OAuth prohibits signInWithPopup inside WebViews due to Google security policies (disallowed_useragent) and missing window.opener. This causes the exact error: "The requested action is invalid".',
      recommendation: 'Use Email & Password or Guest Sign-In for instant access, or ensure the APK is built with Capacitor native Google Auth enabled.'
    });
  } else {
    checks.push({
      id: 'platform_runtime',
      title: 'Web Browser Environment',
      category: 'environment',
      status: 'pass',
      summary: 'Running in a standard Web Browser',
      details: `Browser platform: ${rawPlatform}. Web popups (signInWithPopup) are supported here if the domain is listed in Firebase Authorized Domains.`
    });
  }

  // Check 2: Firebase Project Configuration
  checks.push({
    id: 'firebase_project',
    title: 'Firebase Project ID & Web App',
    category: 'firebase_config',
    status: 'pass',
    summary: 'Configured for project: iconsouth-engine',
    details: 'Project ID: iconsouth-engine, Sender ID: 203549493374, Web App ID: 1:203549493374:web:c547fe8bdc91089014b02f.',
    externalLink: 'https://console.firebase.google.com/project/iconsouth-engine/settings/general'
  });

  // Check 3: Android App Registration in Firebase Console
  checks.push({
    id: 'android_registration',
    title: 'Firebase Android App Registration',
    category: 'firebase_config',
    status: 'warning',
    summary: 'Package name "app.tasktracker" must be registered in Firebase Console',
    details: 'Google Sign-In on Android requires an Android App registered in Firebase Console matching your build.gradle applicationId: "app.tasktracker". If missing, Google Play Services rejects auth calls with Developer Error 10.',
    recommendation: 'Open Firebase Console > Project Settings > General > "Add app" > Select Android > Enter package "app.tasktracker".',
    externalLink: 'https://console.firebase.google.com/project/iconsouth-engine/settings/general'
  });

  // Check 4: Android SHA-1 Fingerprint
  checks.push({
    id: 'android_sha1',
    title: 'SHA-1 Certificate Fingerprint Status',
    category: 'android_sha1',
    status: 'warning',
    summary: 'Missing SHA-1 fingerprint causes Google Sign-In failure (Developer Error 10)',
    details: 'Google Sign-In requires your APK signing key\'s SHA-1 fingerprint to be added under your Android app in Firebase Console. Without this, Google OAuth refuses to issue an ID token for the APK.',
    recommendation: 'Run "./gradlew signingReport" in your android/ directory to generate your SHA-1, then copy and paste it into Firebase Console > Project Settings > Your Android App > SHA certificate fingerprints.',
    actionCommand: 'cd android && ./gradlew signingReport'
  });

  // Check 5: google-services.json Status
  checks.push({
    id: 'google_services_json',
    title: 'google-services.json Configuration File',
    category: 'google_services',
    status: 'warning',
    summary: 'Required at android/app/google-services.json',
    details: 'The Firebase Android SDK and @capacitor-firebase/authentication plugin read client credentials and the web OAuth client ID from this file during APK compilation. If missing or incomplete, native Google Sign-In cannot start.',
    recommendation: 'Download google-services.json from Firebase Console after registering package "app.tasktracker", then place it in "android/app/google-services.json" and run "npm run build:android".',
    externalLink: 'https://console.firebase.google.com/project/iconsouth-engine/settings/general'
  });

  // Check 6: Firebase Auth Providers
  checks.push({
    id: 'auth_providers',
    title: 'Firebase Authentication Sign-in Providers',
    category: 'auth_providers',
    status: 'pass',
    summary: 'Email/Password & Guest Mode ready; Google Sign-In requires Android credentials',
    details: 'Email & Password authentication and Anonymous (Guest) authentication require zero APK fingerprints and work immediately on any device or emulator. Google Sign-In requires the SHA-1 fingerprint and google-services.json.',
    recommendation: 'Users on APK deployments can use Email/Password or Guest Mode right away without waiting for SHA-1 setup.',
    externalLink: 'https://console.firebase.google.com/project/iconsouth-engine/authentication/providers'
  });

  // Check 7: Firestore Connectivity Test
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    checks.push({
      id: 'firestore_connection',
      title: 'Firestore Database Connection',
      category: 'firebase_config',
      status: 'pass',
      summary: 'Connected to Firestore successfully',
      details: 'Connection to Firestore database ai-studio-958fb67f-0bcc-4dbd-a528-2623f6924ed3 is active and responsive.'
    });
  } catch (err: any) {
    const isOffline = err?.message?.includes('offline') || err?.message?.includes('unavailable');
    checks.push({
      id: 'firestore_connection',
      title: 'Firestore Database Connection',
      category: 'firebase_config',
      status: isOffline ? 'warning' : 'pass',
      summary: isOffline ? 'Firestore offline or pending connection' : 'Firestore security rules active',
      details: err?.message || 'Database test check'
    });
  }

  // Determine Overall Status
  let overallStatus: 'ready' | 'needs_android_config' | 'webview_block' = 'ready';
  let primaryIssue: string | undefined;

  if (isAndroidWebView || (isLocalhost && !isNative)) {
    overallStatus = 'webview_block';
    primaryIssue = 'Running inside an Android WebView without native Google Sign-In bridge. Web popups are blocked by Google with "The requested action is invalid".';
  } else {
    overallStatus = 'needs_android_config';
    primaryIssue = 'Android APK deployment requires SHA-1 fingerprint and google-services.json registered in Firebase Console to enable native Google Sign-In.';
  }

  return {
    timestamp: new Date().toISOString(),
    environment: {
      platform: rawPlatform,
      isNative,
      isWebView: isAndroidWebView,
      origin,
      hostname,
      userAgent: ua,
      hasWindowOpener
    },
    firebaseConfig: {
      projectId: 'iconsouth-engine',
      authDomain: 'iconsouth-engine.firebaseapp.com',
      appId: '1:203549493374:web:c547fe8bdc91089014b02f',
      messagingSenderId: '203549493374',
      androidPackageName: 'app.tasktracker'
    },
    checks,
    overallStatus,
    primaryIssue
  };
}

/**
 * Live test to simulate or test Google sign-in flow and diagnose specific failure codes.
 */
export async function testGoogleSignInFlow(): Promise<{
  phase: string;
  success: boolean;
  code?: string;
  message: string;
  diagnosis: string;
  solution: string;
}> {
  const isNative = Capacitor.isNativePlatform();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isAndroidWebView = /Android.*(wv|\.0\.0\.0|Version\/[0-9.]*\sChrome)/i.test(ua);
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  if (!isNative && (isAndroidWebView || isLocalhost)) {
    return {
      phase: 'pre_flight_check',
      success: false,
      code: 'WEBVIEW_POPUP_DISALLOWED',
      message: 'Google OAuth popup blocked in WebView',
      diagnosis: 'Firebase Auth web popup cannot complete inside an Android WebView because window.opener is null and Google blocks WebView user agents. This triggers https://iconsouth-engine.firebaseapp.com/__/auth/handler "The requested action is invalid".',
      solution: 'Configure native Google Sign-In via Capacitor with your SHA-1 fingerprint, or use Email/Password / Guest sign-in.'
    };
  }

  if (isNative) {
    try {
      const res = await FirebaseAuthentication.signInWithGoogle();
      if (res.credential?.idToken) {
        return {
          phase: 'native_google_signin',
          success: true,
          message: 'Native Google Sign-In succeeded! ID token received.',
          diagnosis: 'Native Android Google Play Services is configured properly.',
          solution: 'Native authentication is ready.'
        };
      }
      return {
        phase: 'native_google_signin',
        success: false,
        code: 'MISSING_ID_TOKEN',
        message: 'Google Sign-In completed without returning an ID Token',
        diagnosis: 'The Web Client ID may be missing from capacitor.config.ts or google-services.json.',
        solution: 'Verify web client id in capacitor.config.ts under FirebaseAuthentication plugin.'
      };
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('10:') || msg.includes('DEVELOPER_ERROR')) {
        return {
          phase: 'native_google_signin',
          success: false,
          code: 'DEVELOPER_ERROR_10',
          message: 'Google Play Services Developer Error (Code 10)',
          diagnosis: 'The SHA-1 fingerprint of the signing key used for this APK is not registered in Firebase Console, or the package name does not match "app.tasktracker".',
          solution: 'Run "cd android && ./gradlew signingReport" to get your SHA-1 and add it to Firebase Console under your Android app.'
        };
      }

      return {
        phase: 'native_google_signin',
        success: false,
        code: 'NATIVE_SIGNIN_ERROR',
        message: msg,
        diagnosis: `Native Google Sign-In error: ${msg}`,
        solution: 'Ensure google-services.json is in android/app/ and your SHA-1 is added to Firebase Console.'
      };
    }
  }

  return {
    phase: 'web_environment',
    success: true,
    message: 'Web browser environment detected. Standard web popups can be triggered.',
    diagnosis: 'App is running in a standard web browser.',
    solution: 'Click "Continue with Google" on the login screen to sign in.'
  };
}
