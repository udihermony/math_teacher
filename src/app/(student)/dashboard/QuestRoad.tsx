"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Lock,
  Check,
  Crown,
  Star,
  BookOpen,
  UserPlus,
  Coins,
  Flame,
  Zap,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

// ── Types ────────────────────────────────────────────

interface QuestLesson {
  id: string;
  title: string;
  order: number;
  status: "locked" | "available" | "in_progress" | "completed";
  problemCount: number;
  completedProblems: number;
}

interface QuestTopic {
  id: string;
  name: string;
  order: number;
  status: "locked" | "available" | "in_progress" | "completed";
  lessons: QuestLesson[];
}

interface QuestPhase {
  phase: string;
  status: "locked" | "available" | "in_progress" | "completed";
  topics: QuestTopic[];
}

interface QuestData {
  hasClass: boolean;
  className?: string;
  startingPhase?: string;
  profile?: { coins: number; xp: number; level: number; streak: number };
  phases?: QuestPhase[];
}

// ── Constants ────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  FOUNDATIONS: "Foundations",
  EXPLORER: "Explorer",
  BUILDER: "Builder",
  CHALLENGER: "Challenger",
  IB_READY: "IB Ready",
};

const PHASE_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  FOUNDATIONS: { bg: "bg-green-500", ring: "ring-green-400", text: "text-green-500" },
  EXPLORER: { bg: "bg-blue-500", ring: "ring-blue-400", text: "text-blue-500" },
  BUILDER: { bg: "bg-purple-500", ring: "ring-purple-400", text: "text-purple-500" },
  CHALLENGER: { bg: "bg-amber-500", ring: "ring-amber-400", text: "text-amber-500" },
  IB_READY: { bg: "bg-red-500", ring: "ring-red-400", text: "text-red-500" },
};

const NODE_STATUS_BG: Record<string, string> = {
  locked: "bg-muted text-muted-foreground",
  available: "bg-card border-2 border-primary text-foreground",
  in_progress: "bg-card border-2 border-primary text-foreground",
  completed: "bg-green-500 text-white",
};

// ── Component ────────────────────────────────────────

