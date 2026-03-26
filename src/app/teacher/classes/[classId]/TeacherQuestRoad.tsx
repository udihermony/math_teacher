"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  BookOpen,
  Check,
  Sparkles,
  Loader2,
  Dumbbell,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface TeacherLesson {
  id: string;
  title: string;
  order: number;
  practiceCount: number;
  assignmentCount: number;
  hasQuiz: boolean;
}

interface TeacherTopic {
  id: string;
  name: string;
  order: number;
  lessons: TeacherLesson[];
}

interface TeacherPhase {
  phase: string;
  topics: TeacherTopic[];
}

const PHASE_LABELS: Record<string, string> = {
  FOUNDATIONS: "Foundations",
  EXPLORER: "Explorer",
  BUILDER: "Builder",
  CHALLENGER: "Challenger",
  IB_READY: "IB Ready",
};

const PHASE_COLORS: Record<string, string> = {
  FOUNDATIONS: "bg-green-500",
  EXPLORER: "bg-blue-500",
  BUILDER: "bg-purple-500",
  CHALLENGER: "bg-amber-500",
  IB_READY: "bg-red-500",
};

interface Props {
  classId: string;
  onQuizGenerated?: () => void;
}

export function TeacherQuestRoad({ classId, onQuizGenerated }: Props) {
  const [phases, setPhases] = useState<TeacherPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingExercises, setGeneratingExercises] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teacher/quest-road?classId=${classId}`)
      .then((r) => r.json())
      .then((d) => { setPhases(d.phases || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [classId]);

  async function generateQuiz(lessonId: string, questionCount: number) {
    setGenerating(lessonId);
    try {
      const res = await fetch(`/api/classes/${classId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, questionCount }),
      });
      if (res.ok) {
        setPhases((prev) =>
          prev.map((p) => ({
            ...p,
            topics: p.topics.map((t) => ({
              ...t,
              lessons: t.lessons.map((l) =>
                l.id === lessonId ? { ...l, hasQuiz: true } : l
              ),
            })),
          }))
        );
        onQuizGenerated?.();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to generate quiz");
      }
    } catch {
      alert("Failed to generate quiz");
    }
    setGenerating(null);
  }

  async function generateForMultipleLessons(lessons: TeacherLesson[]) {
    const unassigned = lessons.filter((l) => !l.hasQuiz);
    if (unassigned.length === 0) return;

    for (const lesson of unassigned) {
      await generateQuiz(lesson.id, 5);
    }
  }

  async function generateExercises(lessonId: string, count: number) {
    setGeneratingExercises(lessonId);
    try {
      const res = await fetch("/api/teacher/generate-practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, count }),
      });
      if (res.ok) {
        const data = await res.json();
        setPhases((prev) =>
          prev.map((p) => ({
            ...p,
            topics: p.topics.map((t) => ({
              ...t,
              lessons: t.lessons.map((l) =>
                l.id === lessonId
                  ? { ...l, practiceCount: l.practiceCount + data.created }
                  : l
              ),
            })),
          }))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Failed to generate exercises");
      }
    } catch {
      alert("Failed to generate exercises");
    }
    setGeneratingExercises(null);
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {phases.map((phase) => (
        <PhaseSection
          key={phase.phase}
          phase={phase}
          generating={generating}
          generatingExercises={generatingExercises}
          onGenerateQuiz={generateQuiz}
          onGenerateBatch={generateForMultipleLessons}
          onGenerateExercises={generateExercises}
        />
      ))}
    </div>
  );
}

