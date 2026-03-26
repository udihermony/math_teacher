"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  Coins,
  Flame,
  Lock,
  Star,
  Zap,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface ProgressLesson {
  id: string;
  title: string;
  order: number;
  status: "locked" | "available" | "in_progress" | "completed";
  problemCount: number;
  completedProblems: number;
  hasQuiz: boolean;
  quizCompleted: boolean;
  coins: { earned: number; total: number };
}

interface ProgressTopic {
  id: string;
  name: string;
  order: number;
  status: "locked" | "available" | "in_progress" | "completed";
  lessons: ProgressLesson[];
  coins: { earned: number; total: number };
}

interface ProgressPhase {
  phase: string;
  status: "locked" | "available" | "in_progress" | "completed";
  topics: ProgressTopic[];
  coins: { earned: number; total: number };
}

interface ProgressData {
  student: { id: string; name: string; email: string };
  profile: { coins: number; xp: number; level: number; streak: number };
  phases: ProgressPhase[];
  totalCoins: { earned: number; total: number };
}

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

const PHASE_COLORS: Record<string, string> = {
  PHASE_0: "bg-green-500",
  PHASE_1: "bg-blue-500",
  PHASE_2: "bg-purple-500",
  PHASE_3: "bg-amber-500",
  PHASE_4: "bg-red-500",
  PHASE_5: "bg-teal-500",
  PHASE_6: "bg-orange-500",
  PHASE_7: "bg-rose-500",
  PHASE_8: "bg-cyan-500",
  PHASE_9: "bg-indigo-500",
  PHASE_10: "bg-violet-500",
};

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

interface Props {
  classId: string;
  studentId: string;
  onBack: () => void;
}

export function StudentProgressView({ classId, studentId, onBack }: Props) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teacher/student-progress?classId=${classId}&studentId=${studentId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [classId, studentId]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">Failed to load student progress.</p>;
  }

  const { student, profile, phases, totalCoins } = data;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to class
      </button>

      {/* Student header */}
      <div className="mb-4">
        <h3 className="text-lg font-bold">{student.name}</h3>
        <p className="text-sm text-muted-foreground">{student.email}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatPill icon={<Coins size={12} />} label={`${profile.coins}`} color="text-amber-500" />
          <StatPill icon={<Zap size={12} />} label={`Lv ${profile.level}`} color="text-primary" />
          <StatPill icon={<Flame size={12} />} label={`${profile.streak}d`} color="text-orange-500" />
          <StatPill icon={<Star size={12} />} label={`${profile.xp} XP`} color="text-blue-500" />
        </div>
      </div>

      {/* Total coins bar */}
      {totalCoins.total > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
              <Coins size={12} /> Quest Coins
            </span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {totalCoins.earned}/{totalCoins.total} ({pct(totalCoins.earned, totalCoins.total)}%)
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900/40">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${pct(totalCoins.earned, totalCoins.total)}%` }}
            />
          </div>
        </div>
      )}

      {/* Phases */}
      <div className="space-y-2">
        {phases.map((phase) => (
          <PhaseRow key={phase.phase} phase={phase} />
        ))}
      </div>
    </div>
  );
}