export function QuestRoad() {
  const [data, setData] = useState<QuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/student/quest-road")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (data && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data?.hasClass) {
    return <JoinClassPrompt />;
  }

  const { profile, phases = [], className } = data;

  return (
    <div>
      {/* Stats header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{className}</h1>
        {profile && (
          <div className="mt-3 flex flex-wrap gap-3">
            <StatBadge icon={<Coins size={14} />} label={`${profile.coins}`} color="text-amber-500" />
            <StatBadge icon={<Zap size={14} />} label={`Lv ${profile.level}`} color="text-primary" />
            <StatBadge icon={<Flame size={14} />} label={`${profile.streak}d`} color="text-orange-500" />
            <StatBadge icon={<Star size={14} />} label={`${profile.xp} XP`} color="text-blue-500" />
          </div>
        )}
      </div>

      {/* Quest road */}
      <div className="relative">
        {/* The vertical road line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-0">
          {phases.map((phase, phaseIdx) => (
            <PhaseSection
              key={phase.phase}
              phase={phase}
              isLast={phaseIdx === phases.length - 1}
              activeRef={activeRef}
            />
          ))}

          {/* Final quest goal */}
          <div className="relative flex items-center gap-4 pl-0">
            <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
              <Crown size={24} />
            </div>
            <div>
              <p className="font-bold text-amber-600">Quest Complete!</p>
              <p className="text-xs text-muted-foreground">Master all levels</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Phase Section ────────────────────────────────────

function PhaseSection({
  phase,
  isLast,
  activeRef,
}: {
  phase: QuestPhase;
  isLast: boolean;
  activeRef: React.RefObject<HTMLDivElement | null>;
}) {
  const colors = PHASE_COLORS[phase.phase] || PHASE_COLORS.FOUNDATIONS;
  const isActive = phase.status === "in_progress" || phase.status === "available";

  return (
    <div className="mb-2">
      {/* Phase node (biggest circle) */}
      <div
        ref={isActive ? activeRef : undefined}
        className="relative flex items-center gap-4 pl-0 mb-4"
      >
        <div
          className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-lg ${
            phase.status === "locked"
              ? "bg-muted text-muted-foreground shadow-none"
              : phase.status === "completed"
              ? "bg-green-500 shadow-green-500/30"
              : `${colors.bg} shadow-lg`
          }`}
        >
          {phase.status === "locked" ? (
            <Lock size={20} />
          ) : phase.status === "completed" ? (
            <Check size={24} strokeWidth={3} />
          ) : (
            <span className="text-lg font-bold">
              {PHASE_LABELS[phase.phase]?.[0]}
            </span>
          )}
        </div>
        <div>
          <p className={`text-lg font-bold ${phase.status === "locked" ? "text-muted-foreground" : ""}`}>
            {PHASE_LABELS[phase.phase]}
          </p>
          <p className="text-xs text-muted-foreground">
            {phase.topics.length} topic{phase.topics.length !== 1 ? "s" : ""}
            {phase.status === "completed" && " · Completed"}
          </p>
        </div>
      </div>

      {/* Topics within this phase */}
      <div className="ml-3 space-y-1">
        {phase.topics.map((topic, topicIdx) => (
          <TopicSection
            key={topic.id}
            topic={topic}
            phase={phase.phase}
            isLastTopic={topicIdx === phase.topics.length - 1 && isLast}
            activeRef={activeRef}
          />
        ))}
      </div>
    </div>
  );
}

// ── Topic Section ────────────────────────────────────

function TopicSection({
  topic,
  phase,
  isLastTopic,
  activeRef,
}: {
  topic: QuestTopic;
  phase: string;
  isLastTopic: boolean;
  activeRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [expanded, setExpanded] = useState(
    topic.status === "in_progress" || topic.status === "available"
  );
  const colors = PHASE_COLORS[phase] || PHASE_COLORS.FOUNDATIONS;
  const isActive = topic.status === "in_progress" || topic.status === "available";
  const completedLessons = topic.lessons.filter((l) => l.status === "completed").length;

  return (
    <div className="mb-3">
      {/* Topic node (medium circle) */}
      <div ref={isActive && topic.status === "in_progress" ? activeRef : undefined}>
      <button
        onClick={() => topic.status !== "locked" && setExpanded(!expanded)}
        disabled={topic.status === "locked"}
        className="relative flex w-full items-center gap-3 pl-1 text-left"
      >
        <div className="relative flex items-center">
          {/* Connector line */}
          <div className="absolute left-[18px] -top-4 h-4 w-0.5 bg-border" />

          <div
            className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md transition-transform ${
              topic.status === "locked"
                ? "bg-muted text-muted-foreground shadow-none"
                : topic.status === "completed"
                ? "bg-green-500 text-white shadow-green-500/20"
                : `${colors.bg} text-white shadow-lg hover:scale-105`
            } ${topic.status === "in_progress" ? "ring-2 ring-offset-2 " + colors.ring : ""}`}
          >
            {topic.status === "locked" ? (
              <Lock size={14} />
            ) : topic.status === "completed" ? (
              <Check size={18} strokeWidth={3} />
            ) : (
              <BookOpen size={16} />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${topic.status === "locked" ? "text-muted-foreground" : ""}`}>
            {topic.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {completedLessons}/{topic.lessons.length} lessons
          </p>
        </div>

        {/* Progress indicator */}
        {topic.status !== "locked" && topic.lessons.length > 0 && (
          <div className="w-16">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${(completedLessons / topic.lessons.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </button>
      </div>

      {/* Lessons (expanded) */}
      {expanded && topic.status !== "locked" && (
        <div className="ml-6 mt-2 space-y-1 border-l border-border pl-4">
          {topic.lessons.map((lesson, lessonIdx) => (
            <LessonNode
              key={lesson.id}
              lesson={lesson}
              phase={phase}
              isLast={lessonIdx === topic.lessons.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lesson Node ──────────────────────────────────────

function LessonNode({
  lesson,
  phase,
  isLast,
}: {
  lesson: QuestLesson;
  phase: string;
  isLast: boolean;
}) {
  const content = (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
        lesson.status === "locked"
          ? "opacity-50"
          : lesson.status === "completed"
          ? "bg-green-50 dark:bg-green-950/20"
          : "hover:bg-secondary"
      }`}
    >
      {/* Small circle */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
          lesson.status === "locked"
            ? "bg-muted text-muted-foreground"
            : lesson.status === "completed"
            ? "bg-green-500 text-white"
            : lesson.status === "in_progress"
            ? "border-2 border-primary bg-card text-primary"
            : "border-2 border-border bg-card text-muted-foreground"
        }`}
      >
        {lesson.status === "locked" ? (
          <Lock size={12} />
        ) : lesson.status === "completed" ? (
          <Check size={14} strokeWidth={3} />
        ) : (
          <span className="text-xs font-bold">{lesson.order}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${lesson.status === "locked" ? "text-muted-foreground" : lesson.status === "completed" ? "text-muted-foreground" : "text-foreground"}`}>
          {lesson.title}
        </p>
      </div>

      {/* Problem progress */}
      {lesson.status !== "locked" && lesson.problemCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {lesson.completedProblems}/{lesson.problemCount}
        </span>
      )}
    </div>
  );

  if (lesson.status === "locked") {
    return content;
  }

  return (
    <Link href={`/practice?lessonId=${lesson.id}`}>
      {content}
    </Link>
  );
}

// ── Join Class Prompt ────────────────────────────────

function JoinClassPrompt() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
        <UserPlus size={36} className="text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold">Join a Class to Start</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Ask your teacher for a 6-character class code, then join to unlock your quest!
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

// ── Stat Badge ───────────────────────────────────────

function StatBadge({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium ${color}`}>
      {icon}
      {label}
    </div>
  );
}
