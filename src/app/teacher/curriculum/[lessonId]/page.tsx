"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Loader2, BookOpen, AlertTriangle, Link2, Zap, PlayCircle, Eye } from "lucide-react";
import { TutorialChatModal } from "@/modules/tutorial/TutorialChatModal";
import { TutorialRenderer } from "@/modules/tutorial/TutorialRenderer";
import type { TutorialData } from "@/modules/tutorial/types";
import { LessonEditor } from "@/modules/teacher/components/LessonEditor";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

interface LearningContext {
  keyConcepts?: string[];
  formulas?: string[];
  commonMisconceptions?: string[];
  ibExamStyles?: string[];
  connections?: string[];
  difficultyProgression?: string;
  teachingNotes?: string;
}

interface LessonData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: { blocks: ContentBlock[] };
  sourceContent: LearningContext | null;
  tutorial: TutorialData | null;
  xpReward: number;
  coinableCount: number | null;
  topic: { id: string; name: string; phase: string };
  problems: ProblemData[];
}

interface ContentBlock {
  type: "text" | "example" | "callout" | "practice";
  content?: string;
  title?: string;
  solution?: string;
  variant?: "tip" | "warning" | "definition";
  problemIds?: string[];
}

interface ProblemData {
  id: string;
  type: string;
  purpose: string;
  difficulty: number;
  content: Record<string, unknown>;
  skills: { skill: { id: string; name: string } }[];
}

