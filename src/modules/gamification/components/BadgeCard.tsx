"use client";

import { type BadgeDefinition, RARITY_COLORS } from "../badge-definitions";

interface BadgeCardProps {
  badge: BadgeDefinition & { earnedAt?: Date };
  locked?: boolean;
  compact?: boolean;
}

export function BadgeCard({ badge, locked = false, compact = false }: BadgeCardProps) {
  const rarityColor = RARITY_COLORS[badge.rarity];

  if (compact) {
    return (
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
          locked ? "border-gray-300 opacity-40 grayscale" : ""
        }`}
        style={{ borderColor: locked ? undefined : rarityColor }}
        title={`${badge.name}: ${badge.description}`}
      >
        <span className="text-lg">{getIconEmoji(badge.icon)}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border-2 bg-card p-3 transition-transform hover:scale-105 ${
        locked ? "opacity-40 grayscale" : ""
      }`}
      style={{ borderColor: locked ? "var(--border)" : rarityColor }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: `${rarityColor}20` }}
        >
          <span className="text-2xl">{getIconEmoji(badge.icon)}</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold">{badge.name}</p>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: rarityColor }}
            >
              {badge.rarity}
            </span>
            {badge.earnedAt && (
              <span className="text-[10px] text-muted-foreground">
                {formatDate(badge.earnedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Format a date consistently to avoid SSR/client hydration mismatch. */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Map Lucide icon names to emoji fallbacks for simplicity. */
function getIconEmoji(icon: string): string {
  const map: Record<string, string> = {
    Footprints: "👣",
    Brain: "🧠",
    Zap: "⚡",
    Sword: "⚔️",
    Crown: "👑",
    Target: "🎯",
    Crosshair: "🎯",
    Flame: "🔥",
    Star: "⭐",
    Stars: "✨",
    Trophy: "🏆",
    Compass: "🧭",
    Hammer: "🔨",
    GraduationCap: "🎓",
    TrendingUp: "📈",
    Medal: "🏅",
    Shield: "🛡️",
    Gem: "💎",
  };
  return map[icon] || "🏅";
}
