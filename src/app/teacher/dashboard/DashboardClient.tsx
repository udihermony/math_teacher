"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Target,
  Activity,
  ClipboardList,
  Zap,
  Flame,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { StudentAlerts } from "./StudentAlerts";
import { ContentStatsCards } from "./ContentStatsCards";

interface StudentData {
  userId: string;
  name: string;
  email: string;
  accuracy: number;
  totalSubmissions: number;
  lastActiveDate: string | null;
  level: number;
  streak: number;
  xp: number;
  currentPhase: string;
}

interface AssignmentItem {
  id: string;
  lessonTitle: string;
  totalStudents: number;
  completedStudents: number;
  dueDate: string | null;
}

interface ClassData {
  id: string;
  name: string;
  code: string;
  phase: string;
  analytics: {
    studentCount: number;
    totalSubmissions: number;
    correctSubmissions: number;
    accuracy: number;
    activeThisWeek: number;
    averageLevel: number;
    averageStreak: number;
  };
  students: StudentData[];
  assignments: {
    total: number;
    pendingCount: number;
    items: AssignmentItem[];
  };
}

interface ContentStats {
  totalTopics: number;
  totalLessons: number;
  totalProblems: number;
  practiceProblems: number;
  assignmentProblems: number;
}

interface DashboardData {
  classes: ClassData[];
  contentStats: ContentStats;
}

interface Props {
  userName: string;
}

export function DashboardClient({ userName }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teacher/dashboard")
      .then((r) => r.json())
      .then((d: DashboardData) => {
        setData(d);
        if (d.classes.length > 0) setSelectedClassId(d.classes[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Failed to load dashboard.</p>;
  }

  const { classes, contentStats } = data;
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Aggregate stats across all classes
  const totalStudents = classes.reduce((s, c) => s + c.analytics.studentCount, 0);
  const totalSubs = classes.reduce((s, c) => s + c.analytics.totalSubmissions, 0);
  const totalCorrect = classes.reduce((s, c) => s + c.analytics.correctSubmissions, 0);
  const overallAccuracy = totalSubs > 0 ? Math.round((totalCorrect / totalSubs) * 100) : 0;
  const totalActive = classes.reduce((s, c) => s + c.analytics.activeThisWeek, 0);
  const totalPending = classes.reduce((s, c) => s + c.assignments.pendingCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s an overview of your classes and students.
        </p>
      </div>

      {/* Cross-class summary bar */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card px-5 py-3">
        <SummaryItem icon={<Users size={14} />} label="Total Students" value={totalStudents} />
        <SummaryItem icon={<Target size={14} />} label="Overall Accuracy" value={`${overallAccuracy}%`} />
        <SummaryItem icon={<Activity size={14} />} label="Active This Week" value={totalActive} />
        <SummaryItem icon={<ClipboardList size={14} />} label="Pending Assignments" value={totalPending} />
      </div>

      {/* Class tabs */}
      {classes.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No classes yet. Create a class to get started.</p>
        </div>
      ) : classes.length <= 5 ? (
        <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedClassId === cls.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cls.name}
              <span className="ml-1.5 text-xs text-muted-foreground">({cls.analytics.studentCount})</span>
            </button>
          ))}
        </div>
      ) : (
        <select
          value={selectedClassId ?? ""}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} ({cls.analytics.studentCount} students)
            </option>
          ))}
        </select>
      )}

      {/* Selected class details */}
      {selectedClass && (
        <div className="space-y-6">
          {/* Class overview cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card padding="sm">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-primary" />
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
              <p className="mt-1 text-2xl font-bold">{selectedClass.analytics.studentCount}</p>
            </Card>

            <Card padding="sm">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-primary" />
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <p className="mt-1 text-2xl font-bold">{selectedClass.analytics.accuracy}%</p>
              <p className="text-xs text-muted-foreground">{selectedClass.analytics.totalSubmissions} answers</p>
            </Card>

            <Card padding="sm">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-green-500" />
                <p className="text-xs text-muted-foreground">Active This Week</p>
              </div>
              <p className="mt-1 text-2xl font-bold">{selectedClass.analytics.activeThisWeek}</p>
            </Card>

            <Card padding="sm">
              <div className="flex items-center gap-2">
                <ClipboardList size={14} className="text-amber-500" />
                <p className="text-xs text-muted-foreground">Pending Assignments</p>
              </div>
              <p className="mt-1 text-2xl font-bold">{selectedClass.assignments.pendingCount}</p>
              <p className="text-xs text-muted-foreground">{selectedClass.assignments.total} total</p>
            </Card>
          </div>

          {/* Quick stats row */}
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
              <Zap size={12} className="text-primary" /> Avg Lv {selectedClass.analytics.averageLevel}
            </span>
            <span className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
              <Flame size={12} className="text-orange-500" /> Avg {selectedClass.analytics.averageStreak}d streak
            </span>
          </div>

          {/* Student alerts */}
          <StudentAlerts
            students={selectedClass.students}
            assignmentItems={selectedClass.assignments.items}
          />

          {/* Assignment progress */}
          {selectedClass.assignments.items.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assignments</h3>
              <div className="space-y-2">
                {selectedClass.assignments.items.map((a) => {
                  const pct = a.totalStudents > 0
                    ? Math.round((a.completedStudents / a.totalStudents) * 100)
                    : 0;
                  return (
                    <div key={a.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{a.lessonTitle}</span>
                        <span className={`text-xs font-medium ${pct === 100 ? "text-green-600" : "text-muted-foreground"}`}>
                          {a.completedStudents}/{a.totalStudents} passed ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {a.dueDate && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due: {new Date(a.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content stats (global) */}
      <ContentStatsCards stats={contentStats} />
    </div>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
