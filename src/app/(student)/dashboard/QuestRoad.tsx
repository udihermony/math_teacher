"use client";

import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ClipboardList,
  Star,
  BookOpen,
  UserPlus,
  Coins,
  Flame,
  Zap,
  Trophy,
  Dumbbell,
  Play,
  Compass,
  BellRing,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { FINAL_TEST_BONUS } from "@/modules/gamification/coin-constants";
import { TutorialPopup } from "@/modules/tutorial/TutorialPopup";
import { DeepDivePopup } from "@/modules/deep-dive/DeepDivePopup";

// ── Types ────────────────────────────────────────────

interface QuestLesson {
  id: string;
  title: string;
  order: number;
  status: "available" | "in_progress" | "completed";
  problemCount: number;
  completedProblems: number;
  practice: { available: boolean; requested: boolean };
  quizAvailable: boolean;
  quizRequested: boolean;
  quizCompleted: boolean;
  quizCorrect: number;
  quizTotal: number;
  passingGrade: number;
  quizProblemIds: string[];
  coins: { earned: number; total: number };
  hasTutorial: boolean;
  deepDive: { available: boolean; requested: boolean };
}

interface QuestTopic {
  id: string;
  name: string;
  order: number;
  status: "available" | "in_progress" | "completed";
  lessons: QuestLesson[];
  coins: { earned: number; total: number };
  test: {
    available: boolean;
    passed: boolean;
    requested: boolean;
    questionCount: number;
    passingGrade: number;
  };
}

interface QuestPhase {
  phase: string;
  status: "available" | "in_progress" | "completed";
  topics: QuestTopic[];
  coins: { earned: number; total: number };
  perLesson: { practice: number; quiz: number; deepDive: number };
  test: {
    available: boolean;
    passed: boolean;
    requested: boolean;
    questionCount: number;
    passingGrade: number;
    coins: number;
  };
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
  PHASE_0: "Foundations",
  PHASE_1: "Algebra",
  PHASE_2: "Functions",
  PHASE_3: "Sequences & Series",
  PHASE_4: "Trigonometry",
  PHASE_5: "Vectors & Geometry",
  PHASE_6: "Statistics",
  PHASE_7: "Differentiation",
  PHASE_8: "Integration",
  PHASE_9: "HL Topics",
  PHASE_10: "Exam Prep",
};

const PHASE_COLORS: Record<string, { bg: string; ring: string; text: string }> = {
  PHASE_0: { bg: "bg-green-500", ring: "ring-green-400", text: "text-green-500" },
  PHASE_1: { bg: "bg-blue-500", ring: "ring-blue-400", text: "text-blue-500" },
  PHASE_2: { bg: "bg-indigo-500", ring: "ring-indigo-400", text: "text-indigo-500" },
  PHASE_3: { bg: "bg-purple-500", ring: "ring-purple-400", text: "text-purple-500" },
  PHASE_4: { bg: "bg-amber-500", ring: "ring-amber-400", text: "text-amber-500" },
  PHASE_5: { bg: "bg-teal-500", ring: "ring-teal-400", text: "text-teal-500" },
  PHASE_6: { bg: "bg-rose-500", ring: "ring-rose-400", text: "text-rose-500" },
  PHASE_7: { bg: "bg-orange-500", ring: "ring-orange-400", text: "text-orange-500" },
  PHASE_8: { bg: "bg-red-500", ring: "ring-red-400", text: "text-red-500" },
  PHASE_9: { bg: "bg-violet-500", ring: "ring-violet-400", text: "text-violet-500" },
  PHASE_10: { bg: "bg-slate-500", ring: "ring-slate-400", text: "text-slate-500" },
};

