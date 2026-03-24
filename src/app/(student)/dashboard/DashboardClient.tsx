"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, BookOpen, CheckCircle2, Circle, Minus } from "lucide-react";
import type { TopicProgress, LessonProgress } from "./page";

interface DashboardClientProps {
  userName: string;
  currentPhase: string;
  topics: TopicProgress[];
}

const PHASE_LABELS: Record<string, string> = {
  FOUNDATIONS: "Foundations",
  EXPLORER: "Explorer",
  BUILDER: "Builder",
  CHALLENGER: "Challenger",
  IB_READY: "IB Ready",
};

const PHASE_COLORS: Record<string, string> = {
  FOUNDATIONS: "#22c55e",
  EXPLORER: "#3b82f6",
  BUILDER: "#a855f7",
  CHALLENGER: "#f59e0b",
  IB_READY: "#ef4444",
};

function lessonStatus(lesson: LessonProgress): "not_started" | "in_progress" | "completed" {
  if (lesson.totalProblems === 0) return "not_started";
  if (lesson.correct >= lesson.totalProblems) return "completed";
  if (lesson.attempted > 0) return "in_progress";
  return "not_started";
}

function topicProficiency(lessons: LessonProgress[]): number {
  const total = lessons.reduce((s, l) => s + l.totalProblems, 0);
  if (total === 0) return 0;
  const correct = lessons.reduce((s, l) => s + l.correct, 0);
  return Math.round((correct / total) * 100);
}

export function DashboardClient({ userName, currentPhase, topics }: DashboardClientProps) {
  // Group topics by phase
  const phases = new Map<string, TopicProgress[]>();
  for (const topic of topics) {
    const list = phases.get(topic.phase) || [];
    list.push(topic);
    phases.set(topic.phase, list);
  }

  const phaseOrder = ["FOUNDATIONS", "EXPLORER", "BUILDER", "CHALLENGER", "IB_READY"];

  // Summary stats
  const totalLessons = topics.reduce((s, t) => s + t.lessons.length, 0);
  const completedLessons = topics.reduce(
    (s, t) => s + t.lessons.filter((l) => lessonStatus(l) === "completed").length,
    0
  );
  const inProgressLessons = topics.reduce(
    (s, t) => s + t.lessons.filter((l) => lessonStatus(l) === "in_progress").length,
    0
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome back, {userName}</h1>

      {/* Summary bar */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Completed" value={completedLessons} total={totalLessons} color="#22c55e" />
        <SummaryCard label="In Progress" value={inProgressLessons} color="#3b82f6" />
        <SummaryCard label="Current Phase" value={PHASE_LABELS[currentPhase] || currentPhase} />
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

      {/* Curriculum by phase */}
      <div className="mt-8 space-y-6">
        {phaseOrder.map((phase) => {
          const phaseTopics = phases.get(phase);
          if (!phaseTopics || phaseTopics.length === 0) return null;

          return (
            <PhaseSection
              key={phase}
              phase={phase}
              label={PHASE_LABELS[phase]}
              color={PHASE_COLORS[phase]}
              topics={phaseTopics}
              isCurrent={phase === currentPhase}
            />
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, total, color }: { label: string; value: string | number; total?: number; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold" style={color ? { color } : undefined}>
        {value}
        {total !== undefined && (
          <span className="text-sm font-normal text-muted-foreground"> / {total} lessons</span>
        )}
      </p>
    </div>
  );
}

function PhaseSection({
  phase,
  label,
  color,
  topics,
  isCurrent,
}: {
  phase: string;
  label: string;
  color: string;
  topics: TopicProgress[];
  isCurrent: boolean;
}) {
  const [expanded, setExpanded] = useState(isCurrent);

  const phaseProficiency = (() => {
    const total = topics.reduce((s, t) => s + t.lessons.reduce((ls, l) => ls + l.totalProblems, 0), 0);
    if (total === 0) return 0;
    const correct = topics.reduce((s, t) => s + t.lessons.reduce((ls, l) => ls + l.correct, 0), 0);
    return Math.round((correct / total) * 100);
  })();

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="flex h-8 w-1 rounded-full" style={{ backgroundColor: color }} />
        <div className="flex flex-1 items-center gap-2">
          <h2 className="text-lg font-semibold">{label}</h2>
          {isCurrent && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Current
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{phaseProficiency}%</span>
        {expanded ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="ml-5 mt-3 space-y-4 border-l-2 border-border pl-4">
          {topics.map((topic) => (
            <TopicBlock key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicBlock({ topic }: { topic: TopicProgress }) {
  const proficiency = topicProficiency(topic.lessons);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{topic.name}</h3>
        <ProficiencyPill percent={proficiency} />
      </div>

      <div className="space-y-1">
        {topic.lessons.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}

function LessonRow({ lesson }: { lesson: LessonProgress }) {
  const status = lessonStatus(lesson);

  return (
    <Link
      href={`/practice?lessonId=${lesson.id}`}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
    >
      {status === "completed" ? (
        <CheckCircle2 size={16} className="shrink-0 text-green-500" />
      ) : status === "in_progress" ? (
        <Minus size={16} className="shrink-0 text-blue-500" />
      ) : (
        <Circle size={16} className="shrink-0 text-muted-foreground/40" />
      )}

      <span className={status === "completed" ? "text-muted-foreground" : "text-foreground"}>
        {lesson.title}
      </span>

      <span className="ml-auto text-xs text-muted-foreground">
        {lesson.totalProblems > 0 ? (
          status === "not_started" ? (
            `${lesson.totalProblems} problems`
          ) : (
            `${lesson.correct}/${lesson.totalProblems}`
          )
        ) : (
          "No problems yet"
        )}
      </span>
    </Link>
  );
}

function ProficiencyPill({ percent }: { percent: number }) {
  let bg: string;
  let text: string;
  let label: string;

  if (percent >= 80) {
    bg = "bg-green-100"; text = "text-green-800"; label = "Strong";
  } else if (percent >= 50) {
    bg = "bg-blue-100"; text = "text-blue-800"; label = "Developing";
  } else if (percent > 0) {
    bg = "bg-amber-100"; text = "text-amber-800"; label = "Starting";
  } else {
    bg = "bg-gray-100"; text = "text-gray-500"; label = "Not started";
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${bg} ${text}`}>
      {percent > 0 ? `${percent}% — ${label}` : label}
    </span>
  );
}