function PhaseRow({ phase }: { phase: ProgressPhase }) {
  const [expanded, setExpanded] = useState(
    phase.status === "in_progress" || phase.status === "available"
  );
  const color = PHASE_COLORS[phase.phase] || PHASE_COLORS.PHASE_0;
  const completedTopics = phase.topics.filter((t) => t.status === "completed").length;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 text-left mb-1"
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold ${
          phase.status === "locked" ? "bg-muted text-muted-foreground" :
          phase.status === "completed" ? "bg-green-500" : color
        }`}>
          {phase.status === "locked" ? <Lock size={12} /> :
           phase.status === "completed" ? <Check size={14} strokeWidth={3} /> :
           PHASE_LABELS[phase.phase]?.[0]}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${phase.status === "locked" ? "text-muted-foreground" : ""}`}>
            {PHASE_LABELS[phase.phase]}
            {phase.status === "completed" && <span className="ml-1.5 text-xs font-bold text-green-600">Passed</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {completedTopics}/{phase.topics.length} topics passed &middot; {pct(completedTopics, phase.topics.length)}%
          </p>
        </div>
        {phase.status !== "locked" && (
          <span className={`text-xs ${phase.coins.earned > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
            <Coins size={10} className="inline mr-0.5" />{phase.coins.earned}/{phase.coins.total}
          </span>
        )}
        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`} />
      </button>

      {expanded && (
        <div className="ml-4 space-y-1 border-l border-border pl-3">
          {phase.topics.map((topic) => (
            <TopicRow key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic }: { topic: ProgressTopic }) {
  const [expanded, setExpanded] = useState(false);
  const completedLessons = topic.lessons.filter((l) => l.status === "completed").length;

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
      >
        <BookOpen size={12} className="shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${topic.status === "locked" ? "text-muted-foreground" : ""}`}>
            {topic.name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {completedLessons}/{topic.lessons.length} passed &middot; {pct(completedLessons, topic.lessons.length)}%
            {topic.status !== "locked" && (
              <> &middot; <Coins size={9} className="inline" /> {topic.coins.earned}/{topic.coins.total}</>
            )}
          </p>
        </div>
        {topic.status !== "locked" && topic.lessons.length > 0 && (
          <div className="w-12">
            <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${pct(completedLessons, topic.lessons.length)}%` }} />
            </div>
          </div>
        )}
        <ChevronDown size={12} className={`text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`} />
      </button>

      {expanded && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-2">
          {topic.lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonRow({ lesson }: { lesson: ProgressLesson }) {
  const progressPct = lesson.problemCount > 0 ? pct(lesson.completedProblems, lesson.problemCount) : 0;

  return (
    <div className={`rounded px-2 py-1 text-xs ${
      lesson.status === "locked" ? "opacity-50" :
      lesson.status === "completed" ? "bg-green-50 dark:bg-green-950/20" : ""
    }`}>
      <div className="flex items-center gap-2">
        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
          lesson.status === "locked" ? "bg-muted text-muted-foreground" :
          lesson.status === "completed" ? "bg-green-500 text-white" :
          lesson.status === "in_progress" ? "border border-primary bg-card text-primary" :
          "border border-border bg-card text-muted-foreground"
        }`}>
          {lesson.status === "locked" ? <Lock size={8} /> :
           lesson.status === "completed" ? <Check size={10} strokeWidth={3} /> :
           lesson.order}
        </div>
        <span className={`flex-1 truncate ${lesson.status === "locked" ? "text-muted-foreground" : ""}`}>
          {lesson.title}
        </span>
        {lesson.status === "completed" && (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-green-700 dark:bg-green-950/30 dark:text-green-400">
            Passed
          </span>
        )}
        {lesson.status !== "locked" && lesson.problemCount > 0 && (
          <span className={`text-[10px] font-medium ${lesson.status === "completed" ? "text-green-600" : "text-muted-foreground"}`}>
            {progressPct}%
          </span>
        )}
      </div>
      {lesson.status !== "locked" && (
        <div className="ml-7 mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          {lesson.problemCount > 0 && (
            <span className="flex items-center gap-0.5">
              <BookOpen size={9} /> {lesson.completedProblems}/{lesson.problemCount}
            </span>
          )}
          {lesson.hasQuiz && (
            <span className={lesson.quizCompleted ? "text-green-500" : ""}>
              {lesson.quizCompleted ? <Check size={9} className="inline" /> : <ClipboardList size={9} className="inline" />}
              {" Quiz "}{lesson.quizCompleted ? "passed" : "0/1"}
            </span>
          )}
          <span className={lesson.coins.earned > 0 ? "text-amber-500" : ""}>
            <Coins size={9} className="inline" /> {lesson.coins.earned}/{lesson.coins.total}
          </span>
        </div>
      )}
    </div>
  );
}

function StatPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <span className={`flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium ${color}`}>
      {icon} {label}
    </span>
  );
}
