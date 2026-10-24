import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-indicator"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-neutral-900/95 text-white px-3.5 py-2 text-xs font-semibold shadow-xl backdrop-blur-sm border border-neutral-700/50 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Offline Mode — Cached data and offline tasks active</span>
    </div>
  );
};
