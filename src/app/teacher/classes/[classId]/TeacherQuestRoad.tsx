"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  BookOpen,
  Check,
  Sparkles,
  Loader2,
  Dumbbell,
  Send,
  Users,
  User,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface TeacherLesson {
  id: string;
  title: string;
  order: number;
  practiceCount: number;
  assignmentCount: number;
  hasQuizProblems: boolean;
  isAssigned: boolean;
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

interface StudentInfo {
  id: string;
  name: string;
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

interface Props {
  classId: string;
  students: StudentInfo[];
  onQuizGenerated?: () => void;
}

export function TeacherQuestRoad({ classId, students, onQuizGenerated }: Props) {
  const [phases, setPhases] = useState<TeacherPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingExercises, setGeneratingExercises] = useState<string | null>(null);
  const [assigningLesson, setAssigningLesson] = useState<TeacherLesson | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState<string | null>(null); // "topic:id" or "phase:name"
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    fetch(`/api/teacher/quest-road?classId=${classId}`)
      .then((r) => r.json())
      .then((d) => { setPhases(d.phases || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [classId]);

  async function generateQuizProblems(lessonId: string, count: number) {
    setGenerating(lessonId);
    try {
      const res = await fetch("/api/teacher/generate-quiz", {
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
                  ? { ...l, hasQuizProblems: true, assignmentCount: l.assignmentCount + data.created }
                  : l
              ),
            })),
          }))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Failed to generate quiz");
      }
    } catch {
      alert("Failed to generate quiz");
    }
    setGenerating(null);
  }

  async function assignLesson(lessonId: string, questionCount: number, passingGrade?: number, studentIds?: string[]) {
    try {
      const res = await fetch(`/api/classes/${classId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, questionCount, passingGrade, studentIds }),
      });
      if (res.ok) {
        setPhases((prev) =>
          prev.map((p) => ({
            ...p,
            topics: p.topics.map((t) => ({
              ...t,
              lessons: t.lessons.map((l) =>
                l.id === lessonId ? { ...l, isAssigned: true } : l
              ),
            })),
          }))
        );
        onQuizGenerated?.();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to assign");
      }
    } catch {
      alert("Failed to assign");
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

  async function generateBulkQuiz(
    key: string,
    lessons: TeacherLesson[],
    countPerLesson: number
  ) {
    const eligible = lessons.filter((l) => !l.hasQuizProblems);
    if (eligible.length === 0) {
      alert("All lessons already have quiz problems.");
      return;
    }
    setBulkGenerating(key);
    setBulkProgress({ done: 0, total: eligible.length });

    for (let i = 0; i < eligible.length; i++) {
      setBulkProgress({ done: i, total: eligible.length });
      await generateQuizProblems(eligible[i].id, countPerLesson);
    }

    setBulkProgress({ done: eligible.length, total: eligible.length });
    setBulkGenerating(null);
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {phases.map((phase) => (
          <PhaseSection
            key={phase.phase}
            phase={phase}
            generating={generating}
            generatingExercises={generatingExercises}
            bulkGenerating={bulkGenerating}
            bulkProgress={bulkProgress}
            onGenerateQuiz={generateQuizProblems}
            onGenerateExercises={generateExercises}
            onGenerateBulkQuiz={generateBulkQuiz}
            onAssign={(lesson) => setAssigningLesson(lesson)}
          />
        ))}
      </div>

      {assigningLesson && (
        <AssignModal
          lesson={assigningLesson}
          students={students}
          onAssign={(questionCount, passingGrade, studentIds) => {
            assignLesson(
              assigningLesson.id,
              questionCount,
              passingGrade,
              studentIds
            );
            setAssigningLesson(null);
          }}
          onClose={() => setAssigningLesson(null)}
        />
      )}
    </>
  );
}

// ── Assign Modal ──────────────────────────────────────

function AssignModal({
  lesson,
  students,
  onAssign,
  onClose,
}: {
  lesson: TeacherLesson;
  students: StudentInfo[];
  onAssign: (questionCount: number, passingGrade?: number, studentIds?: string[]) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"all" | "select">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [questionCount, setQuestionCount] = useState(lesson.assignmentCount || 5);
  const [passingGrade, setPassingGrade] = useState(lesson.assignmentCount || 5);

  // Keep passingGrade in sync when questionCount changes
  const effectiveQC = questionCount;
  const clampedGrade = Math.min(passingGrade, effectiveQC);

  function toggleStudent(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Assign: {lesson.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {lesson.assignmentCount} quiz questions available
        </p>

        {/* Question count */}
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium">Questions</label>
          <input
            type="number"
            min={1}
            max={50}
            value={questionCount}
            onChange={(e) => {
              const v = Math.max(1, parseInt(e.target.value) || 1);
              setQuestionCount(v);
              if (passingGrade > v) setPassingGrade(v);
            }}
            className="w-24 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          {questionCount > lesson.assignmentCount && (
            <p className="mt-1 text-xs text-amber-600">
              {questionCount - lesson.assignmentCount} will be auto-generated by AI
            </p>
          )}
        </div>

        {/* Passing grade */}
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium">Passing grade</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={effectiveQC}
              value={clampedGrade}
              onChange={(e) => setPassingGrade(Math.max(1, Math.min(effectiveQC, parseInt(e.target.value) || 1)))}
              className="w-16 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
            <span className="text-sm text-muted-foreground">/ {effectiveQC} correct to pass</span>
          </div>
        </div>

        {/* Mode selection */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setMode("all")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background hover:bg-secondary"
            }`}
          >
            <Users size={14} />
            All Students
          </button>
          <button
            onClick={() => setMode("select")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "select"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background hover:bg-secondary"
            }`}
          >
            <User size={14} />
            Select Students
          </button>
        </div>

        {/* Student list */}
        {mode === "select" && (
          <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {students.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">No students in class</p>
            ) : (
              students.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => onAssign(
              effectiveQC,
              clampedGrade,
              mode === "select" ? Array.from(selected) : undefined
            )}
            disabled={mode === "select" && selected.size === 0}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Send size={14} />
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Phase Section ─────────────────────────────────────

function PhaseSection({
  phase,
  generating,
  generatingExercises,
  bulkGenerating,
  bulkProgress,
  onGenerateQuiz,
  onGenerateExercises,
  onGenerateBulkQuiz,
  onAssign,
}: {
  phase: TeacherPhase;
  generating: string | null;
  generatingExercises: string | null;
  bulkGenerating: string | null;
  bulkProgress: { done: number; total: number };
  onGenerateQuiz: (lessonId: string, count: number) => void;
  onGenerateExercises: (lessonId: string, count: number) => void;
  onGenerateBulkQuiz: (key: string, lessons: TeacherLesson[], countPerLesson: number) => void;
  onAssign: (lesson: TeacherLesson) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizCount, setQuizCount] = useState(5);
  const color = PHASE_COLORS[phase.phase] || PHASE_COLORS.PHASE_0;
  const allLessons = phase.topics.flatMap((t) => t.lessons);
  const totalLessons = allLessons.length;
  const assignedCount = allLessons.filter((l) => l.isAssigned).length;
  const lessonsWithoutQuiz = allLessons.filter((l) => !l.hasQuizProblems).length;
  const phaseKey = `phase:${phase.phase}`;
  const isBulkGenerating = bulkGenerating === phaseKey;
  const anyBulkBusy = !!bulkGenerating;

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
              {phase.topics.length} topics &middot; {totalLessons} lessons &middot; {assignedCount} assigned
            </p>
          </div>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`}
          />
        </button>

        {/* Phase-level Generate Quiz */}
        {lessonsWithoutQuiz > 0 && (
          isBulkGenerating ? (
            <span className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary whitespace-nowrap">
              <Loader2 size={12} className="animate-spin" /> {bulkProgress.done}/{bulkProgress.total} lessons
            </span>
          ) : (
            <button
              onClick={() => setShowQuizForm(!showQuizForm)}
              disabled={anyBulkBusy || !!generating}
              className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50 whitespace-nowrap"
              title={`Generate quiz for all ${lessonsWithoutQuiz} lessons without quiz`}
            >
              <Sparkles size={12} />
              Quiz All ({lessonsWithoutQuiz})
            </button>
          )
        )}
      </div>

      {/* Phase quiz count picker */}
      {showQuizForm && !isBulkGenerating && (
        <div className="mb-2 ml-12 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Questions per lesson:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={quizCount}
            onChange={(e) => setQuizCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            className="w-16 rounded border border-border bg-background px-2 py-1 text-xs"
          />
          <button
            onClick={() => { onGenerateBulkQuiz(phaseKey, allLessons, quizCount); setShowQuizForm(false); }}
            disabled={anyBulkBusy}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={12} />
            Generate for {lessonsWithoutQuiz} lessons
          </button>
          <button
            onClick={() => setShowQuizForm(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {expanded && (
        <div className="ml-3 space-y-2 border-l border-border pl-4">
          {phase.topics.map((topic) => (
            <TopicSection
              key={topic.id}
              topic={topic}
              generating={generating}
              generatingExercises={generatingExercises}
              bulkGenerating={bulkGenerating}
              bulkProgress={bulkProgress}
              onGenerateQuiz={onGenerateQuiz}
              onGenerateExercises={onGenerateExercises}
              onGenerateBulkQuiz={onGenerateBulkQuiz}
              onAssign={onAssign}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Topic Section ─────────────────────────────────────

function TopicSection({
  topic,
  generating,
  generatingExercises,
  bulkGenerating,
  bulkProgress,
  onGenerateQuiz,
  onGenerateExercises,
  onGenerateBulkQuiz,
  onAssign,
}: {
  topic: TeacherTopic;
  generating: string | null;
  generatingExercises: string | null;
  bulkGenerating: string | null;
  bulkProgress: { done: number; total: number };
  onGenerateQuiz: (lessonId: string, count: number) => void;
  onGenerateExercises: (lessonId: string, count: number) => void;
  onGenerateBulkQuiz: (key: string, lessons: TeacherLesson[], countPerLesson: number) => void;
  onAssign: (lesson: TeacherLesson) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizCount, setQuizCount] = useState(5);
  const practiceTotal = topic.lessons.reduce((s, l) => s + l.practiceCount, 0);
  const assignedCount = topic.lessons.filter((l) => l.isAssigned).length;
  const lessonsWithoutQuiz = topic.lessons.filter((l) => !l.hasQuizProblems).length;
  const topicKey = `topic:${topic.id}`;
  const isBulkGenerating = bulkGenerating === topicKey;
  const anyBulkBusy = !!bulkGenerating;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-2 text-left min-w-0"
        >
          <BookOpen size={14} className="shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{topic.name}</p>
            <p className="text-xs text-muted-foreground">
              {topic.lessons.length} lessons &middot; {practiceTotal} practice Qs &middot; {assignedCount}/{topic.lessons.length} assigned
            </p>
          </div>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`}
          />
        </button>

        {/* Topic-level Generate Quiz */}
        {lessonsWithoutQuiz > 0 && (
          isBulkGenerating ? (
            <span className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary whitespace-nowrap">
              <Loader2 size={12} className="animate-spin" /> {bulkProgress.done}/{bulkProgress.total}
            </span>
          ) : (
            <button
              onClick={() => setShowQuizForm(!showQuizForm)}
              disabled={anyBulkBusy || !!generating}
              className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20 disabled:opacity-50 whitespace-nowrap"
              title={`Generate quiz for ${lessonsWithoutQuiz} lessons without quiz`}
            >
              <Sparkles size={11} />
              Quiz ({lessonsWithoutQuiz})
            </button>
          )
        )}
      </div>

      {/* Topic quiz count picker */}
      {showQuizForm && !isBulkGenerating && (
        <div className="mt-1 ml-6 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Qs per lesson:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={quizCount}
            onChange={(e) => setQuizCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            className="w-16 rounded border border-border bg-background px-2 py-1 text-xs"
          />
          <button
            onClick={() => { onGenerateBulkQuiz(topicKey, topic.lessons, quizCount); setShowQuizForm(false); }}
            disabled={anyBulkBusy}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={12} />
            Generate ({lessonsWithoutQuiz})
          </button>
          <button
            onClick={() => setShowQuizForm(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

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
              onAssign={onAssign}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lesson Row ────────────────────────────────────────

function LessonRow({
  lesson,
  generating,
  generatingExercises,
  onGenerateQuiz,
  onGenerateExercises,
  onAssign,
}: {
  lesson: TeacherLesson;
  generating: string | null;
  generatingExercises: string | null;
  onGenerateQuiz: (lessonId: string, count: number) => void;
  onGenerateExercises: (lessonId: string, count: number) => void;
  onAssign: (lesson: TeacherLesson) => void;
}) {
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizCount, setQuizCount] = useState(5);
  const isGeneratingQuiz = generating === lesson.id;
  const isGeneratingExercises = generatingExercises === lesson.id;
  const busy = !!generating || !!generatingExercises;

  return (
    <div className="flex flex-col gap-1 rounded px-2 py-1.5 text-sm">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm">{lesson.title}</p>
          <p className="text-xs text-muted-foreground">
            {lesson.practiceCount} practice &middot; {lesson.assignmentCount} quiz Qs
          </p>
        </div>

        {/* Generate Exercises */}
        <button
          onClick={() => onGenerateExercises(lesson.id, 5)}
          disabled={isGeneratingExercises || busy}
          className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
          title="Generate 5 practice exercises"
        >
          {isGeneratingExercises ? <Loader2 size={12} className="animate-spin" /> : <Dumbbell size={12} />}
          +5 Exercises
        </button>

        {/* Generate Quiz (creates problems, not assignment) */}
        {!lesson.hasQuizProblems ? (
          isGeneratingQuiz ? (
            <span className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              <Loader2 size={12} className="animate-spin" /> Generating...
            </span>
          ) : (
            <button
              onClick={() => setShowQuizForm(!showQuizForm)}
              disabled={busy}
              className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
              title="Generate quiz questions (does not assign)"
            >
              <Sparkles size={12} />
              Generate Quiz
            </button>
          )
        ) : null}

      {/* Assign button */}
      {lesson.hasQuizProblems && !lesson.isAssigned && (
        <button
          onClick={() => onAssign(lesson)}
          className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
          title="Assign to students"
        >
          <Send size={12} />
          Assign
        </button>
      )}

      {/* Already assigned badge */}
      {lesson.isAssigned && (
        <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400">
          <Check size={10} strokeWidth={3} />
          Assigned
        </span>
      )}
      </div>

      {/* Quiz count picker */}
      {showQuizForm && !lesson.hasQuizProblems && (
        <div className="ml-0 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <label className="text-xs text-muted-foreground whitespace-nowrap">How many questions?</label>
          <input
            type="number"
            min={1}
            max={50}
            value={quizCount}
            onChange={(e) => setQuizCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
            className="w-16 rounded border border-border bg-background px-2 py-1 text-xs"
          />
          <button
            onClick={() => { onGenerateQuiz(lesson.id, quizCount); setShowQuizForm(false); }}
            disabled={busy}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Sparkles size={12} />
            Generate
          </button>
          <button
            onClick={() => setShowQuizForm(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
