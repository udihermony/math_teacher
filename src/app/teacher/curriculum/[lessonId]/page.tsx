"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { LessonEditor } from "@/modules/teacher/components/LessonEditor";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

interface LessonData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: { blocks: ContentBlock[] };
  xpReward: number;
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

      <LessonEditor
        initialData={{
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description || "",
          xpReward: lesson.xpReward,
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
