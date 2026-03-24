"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Pause, Play, AlertTriangle } from "lucide-react";

interface ExamTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  paused?: boolean;
  onTogglePause?: () => void;
}

export function ExamTimer({ totalSeconds, onTimeUp, paused = false, onTogglePause }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (paused || remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, remaining]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const isLow = remaining < 300; // Under 5 min
  const isCritical = remaining < 60; // Under 1 min

  const formatTime = useCallback(() => {
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [hours, minutes, seconds]);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-lg font-bold transition-colors ${
        isCritical
          ? "animate-pulse border-destructive bg-destructive/10 text-destructive"
          : isLow
            ? "border-amber-500 bg-amber-50 text-amber-700"
            : "border-border bg-card text-foreground"
      }`}
    >
      {isLow && <AlertTriangle size={18} />}
      <span>{formatTime()}</span>
      {onTogglePause && (
        <button
          onClick={onTogglePause}
          className="ml-1 rounded p-1 hover:bg-secondary"
          title={paused ? "Resume" : "Pause"}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      )}
    </div>
  );
}
