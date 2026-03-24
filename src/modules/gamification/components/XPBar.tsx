"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";

interface XPBarProps {
  level: number;
  xp: number;
  progress: number; // 0-100 within current level
  xpToNext: number;
  compact?: boolean;
}

export function XPBar({ level, xp, progress, xpToNext, compact = false }: XPBarProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
          {level}
        </span>
        <ProgressBar value={progress} className="h-1.5 flex-1" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {level}
          </span>
          <span className="text-sm font-medium">Level {level}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {xp.toLocaleString()} XP
        </span>
      </div>
      <ProgressBar value={progress} />
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {xpToNext.toLocaleString()} XP to next level
      </p>
    </div>
  );
}