const TutorialContext = createContext<(lessonId: string) => void>(() => {});
const DeepDiveContext = createContext<(lessonId: string) => void>(() => {});
const QuestRefreshContext = createContext<() => Promise<void>>(async () => {});

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
  const [tutorialLessonId, setTutorialLessonId] = useState<string | null>(null);
  const [deepDiveLessonId, setDeepDiveLessonId] = useState<string | null>(null);

  const refreshQuest = useCallback(async () => {
    const response = await fetch("/api/student/quest-road");
    const next = await response.json();
    setData(next);
  }, []);

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
    <TutorialContext.Provider value={(id) => setTutorialLessonId(id)}>
    <DeepDiveContext.Provider value={(id) => setDeepDiveLessonId(id)}>
    <QuestRefreshContext.Provider value={refreshQuest}>
    <div>
      {tutorialLessonId && (
        <TutorialPopup
          lessonId={tutorialLessonId}
          onClose={() => setTutorialLessonId(null)}
        />
      )}
      {deepDiveLessonId && (
        <DeepDivePopup
          lessonId={deepDiveLessonId}
          onClose={() => setDeepDiveLessonId(null)}
          onCoinsEarned={() => {
            refreshQuest();
          }}
        />
      )}
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
          {phases.map((phase) => (
            <PhaseSection
              key={phase.phase}
              phase={phase}
              activeRef={activeRef}
            />
          ))}

          {/* Final test */}
          <FinalTestNode finalTest={finalTest} />
        </div>
      </div>
    </div>
    </QuestRefreshContext.Provider>
    </DeepDiveContext.Provider>
    </TutorialContext.Provider>
  );
}

// ── Final Test Node ─────────────────────────────────

