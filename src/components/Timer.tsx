import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import { cn, formatTime } from '../lib/utils';

interface TimerProps {
  initialSeconds?: number;
  onSave: (seconds: number) => void;
  className?: string;
}

export default function Timer({ initialSeconds = 0, onSave, className }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setSeconds(0);
  };

  const handleSave = () => {
    setIsActive(false);
    onSave(seconds);
  };

  return (
    <div className={cn("bg-neutral-900 text-white p-4 rounded-2xl border border-white/10 shadow-xl", className)}>
      <div className="flex items-center gap-2 mb-3 text-neutral-400">
        <TimerIcon size={16} />
        <span className="text-[10px] uppercase tracking-wider font-medium">Task Timer</span>
      </div>
      
      <div className="text-4xl font-mono tracking-tighter mb-6 text-center tabular-nums">
        {formatTime(seconds)}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={resetTimer}
          className="p-2 rounded-full hover:bg-white/10 text-neutral-400 transition-colors"
          title="Reset"
        >
          <RotateCcw size={20} />
        </button>

        <button
          onClick={toggleTimer}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-95",
            isActive ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500 text-emerald-950"
          )}
        >
          {isActive ? (
            <>
              <Pause size={18} fill="currentColor" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={18} fill="currentColor" />
              <span>Start Tracking</span>
            </>
          )}
        </button>

        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium hover:text-emerald-400 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}
