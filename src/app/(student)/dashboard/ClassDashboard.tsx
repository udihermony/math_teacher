"use client";

import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  Clock,
  Coins,
  Zap,
  Flame,
  Star,
  CheckCircle2,
  UserPlus,
  GraduationCap,
} from "lucide-react";
import type { PendingAssignment } from "./page";

interface ClassDashboardProps {
  userName: string;
  hasClass: boolean;
  className: string | null;
  teacherName: string | null;
  coins: number;
  xp: number;
  level: number;
  streak: number;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: PendingAssignment[];
}

export function ClassDashboard({
  userName,
  hasClass,
  className,
  teacherName,
  coins,
  xp,
  level,
  streak,
  totalAssignments,
  completedAssignments,
  pendingAssignments,
}: ClassDashboardProps) {
  if (!hasClass) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <UserPlus size={36} className="text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Welcome, {userName}!</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Join a class to start your learning journey. Ask your teacher for a 6-character class code.
        </p>
        <Link
          href="/classes"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90"
        >
          <UserPlus size={16} />
          Join a Class
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>

      {/* Class info */}
      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <GraduationCap size={16} />
        <span>{className}</span>
        {teacherName && <span>&middot; {teacherName}</span>}
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Coins size={20} />} label="Wallet" value={`${coins}`} color="text-amber-500" />
        <StatCard icon={<Zap size={20} />} label="Level" value={`Lv ${level}`} subtitle={`${xp.toLocaleString()} XP`} color="text-primary" />
        <StatCard icon={<Flame size={20} />} label="Streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} color={streak > 0 ? "text-orange-500" : "text-muted-foreground"} />
        <StatCard icon={<Star size={20} />} label="Assignments" value={`${completedAssignments}/${totalAssignments}`} color="text-green-500" />
      </div>

      {/* Assignment progress bar */}
      {totalAssignments > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Assignment progress</span>
            <span>{Math.round((completedAssignments / totalAssignments) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${(completedAssignments / totalAssignments) * 100}%` }}
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
                href={`/practice?ids=${a.assignedProblemIds.join(",")}&passingGrade=${a.passingGrade}`}
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
              >
                <BookOpen size={16} className="shrink-0 text-amber-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{a.lessonTitle}</p>
                    <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                      Quiz
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.topicName}
                    {a.dueDate && ` · Due ${new Date(a.dueDate).toLocaleDateString("en-CA")}`}
                  </p>
                  {a.note && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      &ldquo;{a.note}&rdquo;
                    </p>
                  )}
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

      {/* Completed assignments */}
      {completedAssignments > 0 && pendingAssignments.length === 0 && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-900/50 dark:bg-green-950/20">
          <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500" />
          <p className="font-semibold text-green-700 dark:text-green-400">All caught up!</p>
          <p className="text-sm text-muted-foreground">You&apos;ve completed all your assignments.</p>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-6 flex gap-3">
        <Link
          href="/quest-map"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Star size={16} />
          Quest Road
        </Link>
        <Link
          href="/practice"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <BookOpen size={16} />
          Free Practice
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`flex items-center gap-1.5 text-xl font-bold ${color}`}>
        {icon}
        {value}
      </p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
