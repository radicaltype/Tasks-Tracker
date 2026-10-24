import { useState, type MouseEvent } from 'react';
import { ShieldAlert, KeyRound, ChevronRight, Sparkles, Terminal, Copy, Check } from 'lucide-react';

interface AuthDiagnosticBannerProps {
  onOpenDiagnostics: () => void;
  className?: string;
}

export default function AuthDiagnosticBanner({ onOpenDiagnostics, className = '' }: AuthDiagnosticBannerProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const copyCommand = (e: MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText('cd android && ./gradlew signingReport');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left transition-all ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
            <ShieldAlert size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full">
                Android APK Auth Status
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-white/80 border border-amber-200 px-1.5 py-0.5 rounded-md">
                iconsouth-engine
              </span>
            </div>
            <h4 className="text-xs font-bold text-neutral-900 mt-1">
              Google Sign-In Diagnostics &amp; SHA-1 Check
            </h4>
            <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
              If Google Sign-In gives <code className="bg-amber-100/80 px-1 py-0.2 rounded font-mono text-amber-900">"The requested action is invalid"</code> or <code className="bg-amber-100/80 px-1 py-0.2 rounded font-mono text-amber-900">Error 10</code> on your APK, your SHA-1 key is missing in Firebase Console.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenDiagnostics}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 text-white font-bold text-xs hover:bg-neutral-800 transition-colors shadow-xs"
        >
          <span>Open Tool</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Quick Config Pills */}
      <div className="mt-3 pt-3 border-t border-amber-200/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
        <div className="bg-white/80 border border-amber-200/80 rounded-lg p-2">
          <span className="text-neutral-400 font-bold block uppercase tracking-wider">Package ID</span>
          <span className="font-mono font-bold text-neutral-800 truncate block">app.tasktracker</span>
        </div>
        <div className="bg-white/80 border border-amber-200/80 rounded-lg p-2">
          <span className="text-amber-700 font-bold block uppercase tracking-wider flex items-center gap-1">
            <KeyRound size={10} />
            <span>SHA-1 Status</span>
          </span>
          <span className="font-bold text-amber-900 truncate block">Needs Verification</span>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white/80 border border-amber-200/80 rounded-lg p-2">
          <span className="text-emerald-700 font-bold block uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={10} />
            <span>Email &amp; Guest</span>
          </span>
          <span className="font-bold text-emerald-900 truncate block">100% APK Ready</span>
        </div>
      </div>

      {/* Collapsible Quick Actions */}
      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-amber-900 hover:text-black font-semibold underline underline-offset-2"
        >
          {isExpanded ? 'Hide Quick Terminal Command' : 'Show Terminal Command for SHA-1'}
        </button>

        <button
          onClick={onOpenDiagnostics}
          className="text-neutral-600 hover:text-neutral-900 font-medium"
        >
          Check All 7 Diagnostic Points &rarr;
        </button>
      </div>

      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 space-y-2 animate-in fade-in">
          <p className="text-[11px] text-neutral-600">
            Run this command in your project terminal to print your APK's SHA-1:
          </p>
          <div className="flex items-center justify-between bg-neutral-900 text-neutral-100 rounded-xl px-3 py-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Terminal size={12} className="text-neutral-400 shrink-0" />
              <span>cd android && ./gradlew signingReport</span>
            </div>
            <button
              onClick={copyCommand}
              className="flex items-center gap-1 text-[10px] text-neutral-300 hover:text-white shrink-0 ml-2"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
