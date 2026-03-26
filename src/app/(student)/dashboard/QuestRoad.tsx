"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Lock,
  Check,
  ChevronDown,
  ClipboardList,
  Crown,
  Star,
  BookOpen,
  UserPlus,
  Coins,
  Flame,
  Zap,
  Trophy,
  Dumbbell,
  Play,
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
  hasQuiz: boolean;
  quizCompleted: boolean;
  quizCorrect: number;
  quizTotal: number;
  passingGrade: number;
  quizProblemIds: string[];
  coins: { earned: number; total: number };
}

interface QuestTopic {
  id: string;
  name: string;
  order: number;
  status: "locked" | "available" | "in_progress" | "completed";
  lessons: QuestLesson[];
  coins: { earned: number; total: number };
}

interface QuestPhase {
  phase: string;
  status: "locked" | "available" | "in_progress" | "completed";
  topics: QuestTopic[];
  coins: { earned: number; total: number };
}

interface QuestData {
  hasClass: boolean;
  className?: string;
  startingPhase?: string;
  profile?: { coins: number; xp: number; level: number; streak: number };
  phases?: QuestPhase[];
  totalCoins?: { earned: number; total: number };
  finalTest?: { unlocked: boolean; completed: boolean; coins: number };
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

// ── Helpers ──────────────────────────────────────────

function pct(earned: number, total: number) {
  if (total === 0) return 0;
  return Math.round((earned / total) * 100);
}

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

  const { profile, phases = [], className, totalCoins, finalTest } = data;

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

        {/* Overall coins progress */}
        {totalCoins && totalCoins.total > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                <Coins size={14} />
                Quest Coins
              </span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                {totalCoins.earned}/{totalCoins.total} ({pct(totalCoins.earned, totalCoins.total)}%)
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/40">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${pct(totalCoins.earned, totalCoins.total)}%` }}
              />
            </div>
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

          {/* Final test */}
          <FinalTestNode finalTest={finalTest} />
        </div>
      </div>
    </div>
  );
}

// ── Final Test Node ─────────────────────────────────

