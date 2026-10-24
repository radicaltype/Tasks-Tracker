import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Suppress if already installed or running standalone
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const installed = await install();
    if (installed) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 3000);
    }
  };

  if (installSuccess) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Installed!</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="btn-install-pwa"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-xl transition-all shadow-2xs cursor-pointer border border-neutral-200/80"
        title="Install Tasks Tracker to your device"
      >
        <Download className="w-3.5 h-3.5 text-neutral-700" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="btn-install-pwa-ios"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 rounded-xl transition-all shadow-2xs cursor-pointer border border-neutral-200/80"
          title="Install on iPhone / iPad"
        >
          <Download className="w-3.5 h-3.5 text-neutral-700" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div
            id="modal-ios-install-guide"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-100">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white">
                    <Download className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-neutral-900">Install on iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-neutral-600">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-neutral-100 font-bold text-neutral-800 flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </div>
                  <p>
                    Tap the <strong className="text-neutral-900 inline-flex items-center gap-1">Share <Share2 className="w-3 h-3 inline" /></strong> button in your Safari toolbar at the bottom of the screen.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-neutral-100 font-bold text-neutral-800 flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </div>
                  <p>
                    Scroll down and tap <strong className="text-neutral-900">Add to Home Screen</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-neutral-100 font-bold text-neutral-800 flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </div>
                  <p>
                    Tap <strong className="text-neutral-900">Add</strong> in the upper right. Tasks Tracker will launch as a full-screen, native-feeling app!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