export default function EditLessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = use(params);
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<{
    skillsCreated: number;
    learningContext: LearningContext;
  } | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialPreview, setTutorialPreview] = useState(false);

  useEffect(() => {
    fetch(`/api/teacher/lessons/${lessonId}`)
      .then((r) => r.json())
      .then((data) => {
        setLesson(data);
        setLoading(false);
      });
  }, [lessonId]);

  async function handleSave(data: {
    title: string;
    slug: string;
    description: string;
    xpReward: number;
    coinableCount: number | null;
    blocks: ContentBlock[];
  }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          xpReward: data.xpReward,
          coinableCount: data.coinableCount,
          content: { blocks: data.blocks },
        }),
      });

      if (res.ok) {
        router.push("/teacher/curriculum");
      } else {
        alert("Failed to update lesson");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResearch() {
    setResearching(true);
    setResearchError(null);
    setResearchResult(null);
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}/research`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setResearchResult({
          skillsCreated: data.skillsCreated,
          learningContext: data.learningContext,
        });
        // Update lesson's sourceContent locally
        if (lesson) {
          setLesson({ ...lesson, sourceContent: data.learningContext });
        }
      } else {
        const data = await res.json();
        setResearchError(data.error || "Research failed");
      }
    } catch {
      setResearchError("Failed to connect to research service");
    }
    setResearching(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!lesson) {
    return <p className="text-destructive">Lesson not found.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/teacher/curriculum"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back to Curriculum
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Lesson</h1>
          <p className="text-sm text-muted-foreground">
            {lesson.topic.name} — {lesson.topic.phase}
          </p>
        </div>
      </div>

      {/* Research & Enrich */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Search size={14} className="text-primary" />
              AI Research & Enrich
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Uses web search to research this topic and generate skills + learning context
            </p>
          </div>
          <button
            onClick={handleResearch}
            disabled={researching}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {researching ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Search size={14} />
                Research
              </>
            )}
          </button>
        </div>

        {researchError && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {researchError}
          </div>
        )}

        {researchResult && (
          <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
            Generated {researchResult.skillsCreated} skills and saved learning context.
          </div>
        )}

        {/* Display existing or newly generated learning context */}
        {lesson.sourceContent && (
          <div className="mt-4 space-y-3 text-sm">
            {lesson.sourceContent.keyConcepts && lesson.sourceContent.keyConcepts.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  <BookOpen size={12} /> Key Concepts
                </h4>
                <ul className="list-disc list-inside space-y-0.5 text-foreground">
                  {lesson.sourceContent.keyConcepts.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {lesson.sourceContent.formulas && lesson.sourceContent.formulas.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  <Zap size={12} /> Formulas
                </h4>
                <ul className="list-disc list-inside space-y-0.5 text-foreground font-mono text-xs">
                  {lesson.sourceContent.formulas.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {lesson.sourceContent.commonMisconceptions && lesson.sourceContent.commonMisconceptions.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  <AlertTriangle size={12} /> Common Misconceptions
                </h4>
                <ul className="list-disc list-inside space-y-0.5 text-foreground">
                  {lesson.sourceContent.commonMisconceptions.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {lesson.sourceContent.connections && lesson.sourceContent.connections.length > 0 && (
              <div>
                <h4 className="font-medium flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  <Link2 size={12} /> Connections
                </h4>
                <ul className="list-disc list-inside space-y-0.5 text-foreground">
                  {lesson.sourceContent.connections.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {lesson.sourceContent.ibExamStyles && lesson.sourceContent.ibExamStyles.length > 0 && (
              <div>
                <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  IB Exam Styles
                </h4>
                <ul className="list-disc list-inside space-y-0.5 text-foreground">
                  {lesson.sourceContent.ibExamStyles.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {lesson.sourceContent.difficultyProgression && (
              <div>
                <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Difficulty Progression
                </h4>
                <p className="text-foreground">{lesson.sourceContent.difficultyProgression}</p>
              </div>
            )}

            {lesson.sourceContent.teachingNotes && (
              <div>
                <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Teaching Notes
                </h4>
                <p className="text-foreground">{lesson.sourceContent.teachingNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tutorial */}
      <div className="mb-6 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <PlayCircle size={14} className="text-blue-500" />
              Interactive Tutorial
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lesson.tutorial
                ? `Tutorial saved (${lesson.tutorial.blocks.length} blocks)`
                : "Generate an interactive tutorial with text, LaTeX, and p5.js animations"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lesson.tutorial && (
              <button
                onClick={() => setTutorialPreview(true)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
              >
                <Eye size={14} />
                Preview
              </button>
            )}
            <button
              onClick={() => setTutorialOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <PlayCircle size={14} />
              {lesson.tutorial ? "Edit Tutorial" : "Generate Tutorial"}
            </button>
          </div>
        </div>
      </div>

      {tutorialPreview && lesson.tutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setTutorialPreview(false)}>
          <div
            className="flex h-[85vh] w-[90vw] max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-lg font-semibold">{lesson.title} — Tutorial Preview</h2>
              <button
                onClick={() => setTutorialPreview(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <TutorialRenderer blocks={lesson.tutorial.blocks} />
            </div>
          </div>
        </div>
      )}

      {tutorialOpen && (
        <TutorialChatModal
          lessonId={lessonId}
          lessonTitle={lesson.title}
          existingTutorial={lesson.tutorial}
          onClose={() => setTutorialOpen(false)}
          onSaved={() => {
            setTutorialOpen(false);
            // Refresh lesson data
            fetch(`/api/teacher/lessons/${lessonId}`)
              .then((r) => r.json())
              .then((data) => setLesson(data));
          }}
        />
      )}

      <LessonEditor
        initialData={{
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description || "",
          xpReward: lesson.xpReward,
          coinableCount: lesson.coinableCount,
          blocks: lesson.content.blocks as ContentBlock[],
        }}
        topicId={lesson.topic.id}
        onSave={handleSave}
        saving={saving}
      />

      {/* Problems section */}
      <div className="mt-8 border-t border-border pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Problems ({lesson.problems.length})
          </h2>
          <Link
            href={`/teacher/problems/new?lessonId=${lessonId}`}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={12} />
            Add Problem
          </Link>
        </div>

        {lesson.problems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No problems yet.</p>
        ) : (
          <div className="space-y-2">
            {lesson.problems.map((problem) => {
              const question =
                (problem.content.question as string) || "Untitled problem";
              return (
                <Link
                  key={problem.id}
                  href={`/teacher/problems/${problem.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50"
                >
                  <Badge variant="default">{problem.type}</Badge>
                  <Badge variant={problem.purpose === "ASSIGNMENT" ? "warning" : "success"}>
                    {problem.purpose === "ASSIGNMENT" ? "Assignment" : "Practice"}
                  </Badge>
                  <span className="flex-1 text-sm truncate">{question}</span>
                  <span className="text-xs text-muted-foreground">
                    Difficulty: {problem.difficulty}/10
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
