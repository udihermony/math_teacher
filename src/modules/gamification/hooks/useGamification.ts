"use client";

import { useState, useEffect, useCallback } from "react";
import type { BadgeDefinition } from "../badge-definitions";

export interface GamificationState {
  xp: number;
  level: number;
  progress: number;
  xpToNext: number;
  phase: string;
  streak: number;
  isActiveToday: boolean;
  badges: Array<BadgeDefinition & { earnedAt: Date }>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGamification(): GamificationState {
  const [state, setState] = useState<Omit<GamificationState, "loading" | "error" | "refresh">>({
    xp: 0,
    level: 1,
    progress: 0,
    xpToNext: 0,
    phase: "FOUNDATIONS",
    streak: 0,
    isActiveToday: false,
    badges: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gamification");
      if (!res.ok) throw new Error("Failed to fetch gamification data");
      const data = await res.json();
      setState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, loading, error, refresh };
}