function FinalTestNode({ finalTest }: { finalTest?: QuestData["finalTest"] }) {
  const unlocked = finalTest?.unlocked ?? false;
  const completed = finalTest?.completed ?? false;
  const bonus = finalTest?.coins ?? FINAL_TEST_BONUS;

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
  activeRef,
}: {
  phase: QuestPhase;
  activeRef: React.RefObject<HTMLDivElement | null>;
}) {
  const colors = PHASE_COLORS[phase.phase] || PHASE_COLORS.PHASE_0;
  const isActive = phase.status === "in_progress" || phase.status === "available";
  const [expanded, setExpanded] = useState(false);

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
            phase.status === "completed"
              ? "bg-green-500 shadow-green-500/30"
              : `${colors.bg} shadow-lg`
          }`}
        >
          {phase.status === "completed" ? (
            <Check size={24} strokeWidth={3} />
          ) : (
            <span className="text-lg font-bold">
              {PHASE_LABELS[phase.phase]?.[0]}
            </span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-lg font-bold">
            {PHASE_LABELS[phase.phase]}
          </p>
          <p className="text-xs text-muted-foreground">
            {completedTopics}/{phase.topics.length} topics passed · {progressPct}%
            {phase.status === "completed" && " · Level Passed!"}
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            Per lesson: {phase.perLesson.practice} practice · {phase.perLesson.quiz} quiz
            {phase.perLesson.deepDive > 0 && ` · ${phase.perLesson.deepDive} deep dive`}
          </p>
        </div>

        {/* Phase coins */}
        <span className={`flex items-center gap-1 text-xs font-medium ${phase.coins.earned > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
          <Coins size={12} />
          {phase.coins.earned}/{phase.coins.total}
        </span>

        <ChevronDown
          size={18}
          className={`text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
      </button>

      {/* Phase action buttons */}
      <PhaseActions phase={phase} />
      </div>

      {/* Topics within this phase */}
      {expanded && (
        <div className="ml-3 space-y-1">
          {phase.topics.map((topic) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              phase={phase.phase}
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
    t.lessons.some((l) => l.practice.available)
  );

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
      <TestActionButton
        label={phase.test.passed ? "Retake Level Test" : "Level Test"}
        requestLabel="Level Test"
        available={phase.test.available}
        requested={phase.test.requested}
        requestBody={{ type: "PHASE_TEST", phase: phase.phase }}
      />
    </div>
  );
}

// ── Topic Section ────────────────────────────────────

function TopicSection({
  topic,
  phase,
  activeRef,
}: {
  topic: QuestTopic;
  phase: string;
  activeRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [expanded, setExpanded] = useState(
    topic.status === "in_progress" || topic.status === "available"
  );
  const colors = PHASE_COLORS[phase] || PHASE_COLORS.PHASE_0;
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
              topic.status === "completed"
                ? "bg-green-500 text-white shadow-green-500/20"
                : `${colors.bg} text-white shadow-lg hover:scale-105`
            } ${topic.status === "in_progress" ? "ring-2 ring-offset-2 " + colors.ring : ""}`}
          >
            {topic.status === "completed" ? (
              <Check size={18} strokeWidth={3} />
            ) : (
              <BookOpen size={16} />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">
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
          <span className={`ml-1 inline-flex items-center gap-0.5 text-xs ${topic.coins.earned > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
            &middot; <Coins size={10} /> {topic.coins.earned}/{topic.coins.total}
          </span>
        </div>

        {/* Progress bar */}
        {topic.lessons.length > 0 && (
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
      <TopicActions topic={topic} />
      </div>

      {/* Lessons */}
      {expanded && (
        <div className="ml-6 mt-2 space-y-1 border-l border-border pl-4">
          {topic.lessons.map((lesson) => (
            <LessonNode
              key={lesson.id}
              lesson={lesson}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicActions({ topic }: { topic: QuestTopic }) {
  const hasPractice = topic.lessons.some((l) => l.practice.available);

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
      <TestActionButton
        label={topic.test.passed ? "Retake Topic Test" : "Topic Test"}
        requestLabel="Topic Test"
        available={topic.test.available}
        requested={topic.test.requested}
        requestBody={{ type: "TOPIC_TEST", topicId: topic.id }}
      />
    </div>
  );
}

// ── Lesson Node ──────────────────────────────────────

function LessonNode({
  lesson,
}: {
  lesson: QuestLesson;
}) {
  const progressPct = lesson.problemCount > 0 ? pct(lesson.completedProblems, lesson.problemCount) : 0;

  const content = (
    <div
      className={`rounded-lg px-3 py-2 transition-colors ${
        lesson.status === "completed"
          ? "bg-green-50 dark:bg-green-950/20"
          : "hover:bg-secondary"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Small circle */}
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${
            lesson.status === "completed"
              ? "bg-green-500 text-white"
              : lesson.status === "in_progress"
              ? "border-2 border-primary bg-card text-primary"
              : "border-2 border-border bg-card text-muted-foreground"
          }`}
        >
          {lesson.status === "completed" ? (
            <Check size={14} strokeWidth={3} />
          ) : (
            <span className="text-xs font-bold">{lesson.order}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${lesson.status === "completed" ? "text-muted-foreground" : "text-foreground"}`}>
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
        {lesson.problemCount > 0 && (
          <span className={`text-xs font-medium ${lesson.status === "completed" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
            {progressPct}%
          </span>
        )}
      </div>

      {/* Lesson details row */}
      <div className="ml-10 mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        {/* Practice progress */}
        {lesson.practice.available && (
          <span className="flex items-center gap-1">
            <BookOpen size={11} />
            {lesson.completedProblems}/{lesson.problemCount}
          </span>
        )}

        {/* Quiz status */}
        {lesson.quizAvailable && (
          <span className={`flex items-center gap-1 ${lesson.quizCompleted ? "text-green-500" : ""}`}>
            {lesson.quizCompleted ? <Check size={11} strokeWidth={3} /> : <ClipboardList size={11} />}
            Quiz {lesson.quizCorrect}/{lesson.quizTotal}
            {lesson.passingGrade < lesson.quizTotal && ` (${lesson.passingGrade} to pass)`}
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
      <div className="ml-10 mt-1.5 flex items-center gap-2">
          {lesson.hasTutorial && (
            <LearnButton lessonId={lesson.id} />
          )}
          <DeepDiveButton
            lessonId={lesson.id}
            available={lesson.deepDive.available}
            requested={lesson.deepDive.requested}
          />
          <LessonActionButton
            available={lesson.practice.available}
            requested={lesson.practice.requested}
            label="Practice"
            requestLabel="Practice"
            href={`/practice?lessonId=${lesson.id}`}
            requestBody={{ type: "PRACTICE", lessonId: lesson.id }}
            variant="secondary"
            icon={<Dumbbell size={11} />}
          />
          <LessonActionButton
            available={lesson.quizAvailable}
            requested={lesson.quizRequested}
            label={lesson.quizCompleted ? "Retake Quiz" : "Take Quiz"}
            requestLabel="Quiz"
            href={`/practice?ids=${lesson.quizProblemIds.join(",")}&passingGrade=${lesson.passingGrade}`}
            requestBody={{ type: "LESSON_QUIZ", lessonId: lesson.id }}
            variant="primary"
            icon={<ClipboardList size={11} />}
          />
        </div>
    </div>
  );

  return content;
}

function LearnButton({ lessonId }: { lessonId: string }) {
  const openTutorial = useContext(TutorialContext);
  return (
    <button
      onClick={() => openTutorial(lessonId)}
      className="flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
    >
      <Play size={11} />
      Learn
    </button>
  );
}

function DeepDiveButton({
  lessonId,
  available,
  requested,
}: {
  lessonId: string;
  available: boolean;
  requested: boolean;
}) {
  const openDeepDive = useContext(DeepDiveContext);
  const refreshQuest = useContext(QuestRefreshContext);
  const [submitting, setSubmitting] = useState(false);

  async function requestDeepDive() {
    if (requested || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/student/content-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DEEP_DIVE", lessonId }),
      });
      await refreshQuest();
    } finally {
      setSubmitting(false);
    }
  }

  if (!available) {
    return (
      <button
        onClick={requestDeepDive}
        disabled={requested || submitting}
        className="flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-default disabled:opacity-70 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
      >
        <BellRing size={11} />
        {requested ? "Deep Dive Requested" : "Request Deep Dive"}
      </button>
    );
  }

  return (
    <button
      onClick={() => openDeepDive(lessonId)}
      className="flex items-center gap-1 rounded-md border border-purple-300 bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400 dark:hover:bg-purple-950/50"
    >
      <Compass size={11} />
      Deep Dive
    </button>
  );
}

function LessonActionButton({
  available,
  requested,
  label,
  requestLabel,
  href,
  requestBody,
  variant,
  icon,
}: {
  available: boolean;
  requested: boolean;
  label: string;
  requestLabel: string;
  href: string;
  requestBody: { type: "PRACTICE" | "LESSON_QUIZ"; lessonId: string };
  variant: "secondary" | "primary";
  icon: React.ReactNode;
}) {
  const refreshQuest = useContext(QuestRefreshContext);
  const [submitting, setSubmitting] = useState(false);

  async function createRequest() {
    if (requested || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/student/content-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      await refreshQuest();
    } finally {
      setSubmitting(false);
    }
  }

  if (available) {
    const className = variant === "primary"
      ? "flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90"
      : "flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary/80";
    return (
      <Link href={href} className={className}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button
      onClick={createRequest}
      disabled={requested || submitting}
      className="flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-default disabled:opacity-70 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
    >
      <BellRing size={11} />
      {requested ? `${requestLabel} Requested` : `Request ${requestLabel}`}
    </button>
  );
}

function TestActionButton({
  label,
  requestLabel,
  available,
  requested,
  requestBody,
}: {
  label: string;
  requestLabel: string;
  available: boolean;
  requested: boolean;
  requestBody: { type: "TOPIC_TEST"; topicId: string } | { type: "PHASE_TEST"; phase: string };
}) {
  const refreshQuest = useContext(QuestRefreshContext);
  const [submitting, setSubmitting] = useState(false);

  async function createRequest() {
    if (requested || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/student/content-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      await refreshQuest();
    } finally {
      setSubmitting(false);
    }
  }

  if (available) {
    return (
      <Link
        href="/tests"
        className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:opacity-90"
      >
        <ClipboardList size={11} />
        {label}
      </Link>
    );
  }

  return (
    <button
      onClick={createRequest}
      disabled={requested || submitting}
      className="flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-default disabled:opacity-70 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
    >
      <BellRing size={11} />
      {requested ? `${requestLabel} Requested` : `Request ${requestLabel}`}
    </button>
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