function FinalTestNode({ finalTest }: { finalTest?: QuestData["finalTest"] }) {
  const unlocked = finalTest?.unlocked ?? false;
  const completed = finalTest?.completed ?? false;
  const bonus = finalTest?.coins ?? 50;

  return (
    <div className="relative flex items-center gap-4 pl-0">
      <div
        className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full shadow-lg ${
          completed
            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30"
            : unlocked
            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30 animate-pulse"
            : "bg-muted text-muted-foreground shadow-none"
        }`}
      >
        {completed ? <Check size={24} strokeWidth={3} /> : <Trophy size={24} />}
      </div>
      <div className="flex-1">
        <p className={`font-bold ${completed ? "text-amber-600" : unlocked ? "text-amber-600" : "text-muted-foreground"}`}>
          Final Quest Test
        </p>
        <p className="text-xs text-muted-foreground">
          {completed
            ? "Completed! Quest mastered!"
            : unlocked
            ? "All levels complete — take the final test!"
            : "Complete all levels to unlock"}
        </p>
      </div>
      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
        completed
          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          : "bg-muted text-muted-foreground"
      }`}>
        <Coins size={11} />
        {completed ? bonus : 0}/{bonus}
      </span>
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
  const [expanded, setExpanded] = useState(
    phase.status === "in_progress" || phase.status === "available"
  );

  const completedTopics = phase.topics.filter((t) => t.status === "completed").length;
  const progressPct = phase.topics.length > 0 ? pct(completedTopics, phase.topics.length) : 0;

  return (
    <div className="mb-2">
      {/* Phase node */}
      <div ref={isActive ? activeRef : undefined}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="relative flex w-full items-center gap-4 pl-0 mb-4 text-left"
      >
        <div
          className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-transform ${
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
        <div className="flex-1">
          <p className={`text-lg font-bold ${phase.status === "locked" ? "text-muted-foreground" : ""}`}>
            {PHASE_LABELS[phase.phase]}
          </p>
          <p className="text-xs text-muted-foreground">
            {completedTopics}/{phase.topics.length} topics passed
            {phase.status !== "locked" && ` · ${progressPct}%`}
            {phase.status === "completed" && " · Level Passed!"}
          </p>
        </div>

        {/* Phase coins */}
        {phase.status !== "locked" && (
          <span className={`flex items-center gap-1 text-xs font-medium ${phase.coins.earned > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
            <Coins size={12} />
            {phase.coins.earned}/{phase.coins.total}
          </span>
        )}

        <ChevronDown
          size={18}
          className={`text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
      </button>

      {/* Phase action buttons */}
      {phase.status !== "locked" && (
        <PhaseActions phase={phase} />
      )}
      </div>

      {/* Topics within this phase */}
      {expanded && (
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
      )}
    </div>
  );
}

function PhaseActions({ phase }: { phase: QuestPhase }) {
  const hasPractice = phase.topics.some((t) =>
    t.lessons.some((l) => l.problemCount > 0 && l.status !== "locked")
  );
  const allQuizIds = phase.topics
    .flatMap((t) => t.lessons)
    .filter((l) => l.hasQuiz && l.status !== "locked")
    .flatMap((l) => l.quizProblemIds);

  if (!hasPractice && allQuizIds.length === 0) return null;

  return (
    <div className="ml-[72px] -mt-2 mb-3 flex items-center gap-2">
      {hasPractice && (
        <Link
          href={`/practice?phase=${phase.phase}`}
          className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80"
        >
          <Dumbbell size={12} />
          Practice Level
        </Link>
      )}
      {allQuizIds.length > 0 && (
        <Link
          href={`/practice?ids=${allQuizIds.join(",")}`}
          className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <ClipboardList size={12} />
          Level Test
        </Link>
      )}
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
  const progressPct = topic.lessons.length > 0 ? pct(completedLessons, topic.lessons.length) : 0;

  return (
    <div className="mb-3">
      {/* Topic node */}
      <div ref={isActive && topic.status === "in_progress" ? activeRef : undefined}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="relative flex w-full items-center gap-3 pl-1 text-left"
      >
        <div className="relative flex items-center">
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
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold truncate ${topic.status === "locked" ? "text-muted-foreground" : ""}`}>
              {topic.name}
            </p>
            {topic.status === "completed" && (
              <span className="flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-950/30 dark:text-green-400">
                <Check size={9} strokeWidth={3} />
                Passed
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {completedLessons}/{topic.lessons.length} passed &middot; {progressPct}%
          </span>
          {topic.status !== "locked" && (
            <span className={`ml-1 inline-flex items-center gap-0.5 text-xs ${topic.coins.earned > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
              &middot; <Coins size={10} /> {topic.coins.earned}/{topic.coins.total}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {topic.status !== "locked" && topic.lessons.length > 0 && (
          <div className="w-16">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {/* Topic action buttons */}
      {topic.status !== "locked" && (
        <TopicActions topic={topic} />
      )}
      </div>

      {/* Lessons */}
      {expanded && (
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

function TopicActions({ topic }: { topic: QuestTopic }) {
  const hasPractice = topic.lessons.some((l) => l.problemCount > 0 && l.status !== "locked");
  const allQuizIds = topic.lessons
    .filter((l) => l.hasQuiz && l.status !== "locked")
    .flatMap((l) => l.quizProblemIds);

  if (!hasPractice && allQuizIds.length === 0) return null;

  return (
    <div className="ml-14 mt-1 flex items-center gap-2">
      {hasPractice && (
        <Link
          href={`/practice?topicId=${topic.id}`}
          className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary/80"
        >
          <Dumbbell size={11} />
          Practice All
        </Link>
      )}
      {allQuizIds.length > 0 && (
        <Link
          href={`/practice?ids=${allQuizIds.join(",")}`}
          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90"
        >
          <ClipboardList size={11} />
          Topic Test
        </Link>
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
  const progressPct = lesson.problemCount > 0 ? pct(lesson.completedProblems, lesson.problemCount) : 0;

  const content = (
    <div
      className={`rounded-lg px-3 py-2 transition-colors ${
        lesson.status === "locked"
          ? "opacity-50"
          : lesson.status === "completed"
          ? "bg-green-50 dark:bg-green-950/20"
          : "hover:bg-secondary"
      }`}
    >
      <div className="flex items-center gap-3">
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

        {/* Passed badge */}
        {lesson.status === "completed" && (
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700 dark:bg-green-950/30 dark:text-green-400">
            <Check size={10} strokeWidth={3} />
            Passed
          </span>
        )}

        {/* Practice progress % */}
        {lesson.status !== "locked" && lesson.problemCount > 0 && (
          <span className={`text-xs font-medium ${lesson.status === "completed" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
            {progressPct}%
          </span>
        )}
      </div>

      {/* Lesson details row */}
      <div className="ml-10 mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        {/* Practice progress */}
        {lesson.problemCount > 0 && (
          <span className="flex items-center gap-1">
            <BookOpen size={11} />
            {lesson.completedProblems}/{lesson.problemCount}
          </span>
        )}

        {/* Quiz status */}
        {lesson.hasQuiz && (
          <span className={`flex items-center gap-1 ${lesson.quizCompleted ? "text-green-500" : ""}`}>
            {lesson.quizCompleted ? <Check size={11} strokeWidth={3} /> : <ClipboardList size={11} />}
            Quiz {lesson.quizCorrect}/{lesson.passingGrade}
            {lesson.quizCompleted ? " passed" : ""}
          </span>
        )}

        {/* Coins */}
        <span className={`flex items-center gap-1 ${lesson.coins.earned > 0 ? "text-amber-500" : ""}`}>
          <Coins size={11} />
          {lesson.coins.earned}/{lesson.coins.total}
        </span>
      </div>

      {/* Action buttons */}
      {lesson.status !== "locked" && (
        <div className="ml-10 mt-1.5 flex items-center gap-2">
          {lesson.problemCount > 0 && (
            <Link
              href={`/practice?lessonId=${lesson.id}`}
              className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary/80"
            >
              <Dumbbell size={11} />
              Practice
            </Link>
          )}
          {lesson.hasQuiz && (
            <Link
              href={`/practice?ids=${lesson.quizProblemIds.join(",")}`}
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90"
            >
              <ClipboardList size={11} />
              {lesson.quizCompleted ? "Retake Quiz" : "Take Quiz"}
            </Link>
          )}
        </div>
      )}
    </div>
  );

  return content;
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
