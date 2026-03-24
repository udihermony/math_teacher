"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { ProblemEditor } from "@/modules/teacher/components/ProblemEditor";
import { Spinner } from "@/components/ui/Spinner";

interface ProblemData {
  id: string;
  type: string;
  difficulty: number;
  content: Record<string, unknown>;
  commonMistakes: Record<string, unknown> | null;
  solution: Record<string, unknown> | null;
  lesson: { id: string; title: string; slug: string } | null;
  skills: { skill: { id: string; name: string } }[];
  _count: { submissions: number };
}

export default function EditProblemPage({
  params,
}: {
  params: Promise<{ problemId: string }>;
}) {
  const { problemId } = use(params);
  const router = useRouter();
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/teacher/problems/${problemId}`).then((r) => r.json()),
      fetch("/api/teacher/curriculum").then((r) => r.json()),
    ]).then(([problemData, currData]) => {
      setProblem(problemData);
      const allSkills: { id: string; name: string }[] = [];
      for (const topic of currData.topics || []) {
        if (topic.skills) allSkills.push(...topic.skills);
      }
      setSkills(allSkills.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i));
      setLoading(false);
    });
  }, [problemId]);

  async function handleSave(data: {
    type: string;
    difficulty: number;
    content: Record<string, unknown>;
    commonMistakes?: Record<string, unknown>;
    solution?: Record<string, unknown>;
    skillIds: string[];
  }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/problems/${problemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        if (problem?.lesson) {
          router.push(`/teacher/curriculum/${problem.lesson.id}`);
        } else {
          router.push("/teacher/problems");
        }
      } else {
        alert("Failed to update problem");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this problem? This cannot be undone.")) return;
    const res = await fetch(`/api/teacher/problems/${problemId}`, { method: "DELETE" });
    if (res.ok) {
      if (problem?.lesson) {
        router.push(`/teacher/curriculum/${problem.lesson.id}`);
      } else {
        router.push("/teacher/problems");
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!problem) {
    return <p className="text-destructive">Problem not found.</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={problem.lesson ? `/teacher/curriculum/${problem.lesson.id}` : "/teacher/problems"}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Problem</h1>
          <p className="text-sm text-muted-foreground">
            {problem._count.submissions} submission{problem._count.submissions !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>

      <ProblemEditor
        initialData={{
          type: problem.type,
          difficulty: problem.difficulty,
          content: problem.content,
          commonMistakes: problem.commonMistakes || undefined,
          solution: problem.solution || undefined,
          skillIds: problem.skills.map((s) => s.skill.id),
        }}
        availableSkills={skills}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
