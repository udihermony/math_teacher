"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, ArrowRight, Clock, Coins, UserPlus, GraduationCap } from "lucide-react";
import type { PendingAssignment } from "./page";

export interface ClassInfo {
  id: string;
  name: string;
  phase: string;
  teacherName: string;
  assignmentCount: number;
  completedCount: number;
}

interface DashboardClientProps {
  userName: string;
  currentPhase: string;
  coins: number;
  xp: number;
  level: number;
  streak: number;
  totalLessons: number;
  completedLessons: number;
  classes: ClassInfo[];
  pendingAssignments?: PendingAssignment[];
}

const PHASE_LABELS: Record<string, string> = {
  FOUNDATIONS: "Foundations",
  EXPLORER: "Explorer",
  BUILDER: "Builder",
  CHALLENGER: "Challenger",
  IB_READY: "IB Ready",
};

export function DashboardClient({
  userName,
  currentPhase,
  coins,
  xp,
  level,
  streak,
  totalLessons,
  completedLessons,
  classes,
  pendingAssignments = [],
}: DashboardClientProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>

      {/* Stats grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Wallet</p>
          <p className="flex items-center gap-1.5 text-xl font-bold text-amber-500">
            <Coins size={20} />
            {coins}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Level</p>
          <p className="text-xl font-bold text-primary">Lv {level}</p>
          <p className="text-xs text-muted-foreground">{xp.toLocaleString()} XP</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Streak</p>
          <p className="text-xl font-bold" style={{ color: streak > 0 ? "#f59e0b" : undefined }}>
            {streak} day{streak !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Lessons Done</p>
          <p className="text-xl font-bold text-green-500">{completedLessons}</p>
          <p className="text-xs text-muted-foreground">of {totalLessons}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Phase</p>
          <p className="text-xl font-bold">{PHASE_LABELS[currentPhase] || currentPhase}</p>
        </div>
      </div>

      {/* Overall progress bar */}
      {totalLessons > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Overall progress</span>
            <span>{Math.round((completedLessons / totalLessons) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${(completedLessons / totalLessons) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Clock size={18} className="text-amber-500" />
            Pending Assignments
          </h2>
          <div className="space-y-2">
            {pendingAssignments.map((a) => (
              <Link
                key={a.id}
                href={`/practice?ids=${a.assignedProblemIds.join(",")}`}
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
              >
                <BookOpen size={16} className="shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.lessonTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.topicName} &middot; {a.className}
                    {a.dueDate && ` · Due ${new Date(a.dueDate).toLocaleDateString("en-CA")}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{a.correct}/{a.totalProblems}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.attempted === 0 ? "Not started" : "In progress"}
                  </p>
                </div>
                <ArrowRight size={16} className="text-amber-600" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Classes section */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">My Classes</h2>
        {classes.length === 0 ? (
          <Link
            href="/classes"
            className="flex items-center gap-3 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:bg-secondary/50"
          >
            <UserPlus size={24} className="text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">Join a class</p>
              <p className="text-sm text-muted-foreground">Ask your teacher for a 6-character class code</p>
            </div>
          </Link>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <Link
                key={cls.id}
                href="/classes"
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <GraduationCap size={20} className="shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{cls.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {cls.teacherName} &middot; {PHASE_LABELS[cls.phase] || cls.phase}
                  </p>
                </div>
                <div className="text-right">
                  {cls.assignmentCount > 0 && (
                    <p className="flex items-center gap-1 text-sm">
                      <CheckCircle2 size={14} className="text-green-500" />
                      {cls.completedCount}/{cls.assignmentCount}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick action */}
      <div className="mt-6">
        <Link
          href="/practice"
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <BookOpen size={16} />
          Start Practicing
        </Link>
      </div>
    </div>
  );
}
