import { 
  signInWithPopup, 
  signInWithCredential, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  User 
} from 'firebase/auth';
import { auth } from './firebase';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export interface AuthDiagnosticInfo {
  packageName: string;
  isNative: boolean;
  isWebView: boolean;
  platform: string;
  isConfigIssue: boolean;
  solutionSteps: string[];
}

export interface SignInOutcome {
  success: boolean;
  user?: User;
  error?: string;
  diagnostic?: AuthDiagnosticInfo;
}

export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Detects if the app is currently running inside an Android WebView or APK environment
 * where web-based OAuth popups are blocked by Google / missing window.opener.
 */
export function isWebViewEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.isNativePlatform()) return true;
  const ua = navigator.userAgent || '';
  const isAndroidWebView = /Android.*(wv|\.0\.0\.0|Version\/[0-9.]*\sChrome)/i.test(ua);
  const isLocalhostOrigin = window.location.hostname === 'localhost' || window.location.origin.includes('localhost');
  return isAndroidWebView || isLocalhostOrigin;
}

/**
 * Handles Google Sign-In:
 * - On Native Android (Capacitor): invokes native Google Play Services sign-in dialog.
 * - On Web Browsers: uses standard Firebase popup.
 * - Prevents the broken "The requested action is invalid" popup URL when in an APK/WebView
 *   without native setup.
 */
export async function signInWithGoogle(): Promise<SignInOutcome> {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const inWebView = isWebViewEnvironment();

  if (isNative) {
    try {
      // Trigger Native Google Sign-In dialog via Capacitor plugin
      const result = await FirebaseAuthentication.signInWithGoogle();
      
      const idToken = result.credential?.idToken;
      if (idToken) {
        // Link native Google token with Firebase Web SDK Auth instance
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        return {
          success: true,
          user: userCredential.user,
        };
      }

      if (auth.currentUser) {
        return {
          success: true,
          user: auth.currentUser,
        };
      }

      return {
        success: false,
        error: "Google sign-in completed without an ID token.",
        diagnostic: {
          packageName: 'app.tasktracker',
          isNative: true,
          isWebView: true,
          platform,
          isConfigIssue: true,
          solutionSteps: [
            "Ensure 'google-services.json' is placed in 'android/app/google-services.json'.",
            "Verify SHA-1 fingerprint in Firebase Console matches your APK signing key.",
            "Rebuild the APK: run 'npm run build:android'."
          ]
        }
      };
    } catch (nativeErr: any) {
      console.error("Native Google sign-in failed:", nativeErr);
      const rawError = nativeErr?.message || String(nativeErr);

      const isConfigIssue = 
        rawError.includes('10:') || 
        rawError.includes('DEVELOPER_ERROR') || 
        rawError.includes('google-services.json') || 
        rawError.includes('Plugin_not_installed') ||
        rawError.includes('not implemented');

      return {
        success: false,
        error: rawError.includes('10:') 
          ? "Developer Error 10: Missing SHA-1 fingerprint or google-services.json in Firebase Console."
          : rawError,
        diagnostic: {
          packageName: 'app.tasktracker',
          isNative: true,
          isWebView: true,
          platform,
          isConfigIssue: true,
          solutionSteps: [
            "Add Android App in Firebase Console with package name 'app.tasktracker'.",
            "Generate your SHA-1 fingerprint (run './gradlew signingReport' in android/) and add it to Firebase Console.",
            "Download 'google-services.json' from Firebase Console and save to 'android/app/google-services.json'.",
            "Run 'npm run build:android' and rebuild your APK."
          ]
        }
      };
    }
  }

  // If running inside an APK / WebView but without Capacitor native bridge:
  // Google OAuth strictly blocks web popups in WebViews (causing 'The requested action is invalid')
  if (inWebView && !isNative) {
    return {
      success: false,
      error: "Google web popup sign-in is blocked in Android WebViews (causes 'The requested action is invalid'). Please use Email & Password or Guest Mode below, or build via Capacitor with native Google Sign-In.",
      diagnostic: {
        packageName: 'app.tasktracker',
        isNative: false,
        isWebView: true,
        platform: 'android-webview',
        isConfigIssue: true,
        solutionSteps: [
          "Use Email & Password or 'Continue as Guest' below for instant APK access without Google setup.",
          "To enable Google Sign-In on Android, build the APK via the included Capacitor project with 'google-services.json' and your SHA-1 fingerprint."
        ]
      }
    };
  }

  // Standard Web Browser (Chrome, Safari, Firefox, Edge)
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    const result = await signInWithPopup(auth, provider);
    return {
      success: true,
      user: result.user,
    };
  } catch (webErr: any) {
    console.error("Web Google sign-in error:", webErr);
    return {
      success: false,
      error: webErr?.message || "Web sign-in was cancelled or encountered an error.",
      diagnostic: {
        packageName: 'app.tasktracker',
        isNative: false,
        isWebView: false,
        platform: 'web',
        isConfigIssue: false,
        solutionSteps: [
          "Ensure your domain (or localhost) is added to Firebase Console > Authentication > Settings > Authorized Domains.",
        ]
      }
    };
  }
}

/**
 * Signs in with Email and Password. Works 100% in all APKs, WebViews, and browsers
 * without requiring any native plugins or SHA-1 fingerprints.
 */
export async function signInWithEmail(email: string, pass: string): Promise<SignInOutcome> {
  try {
    const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return {
      success: true,
      user: res.user,
    };
  } catch (err: any) {
    let message = err.message || "Failed to sign in with email";
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      message = "Invalid email or password. If you don't have an account, click 'Create Account' first.";
    } else if (err.code === 'auth/invalid-email') {
      message = "Please enter a valid email address.";
    }
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Registers a new account with Email and Password.
 */
export async function signUpWithEmail(email: string, pass: string): Promise<SignInOutcome> {
  try {
    const res = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    return {
      success: true,
      user: res.user,
    };
  } catch (err: any) {
    let message = err.message || "Failed to create account";
    if (err.code === 'auth/email-already-in-use') {
      message = "An account with this email already exists. Please sign in instead.";
    } else if (err.code === 'auth/weak-password') {
      message = "Password should be at least 6 characters.";
    } else if (err.code === 'auth/invalid-email') {
      message = "Please enter a valid email address.";
    }
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Signs in anonymously as Guest. Allows instant full app access in APKs
 * without needing credentials or Google Play Services.
 */
export async function signInAsGuest(): Promise<SignInOutcome> {
  try {
    const res = await signInAnonymously(auth);
    return {
      success: true,
      user: res.user,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to sign in as guest",
    };
  }
}

/**
 * Signs out from both native Capacitor session and Firebase Web SDK.
 */
export async function signOutUser(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut();
    } catch (err) {
      console.warn("Native sign out warning:", err);
    }
  }
  await firebaseSignOut(auth);
}
