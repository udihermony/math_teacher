"use client";

interface StreakCounterProps {
  streak: number;
  isActiveToday: boolean;
  compact?: boolean;
}

export function StreakCounter({ streak, isActiveToday, compact = false }: StreakCounterProps) {
  const flameColor = streak >= 30
    ? "text-orange-500"
    : streak >= 7
      ? "text-amber-500"
      : streak >= 3
        ? "text-yellow-500"
        : "text-gray-400";

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <span className={`text-base ${flameColor}`}>🔥</span>
        <span className="text-sm font-semibold">{streak}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className={`text-3xl ${flameColor}`}>🔥</div>
        <div>
          <p className="text-lg font-bold">{streak} day{streak !== 1 ? "s" : ""}</p>
          <p className="text-xs text-muted-foreground">
            {isActiveToday
              ? "Keep it up!"
              : streak > 0
                ? "Practice today to keep your streak!"
                : "Start your streak today!"}
          </p>
        </div>
      </div>
    </div>
  );
}