function PhaseSection({
  phase,
  generating,
  generatingExercises,
  onGenerateQuiz,
  onGenerateBatch,
  onGenerateExercises,
}: {
  phase: TeacherPhase;
  generating: string | null;
  generatingExercises: string | null;
  onGenerateQuiz: (lessonId: string, count: number) => void;
  onGenerateBatch: (lessons: TeacherLesson[]) => void;
  onGenerateExercises: (lessonId: string, count: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const color = PHASE_COLORS[phase.phase] || PHASE_COLORS.FOUNDATIONS;
  const totalLessons = phase.topics.reduce((s, t) => s + t.lessons.length, 0);
  const quizCount = phase.topics.reduce(
    (s, t) => s + t.lessons.filter((l) => l.hasQuiz).length,
    0
  );
  const allLessons = phase.topics.flatMap((t) => t.lessons);
  const unassignedCount = allLessons.filter((l) => !l.hasQuiz).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${color}`}>
            <span className="text-sm font-bold">{PHASE_LABELS[phase.phase]?.[0]}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold">{PHASE_LABELS[phase.phase]}</p>
            <p className="text-xs text-muted-foreground">
              {phase.topics.length} topics &middot; {totalLessons} lessons &middot; {quizCount} quizzes assigned
            </p>
          </div>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`}
          />
        </button>

        {unassignedCount > 0 && (
          <button
            onClick={() => onGenerateBatch(allLessons)}
            disabled={!!generating}
            className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
            title={`Generate quizzes for all ${unassignedCount} unassigned lessons in this level`}
          >
            <Sparkles size={12} />
            Level Test ({unassignedCount})
          </button>
        )}
      </div>

      {expanded && (
        <div className="ml-3 space-y-2 border-l border-border pl-4">
          {phase.topics.map((topic) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              generating={generating}
              generatingExercises={generatingExercises}
              onGenerateQuiz={onGenerateQuiz}
              onGenerateBatch={onGenerateBatch}
              onGenerateExercises={onGenerateExercises}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicSection({
  topic,
  generating,
  generatingExercises,
  onGenerateQuiz,
  onGenerateBatch,
  onGenerateExercises,
}: {
  topic: TeacherTopic;
  generating: string | null;
  generatingExercises: string | null;
  onGenerateQuiz: (lessonId: string, count: number) => void;
  onGenerateBatch: (lessons: TeacherLesson[]) => void;
  onGenerateExercises: (lessonId: string, count: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const practiceTotal = topic.lessons.reduce((s, l) => s + l.practiceCount, 0);
  const quizCount = topic.lessons.filter((l) => l.hasQuiz).length;
  const unassignedCount = topic.lessons.filter((l) => !l.hasQuiz).length;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <BookOpen size={14} className="shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{topic.name}</p>
            <p className="text-xs text-muted-foreground">
              {topic.lessons.length} lessons &middot; {practiceTotal} practice Qs &middot; {quizCount}/{topic.lessons.length} quizzes
            </p>
          </div>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`}
          />
        </button>

        {unassignedCount > 0 && (
          <button
            onClick={() => onGenerateBatch(topic.lessons)}
            disabled={!!generating}
            className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
            title={`Generate quizzes for all ${unassignedCount} unassigned lessons in this topic`}
          >
            <Sparkles size={12} />
            All ({unassignedCount})
          </button>
        )}
      </div>

      {expanded && (
        <div className="ml-5 mt-1 space-y-1 border-l border-border/50 pl-3">
          {topic.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              generating={generating}
              generatingExercises={generatingExercises}
              onGenerateQuiz={onGenerateQuiz}
              onGenerateExercises={onGenerateExercises}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonRow({
  lesson,
  generating,
  generatingExercises,
  onGenerateQuiz,
  onGenerateExercises,
}: {
  lesson: TeacherLesson;
  generating: string | null;
  generatingExercises: string | null;
  onGenerateQuiz: (lessonId: string, count: number) => void;
  onGenerateExercises: (lessonId: string, count: number) => void;
}) {
  const isGeneratingQuiz = generating === lesson.id;
  const isGeneratingExercises = generatingExercises === lesson.id;

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1.5 text-sm">
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm">{lesson.title}</p>
        <p className="text-xs text-muted-foreground">
          {lesson.practiceCount} practice &middot; {lesson.assignmentCount} assignment
        </p>
      </div>

      {/* Generate Exercises button */}
      <button
        onClick={() => onGenerateExercises(lesson.id, 5)}
        disabled={isGeneratingExercises || !!generating}
        className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
        title="Generate 5 practice exercises for this lesson"
      >
        {isGeneratingExercises ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Dumbbell size={12} />
        )}
        {isGeneratingExercises ? "Generating..." : "+5 Exercises"}
      </button>

      {/* Quiz button */}
      {lesson.hasQuiz ? (
        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
          <Check size={10} strokeWidth={3} />
          Quiz
        </span>
      ) : (
        <button
          onClick={() => onGenerateQuiz(lesson.id, 5)}
          disabled={isGeneratingQuiz || !!generatingExercises}
          className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {isGeneratingQuiz ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {isGeneratingQuiz ? "Generating..." : "Generate Quiz"}
        </button>
      )}
    </div>
  );
}
