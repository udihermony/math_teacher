"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProblemEditor } from "@/modules/teacher/components/ProblemEditor";

interface Skill {
  id: string;
  name: string;
}

export default function NewProblemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lessonId") || "";
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    // Fetch available skills from the curriculum
    fetch("/api/teacher/curriculum")
      .then((r) => r.json())
      .then((data) => {
        const allSkills: Skill[] = [];
        for (const topic of data.topics || []) {
          if (topic.skills) {
            allSkills.push(...topic.skills);
          }
        }
        // Deduplicate
        setSkills(
          allSkills.filter(
            (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i
          )
        );
      });
  }, []);

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
      const res = await fetch("/api/teacher/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          lessonId: lessonId || undefined,
        }),
      });

      if (res.ok) {
        if (lessonId) {
          router.push(`/teacher/curriculum/${lessonId}`);
        } else {
          router.push("/teacher/problems");
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create problem");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={lessonId ? `/teacher/curriculum/${lessonId}` : "/teacher/problems"}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back
      </Link>

      <h1 className="mb-6 text-2xl font-bold">New Problem</h1>

      <ProblemEditor
        availableSkills={skills}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
