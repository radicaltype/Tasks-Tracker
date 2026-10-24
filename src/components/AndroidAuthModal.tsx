import { useState } from 'react';
import { X, Smartphone, AlertCircle, Copy, Check, ExternalLink, ShieldCheck, Terminal, HelpCircle, KeyRound, Sparkles } from 'lucide-react';
import type { AuthDiagnosticInfo } from '../lib/authService';

interface AndroidAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  error?: string | null;
  diagnostic?: AuthDiagnosticInfo | null;
  onOpenDiagnostics?: () => void;
}

export default function AndroidAuthModal({
  isOpen,
  onClose,
  error,
  onOpenDiagnostics,
}: AndroidAuthModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Smartphone size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900 leading-tight">
                Android APK Sign-In Guide
              </h2>
              <p className="text-xs text-neutral-500">
                Fixing "The requested action is invalid" on mobile
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-neutral-700">
          {/* Error Banner if error occurred */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-xs uppercase tracking-wider text-red-700">Reported Error</p>
                <p className="text-xs font-mono break-all bg-red-100/60 p-2 rounded-lg">{error}</p>
              </div>
            </div>
          )}

          {/* Quick Workaround Callout */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <Sparkles size={18} className="text-emerald-700" />
              <span>Instant Fix: Use Email or Guest Login</span>
            </div>
            <p className="text-xs text-emerald-900/90 leading-relaxed">
              You do <b>not</b> need any Google credentials or APK rebuilds to use Task Tracker! Simply switch to the <b>Email &amp; Password</b> tab or tap <b>Continue as Guest</b> on the login screen to start using the app immediately inside your APK.
            </p>
          </div>

          {/* Dedicated Diagnostic Tool Banner */}
          {onOpenDiagnostics && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <ShieldCheck size={16} className="text-amber-700" />
                  <span>Interactive Auth &amp; SHA-1 Diagnostics Tool</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Verify SHA-1 formatting, inspect google-services.json, and run live flow tests.
                </p>
              </div>
              <button
                onClick={() => { onClose(); onOpenDiagnostics(); }}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs"
              >
                Launch Tool
              </button>
            </div>
          )}

          {/* Root cause explanation */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
              <HelpCircle size={18} className="text-blue-700" />
              <span>Why Did "The requested action is invalid" Occur?</span>
            </div>
            <p className="text-xs text-blue-900/90 leading-relaxed">
              When Google Sign-In is invoked via web popup (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono">authType=signInViaPopup</code>) inside an Android WebView or APK:
            </p>
            <ul className="text-xs text-blue-900/90 space-y-1 list-disc list-inside pl-1">
              <li>Android WebViews do not support cross-window <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">window.opener</code> communication.</li>
              <li>When Firebase's <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">/__/auth/handler</code> detects that <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">window.opener</code> is missing, it displays <b>"The requested action is invalid."</b></li>
              <li>Google also strictly blocks OAuth in WebViews (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono">disallowed_useragent</code>).</li>
            </ul>
          </div>

          {/* Required Steps for Native Google Sign-In */}
          <div className="space-y-4">
            <h3 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
              <ShieldCheck size={18} className="text-neutral-900" />
              <span>How to Enable Native Google Sign-In for your APK</span>
            </h3>

            {/* Step 1: Package Name */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-900">1. Android Package Name</span>
                <span className="text-[10px] bg-neutral-200 text-neutral-700 font-bold px-2 py-0.5 rounded-full uppercase">Firebase Console</span>
              </div>
              <p className="text-xs text-neutral-600">
                In Firebase Console (<code className="font-semibold text-neutral-800">iconsouth-engine</code>), go to <b>Project Settings &gt; General &gt; Add app &gt; Android</b> and register this package:
              </p>
              <div className="flex items-center justify-between bg-white border border-neutral-300 rounded-xl px-3 py-2 font-mono text-xs text-neutral-800">
                <span>app.tasktracker</span>
                <button
                  onClick={() => handleCopy('app.tasktracker', 'pkg')}
                  className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900"
                >
                  {copiedKey === 'pkg' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedKey === 'pkg' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Step 2: SHA-1 Fingerprint */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-900">2. Add your SHA-1 Fingerprint</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">Required for Google</span>
              </div>
              <p className="text-xs text-neutral-600">
                Google Play Services requires your APK's SHA-1 signing key fingerprint. Generate it by running:
              </p>
              <div className="flex items-center justify-between bg-neutral-900 text-neutral-100 rounded-xl px-3 py-2.5 font-mono text-xs">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <Terminal size={14} className="text-neutral-400 shrink-0" />
                  <span>cd android && ./gradlew signingReport</span>
                </div>
                <button
                  onClick={() => handleCopy('cd android && ./gradlew signingReport', 'sha')}
                  className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white shrink-0 ml-2"
                >
                  {copiedKey === 'sha' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedKey === 'sha' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-neutral-500">
                Copy the <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">SHA1</code> string and paste it into Firebase Console &gt; Project Settings &gt; Your Android App &gt; <b>SHA certificate fingerprints</b>.
              </p>
            </div>

            {/* Step 3: google-services.json */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-900">3. Download google-services.json</span>
                <span className="text-[10px] bg-neutral-200 text-neutral-700 font-bold px-2 py-0.5 rounded-full uppercase">Config File</span>
              </div>
              <p className="text-xs text-neutral-600">
                Download <code className="font-semibold text-neutral-800">google-services.json</code> from Firebase Console and place it at:
              </p>
              <div className="flex items-center justify-between bg-white border border-neutral-300 rounded-xl px-3 py-2 font-mono text-xs text-neutral-800">
                <span>android/app/google-services.json</span>
                <button
                  onClick={() => handleCopy('android/app/google-services.json', 'path')}
                  className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900"
                >
                  {copiedKey === 'path' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedKey === 'path' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Step 4: Sync & Build */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-neutral-900">4. Sync &amp; Build APK</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full uppercase">Command</span>
              </div>
              <p className="text-xs text-neutral-600">
                Run the build sync and compile the Android debug APK:
              </p>
              <div className="flex items-center justify-between bg-neutral-900 text-neutral-100 rounded-xl px-3 py-2 font-mono text-xs">
                <span>npm run build:android && cd android && ./gradlew assembleDebug</span>
                <button
                  onClick={() => handleCopy('npm run build:android && cd android && ./gradlew assembleDebug', 'build')}
                  className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white shrink-0 ml-2"
                >
                  {copiedKey === 'build' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedKey === 'build' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <a
            href="https://console.firebase.google.com/project/iconsouth-engine/settings/general"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
          >
            <span>Open Firebase Console</span>
            <ExternalLink size={13} />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-xs"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
