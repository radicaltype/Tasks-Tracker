import { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Terminal, 
  KeyRound, 
  Sparkles, 
  Play, 
  RefreshCw, 
  FileCode, 
  HelpCircle,
  FileCheck2,
  AlertTriangle,
  Info,
  Server
} from 'lucide-react';
import { 
  runFirebaseAuthDiagnostics, 
  validateAndFormatSha1, 
  testGoogleSignInFlow, 
  type FullDiagnosticReport, 
  type DiagnosticCheckItem 
} from '../lib/authDiagnostics';

interface FirebaseAuthDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialError?: string | null;
  onSelectEmailMode?: () => void;
  onSelectGuestMode?: () => void;
}

export default function FirebaseAuthDiagnosticsModal({
  isOpen,
  onClose,
  initialError,
  onSelectEmailMode,
  onSelectGuestMode,
}: FirebaseAuthDiagnosticsModalProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'sha1' | 'googleservices' | 'live_test'>('status');
  const [report, setReport] = useState<FullDiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // SHA-1 Validator state
  const [inputSha1, setInputSha1] = useState('');
  const [sha1Validation, setSha1Validation] = useState<{
    isValid: boolean;
    formatted: string;
    error?: string;
  } | null>(null);

  // Live Test state
  const [isTestingFlow, setIsTestingFlow] = useState(false);
  const [testResult, setTestResult] = useState<{
    phase: string;
    success: boolean;
    code?: string;
    message: string;
    diagnosis: string;
    solution: string;
  } | null>(null);

  const loadDiagnostics = async () => {
    setIsLoading(true);
    try {
      const data = await runFirebaseAuthDiagnostics();
      setReport(data);
    } catch (err) {
      console.error('Failed to load diagnostics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSha1Change = (val: string) => {
    setInputSha1(val);
    if (!val.trim()) {
      setSha1Validation(null);
      return;
    }
    const result = validateAndFormatSha1(val);
    setSha1Validation(result);
  };

  const handleRunTest = async () => {
    setIsTestingFlow(true);
    setTestResult(null);
    try {
      const res = await testGoogleSignInFlow();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        phase: 'execution_error',
        success: false,
        message: err?.message || String(err),
        diagnosis: 'An unhandled exception occurred during the test.',
        solution: 'Review native logs or use Email/Guest authentication.'
      });
    } finally {
      setIsTestingFlow(false);
    }
  };

  const copyFullReport = () => {
    if (!report) return;
    const reportText = [
      `=== FIREBASE AUTH & ANDROID APK DIAGNOSTIC REPORT ===`,
      `Generated: ${report.timestamp}`,
      `Platform: ${report.environment.platform} (Native: ${report.environment.isNative}, WebView: ${report.environment.isWebView})`,
      `Origin: ${report.environment.origin} | Host: ${report.environment.hostname}`,
      `UserAgent: ${report.environment.userAgent}`,
      `Firebase Project: ${report.firebaseConfig.projectId}`,
      `Android Package: ${report.firebaseConfig.androidPackageName}`,
      `Overall Status: ${report.overallStatus}`,
      `Primary Issue: ${report.primaryIssue || 'None detected'}`,
      `\n--- CHECKS ---`,
      ...report.checks.map(c => `[${c.status.toUpperCase()}] ${c.title}: ${c.summary}\n  Details: ${c.details}\n  Action: ${c.recommendation || c.actionCommand || 'None'}`)
    ].join('\n');

    handleCopy(reportText, 'full_report');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-neutral-200 flex flex-col">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-neutral-900 tracking-tight">
                  Firebase Auth &amp; APK Diagnostics
                </h2>
                {report && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    report.environment.isNative 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : report.environment.isWebView 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {report.environment.isNative 
                      ? 'Native APK' 
                      : report.environment.isWebView 
                      ? 'WebView APK' 
                      : 'Web Browser'}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                Identify why Google Sign-In fails on Android APK &amp; verify SHA-1 configuration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDiagnostics}
              disabled={isLoading}
              title="Refresh Diagnostics"
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-neutral-100 bg-neutral-50/70 shrink-0 flex items-center gap-1 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'status'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <FileCheck2 size={14} />
            <span>Config Status</span>
          </button>
          <button
            onClick={() => setActiveTab('sha1')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'sha1'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <KeyRound size={14} />
            <span>SHA-1 Fingerprint</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </button>
          <button
            onClick={() => setActiveTab('googleservices')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'googleservices'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <FileCode size={14} />
            <span>google-services.json</span>
          </button>
          <button
            onClick={() => setActiveTab('live_test')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'live_test'
                ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Play size={13} />
            <span>Live Auth Test</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm text-neutral-700">
          
          {/* Recent error banner if triggered by an error */}
          {initialError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-red-900 uppercase tracking-wide">Last Recorded Sign-In Error</span>
                <p className="font-mono text-red-800 break-all bg-red-100/60 p-2 rounded-lg">{initialError}</p>
              </div>
            </div>
          )}

          {/* TAB 1: STATUS & CHECKS */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Quick Status Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Firebase Project
                  </div>
                  <div className="font-mono font-bold text-xs text-neutral-900 truncate">
                    iconsouth-engine
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Database: <span className="font-mono text-[10px]">ai-studio-958fb...</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    Android Package
                  </div>
                  <div className="font-mono font-bold text-xs text-neutral-900 truncate">
                    app.tasktracker
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Must match Firebase App
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1 flex items-center gap-1">
                    <AlertTriangle size={12} className="text-amber-600" />
                    <span>Android SHA-1</span>
                  </div>
                  <div className="font-bold text-xs text-amber-900">
                    Required on Firebase
                  </div>
                  <button
                    onClick={() => setActiveTab('sha1')}
                    className="text-[11px] text-amber-800 font-bold underline underline-offset-2 mt-1 hover:text-amber-950 inline-block"
                  >
                    Generate &amp; Add SHA-1 &rarr;
                  </button>
                </div>
              </div>

              {/* Instant Workaround Callout */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <Sparkles size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
                    Instant Solution for Android APK Users
                  </h4>
                  <p className="text-xs text-emerald-900/90 leading-relaxed">
                    You do not need to configure SHA-1 or rebuild your APK to use this app! Switch to <b>Email &amp; Password</b> or tap <b>Continue as Guest</b> on the login screen for instant full access without Google dependencies.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    {onSelectEmailMode && (
                      <button
                        onClick={() => { onClose(); onSelectEmailMode(); }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-colors shadow-xs"
                      >
                        Use Email Login
                      </button>
                    )}
                    {onSelectGuestMode && (
                      <button
                        onClick={() => { onClose(); onSelectGuestMode(); }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold text-xs hover:bg-emerald-100 transition-colors"
                      >
                        Continue as Guest
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Checklist */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                  Configuration Checks &amp; Status
                </h4>

                {report?.checks.map((check) => (
                  <div
                    key={check.id}
                    className="p-3.5 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {check.status === 'pass' ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        ) : check.status === 'warning' ? (
                          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                        ) : check.status === 'fail' ? (
                          <AlertCircle size={16} className="text-red-500 shrink-0" />
                        ) : (
                          <Info size={16} className="text-blue-500 shrink-0" />
                        )}
                        <span className="font-bold text-xs text-neutral-900">{check.title}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        check.status === 'pass'
                          ? 'bg-emerald-100 text-emerald-800'
                          : check.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : check.status === 'fail'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {check.status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 leading-relaxed pl-6">
                      {check.details}
                    </p>

                    {check.actionCommand && (
                      <div className="ml-6 flex items-center justify-between bg-neutral-900 text-neutral-100 rounded-xl px-3 py-2 font-mono text-xs">
                        <div className="flex items-center gap-2 overflow-x-auto">
                          <Terminal size={13} className="text-neutral-400 shrink-0" />
                          <span>{check.actionCommand}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(check.actionCommand!, check.id)}
                          className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white shrink-0 ml-2"
                        >
                          {copiedKey === check.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          <span>{copiedKey === check.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}

                    {check.externalLink && (
                      <div className="ml-6 pt-0.5">
                        <a
                          href={check.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
                        >
                          <span>Open in Firebase Console</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SHA-1 FINGERPRINT GENERATOR & VALIDATOR */}
          {activeTab === 'sha1' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <KeyRound size={16} className="text-amber-700" />
                  <span>Why SHA-1 is Required for Google Sign-In on Android</span>
                </div>
                <p className="text-xs text-amber-950/90 leading-relaxed">
                  Google Play Services verifies that only authorized APK builds can exchange Google login credentials. When an APK requests a Google token without its SHA-1 registered in Firebase Console, Google returns <b>Developer Error (Code 10)</b>.
                </p>
              </div>

              {/* Step 1: Generate command */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900 flex items-center justify-between">
                  <span>1. Generate SHA-1 From Your Android Project</span>
                  <span className="text-[10px] text-neutral-500 font-mono">Terminal Command</span>
                </h4>
                <p className="text-xs text-neutral-600">
                  Open a terminal in the root of this project and run the Gradle signing report:
                </p>
                <div className="flex items-center justify-between bg-neutral-900 text-neutral-100 rounded-xl px-3.5 py-2.5 font-mono text-xs">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    <Terminal size={14} className="text-neutral-400 shrink-0" />
                    <span>cd android && ./gradlew signingReport</span>
                  </div>
                  <button
                    onClick={() => handleCopy('cd android && ./gradlew signingReport', 'gradle_sha1')}
                    className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white shrink-0 ml-2"
                  >
                    {copiedKey === 'gradle_sha1' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedKey === 'gradle_sha1' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Look under <b>Variant: debug</b> &gt; <b>SHA1</b> in the output. It looks like: <code className="bg-neutral-200 px-1 py-0.5 rounded font-mono">28:12:F4:A5:...</code>
                </p>
              </div>

              {/* Alternative: keytool command */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900 flex items-center justify-between">
                  <span>Alternative: Using JDK Keytool directly</span>
                  <span className="text-[10px] text-neutral-500 font-mono">debug.keystore</span>
                </h4>
                <div className="flex items-center justify-between bg-neutral-900 text-neutral-100 rounded-xl px-3.5 py-2.5 font-mono text-xs">
                  <div className="overflow-x-auto whitespace-nowrap pr-2">
                    <span>keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android</span>
                  </div>
                  <button
                    onClick={() => handleCopy('keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android', 'keytool_cmd')}
                    className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white shrink-0 ml-2"
                  >
                    {copiedKey === 'keytool_cmd' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedKey === 'keytool_cmd' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Interactive SHA-1 Format Validator */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <KeyRound size={15} className="text-blue-700" />
                  <span>SHA-1 Format Validator &amp; Formatter</span>
                </h4>
                <p className="text-xs text-blue-950/80">
                  Paste the SHA-1 from your terminal to verify and format it for Firebase Console:
                </p>
                <input
                  type="text"
                  value={inputSha1}
                  onChange={(e) => handleSha1Change(e.target.value)}
                  placeholder="e.g. 28:12:F4:A5:67:89:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB"
                  className="w-full px-3 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-mono text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                />

                {sha1Validation && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    sha1Validation.isValid 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}>
                    {sha1Validation.isValid ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <CheckCircle2 size={15} />
                          <span>Valid SHA-1 Fingerprint! Ready for Firebase Console</span>
                        </div>
                        <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-lg p-2 font-mono text-xs">
                          <span className="break-all">{sha1Validation.formatted}</span>
                          <button
                            onClick={() => handleCopy(sha1Validation.formatted, 'validated_sha1')}
                            className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold hover:text-emerald-900 shrink-0 ml-2"
                          >
                            {copiedKey === 'validated_sha1' ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedKey === 'validated_sha1' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-red-800">
                        <AlertCircle size={15} className="shrink-0 mt-0.5" />
                        <span>{sha1Validation.error}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Where to paste */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-neutral-900">2. Where to Add in Firebase</span>
                  <a
                    href="https://console.firebase.google.com/project/iconsouth-engine/settings/general"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span>Open Firebase Project Settings</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
                <ol className="text-xs text-neutral-600 space-y-1.5 list-decimal list-inside">
                  <li>Go to <b>Firebase Console &gt; Project Settings &gt; General</b>.</li>
                  <li>Scroll down to <b>Your apps</b> &gt; select your Android App (<b>app.tasktracker</b>).</li>
                  <li>Under <b>SHA certificate fingerprints</b>, click <b>Add fingerprint</b>.</li>
                  <li>Paste the SHA-1 generated above and save.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: GOOGLE-SERVICES.JSON */}
          {activeTab === 'googleservices' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                  <FileCode size={16} className="text-blue-700" />
                  <span>The Role of google-services.json</span>
                </div>
                <p className="text-xs text-blue-950/90 leading-relaxed">
                  When the Android APK is built, the Google Services Gradle plugin parses <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">android/app/google-services.json</code> to configure your Firebase project credentials and native Google Play Services OAuth client.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
                  Target Location in Your Project
                </h4>
                <div className="flex items-center justify-between bg-white border border-neutral-300 rounded-xl px-3 py-2 font-mono text-xs text-neutral-800">
                  <span>android/app/google-services.json</span>
                  <button
                    onClick={() => handleCopy('android/app/google-services.json', 'gs_path')}
                    className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900"
                  >
                    {copiedKey === 'gs_path' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedKey === 'gs_path' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
                  Expected JSON Schema Content
                </h4>
                <p className="text-xs text-neutral-600">
                  A valid <code className="font-mono">google-services.json</code> for this app contains:
                </p>
                <div className="bg-neutral-900 text-neutral-100 rounded-xl p-3 font-mono text-[11px] overflow-x-auto space-y-1">
                  <pre>{`{
  "project_info": {
    "project_number": "203549493374",
    "project_id": "iconsouth-engine",
    "storage_bucket": "iconsouth-engine.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:203549493374:android:...",
        "android_client_info": {
          "package_name": "app.tasktracker"
        }
      },
      "oauth_client": [
        { "client_id": "...", "client_type": 1 },
        { "client_id": "...", "client_type": 3 }
      ]
    }
  ]
}`}</pre>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
                  Next Step After Adding File
                </h4>
                <p className="text-xs text-neutral-600">
                  After placing <code className="font-mono">google-services.json</code> into <code className="font-mono">android/app/</code>, synchronize and rebuild:
                </p>
                <div className="flex items-center justify-between bg-neutral-900 text-neutral-100 rounded-xl px-3 py-2 font-mono text-xs">
                  <span>npm run build:android</span>
                  <button
                    onClick={() => handleCopy('npm run build:android', 'sync_cmd')}
                    className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white shrink-0 ml-2"
                  >
                    {copiedKey === 'sync_cmd' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedKey === 'sync_cmd' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE AUTH FLOW TEST */}
          {activeTab === 'live_test' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
                  Safe Auth Flow Simulation
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Run a live test to inspect how your current runtime environment interacts with Firebase Auth without navigating away or causing unhandled crashes.
                </p>
                <div className="pt-2">
                  <button
                    onClick={handleRunTest}
                    disabled={isTestingFlow}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-all shadow-xs disabled:opacity-60"
                  >
                    {isTestingFlow ? (
                      <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Play size={14} />
                    )}
                    <span>{isTestingFlow ? 'Probing Auth Subsystem...' : 'Run Live Diagnostic Test'}</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-2xl border space-y-3 animate-in fade-in ${
                  testResult.success
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                    : 'bg-amber-50/80 border-amber-300 text-amber-950'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                      {testResult.success ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
                      <span>Test Outcome: {testResult.success ? 'Ready' : 'Diagnostic Detected'}</span>
                    </span>
                    {testResult.code && (
                      <span className="text-[10px] font-mono font-bold bg-white/80 px-2 py-0.5 rounded-md border border-neutral-200">
                        {testResult.code}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-semibold">{testResult.message}</p>
                    <p className="text-neutral-700">{testResult.diagnosis}</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/90 border border-neutral-200 text-xs space-y-1">
                    <span className="font-bold text-neutral-900 block">Recommended Action:</span>
                    <p className="text-neutral-700">{testResult.solution}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/60 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={copyFullReport}
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-900 p-1.5 rounded-lg hover:bg-neutral-200/60 transition-colors"
            >
              {copiedKey === 'full_report' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copiedKey === 'full_report' ? 'Report Copied!' : 'Copy Diagnostic Report'}</span>
            </button>
            <a
              href="https://console.firebase.google.com/project/iconsouth-engine/settings/general"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
            >
              <span>Firebase Console</span>
              <ExternalLink size={12} />
            </a>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
