/**
 * Streak tracking for MathQuest.
 *
 * Tracks daily activity streaks using the StudentProfile's
 * streak and lastActiveDate fields. Redis is used as a fast
 * cache when available, falling back to the database.
 */

import { prisma } from "@/lib/db";

/** Result of updating a streak. */
export interface StreakResult {
  streak: number;
  previousStreak: number;
  continued: boolean; // streak was maintained today
  broken: boolean; // streak was reset to 1
  isNewDay: boolean; // first activity today
}

/** Check if two dates are on the same calendar day (UTC). */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** Check if date `a` is exactly one calendar day before `b` (UTC). */
function isYesterday(a: Date, b: Date): boolean {
  const yesterday = new Date(b);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return isSameDay(a, yesterday);
}

/**
 * Update a student's streak on activity.
 * Call this whenever a student completes a problem or logs in.
 */
export async function updateStreak(userId: string): Promise<StreakResult> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { streak: true, lastActiveDate: true },
  });

  if (!profile) {
    throw new Error("Student profile not found");
  }

  const now = new Date();
  const { streak: previousStreak, lastActiveDate } = profile;

  // Already active today — no change
  if (lastActiveDate && isSameDay(lastActiveDate, now)) {
    return {
      streak: previousStreak,
      previousStreak,
      continued: true,
      broken: false,
      isNewDay: false,
    };
  }

  let newStreak: number;
  let broken = false;

  if (lastActiveDate && isYesterday(lastActiveDate, now)) {
    // Consecutive day — increment streak
    newStreak = previousStreak + 1;
  } else if (!lastActiveDate) {
    // First ever activity
    newStreak = 1;
  } else {
    // Missed a day — reset
    newStreak = 1;
    broken = previousStreak > 1;
  }

  await prisma.studentProfile.update({
    where: { userId },
    data: {
      streak: newStreak,
      lastActiveDate: now,
    },
  });

  return {
    streak: newStreak,
    previousStreak,
    continued: !broken,
    broken,
    isNewDay: true,
  };
}

/** Get current streak info without modifying it. */
export async function getStreakInfo(userId: string): Promise<{
  streak: number;
  lastActiveDate: Date | null;
  isActiveToday: boolean;
}> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { streak: true, lastActiveDate: true },
  });

  if (!profile) {
    return { streak: 0, lastActiveDate: null, isActiveToday: false };
  }

  const now = new Date();
  const isActiveToday = profile.lastActiveDate
    ? isSameDay(profile.lastActiveDate, now)
    : false;

  // If they missed yesterday and haven't been active today, streak is effectively 0
  const effectiveStreak =
    profile.lastActiveDate &&
    !isSameDay(profile.lastActiveDate, now) &&
    !isYesterday(profile.lastActiveDate, now)
      ? 0
      : profile.streak;

  return {
    streak: effectiveStreak,
    lastActiveDate: profile.lastActiveDate,
    isActiveToday,
  };
}
