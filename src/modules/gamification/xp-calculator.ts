/**
 * XP calculation and leveling system for MathQuest.
 *
 * Level curve: each level requires progressively more XP.
 * Formula: XP needed for level N = 50 * N^1.5 (rounded)
 *
 * Level 1:   0 XP (starting)
 * Level 2:  71 XP
 * Level 3: 130 XP
 * Level 5: 279 XP
 * Level 10: 791 XP
 * Level 20: 2236 XP
 * Level 50: 8839 XP
 */

const MAX_LEVEL = 100;

/** XP thresholds — cumulative XP required to reach each level. */
const LEVEL_THRESHOLDS: number[] = (() => {
  const thresholds = [0]; // Level 1 = 0 XP
  let cumulative = 0;
  for (let level = 2; level <= MAX_LEVEL; level++) {
    cumulative += Math.round(50 * Math.pow(level - 1, 1.5));
    thresholds.push(cumulative);
  }
  return thresholds;
})();

/** Returns the level for a given total XP amount. */
export function getLevelForXP(totalXP: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      return i + 1; // Levels are 1-indexed
    }
  }
  return 1;
}

/** Returns XP needed to reach the next level from current XP. */
export function xpToNextLevel(totalXP: number): number {
  const currentLevel = getLevelForXP(totalXP);
  if (currentLevel >= MAX_LEVEL) return 0;
  return LEVEL_THRESHOLDS[currentLevel] - totalXP;
}

/** Returns the progress percentage within the current level (0-100). */
export function levelProgress(totalXP: number): number {
  const currentLevel = getLevelForXP(totalXP);
  if (currentLevel >= MAX_LEVEL) return 100;

  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel];
  const range = nextThreshold - currentThreshold;
  if (range === 0) return 100;

  return Math.round(((totalXP - currentThreshold) / range) * 100);
}

/** Info bundle returned after XP is awarded. */
export interface XPResult {
  totalXP: number;
  xpEarned: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  progress: number; // 0-100 within current level
  xpToNext: number;
}

/** Calculate XP earned for a correct answer. */
export function calculateXPEarned(params: {
  difficulty: number; // 1-10
  timeSpent?: number; // seconds
  streak?: number; // current streak days
  isFirstAttempt?: boolean;
  lessonXPReward?: number;
}): number {
  const { difficulty, timeSpent, streak = 0, isFirstAttempt = true, lessonXPReward } = params;

  // Base XP from lesson reward or difficulty-based default
  let xp = lessonXPReward ?? Math.max(5, difficulty * 3);

  // Difficulty bonus: harder problems give more
  if (difficulty >= 7) {
    xp = Math.round(xp * 1.3);
  } else if (difficulty >= 4) {
    xp = Math.round(xp * 1.1);
  }

  // Speed bonus: solving quickly earns up to 20% extra
  if (timeSpent && timeSpent > 0) {
    const expectedTime = difficulty * 30; // rough estimate: 30s per difficulty point
    if (timeSpent < expectedTime * 0.5) {
      xp = Math.round(xp * 1.2);
    } else if (timeSpent < expectedTime * 0.75) {
      xp = Math.round(xp * 1.1);
    }
  }

  // First attempt bonus
  if (isFirstAttempt) {
    xp = Math.round(xp * 1.15);
  }

  // Streak multiplier: up to 50% bonus at 30-day streak
  if (streak > 0) {
    const streakMultiplier = 1 + Math.min(streak, 30) * (0.5 / 30);
    xp = Math.round(xp * streakMultiplier);
  }

  return xp;
}

/** Build a full XP result after awarding XP. */
export function buildXPResult(previousXP: number, xpEarned: number): XPResult {
  const totalXP = previousXP + xpEarned;
  const previousLevel = getLevelForXP(previousXP);
  const level = getLevelForXP(totalXP);

  return {
    totalXP,
    xpEarned,
    level,
    previousLevel,
    leveledUp: level > previousLevel,
    progress: levelProgress(totalXP),
    xpToNext: xpToNextLevel(totalXP),
  };
}

export { LEVEL_THRESHOLDS, MAX_LEVEL };
