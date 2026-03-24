"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

interface ProblemItem {
  id: string;
  type: string;
  difficulty: number;
  content: { question?: string };
  lesson: { id: string; title: string } | null;
  skills: { skill: { id: string; name: string } }[];
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/teacher/problems")
      .then((r) => r.json())
      .then((data) => {
        setProblems(data.problems || []);
        setTotal(data.total || 0);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Problem Bank</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} problems</p>
        </div>
        <Link
          href="/teacher/problems/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus size={16} />
          New Problem
        </Link>
      </div>

      {problems.length === 0 ? (
        <p className="text-muted-foreground">No problems yet. Create your first one!</p>
      ) : (
        <div className="space-y-2">
          {problems.map((p) => (
            <Link
              key={p.id}
              href={`/teacher/problems/${p.id}`}
              className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-secondary/50"
            >
              <Badge variant="default">{p.type}</Badge>
              <span className="flex-1 text-sm truncate">
                {p.content.question || "Untitled"}
              </span>
              {p.lesson && (
                <span className="text-xs text-muted-foreground">
                  {p.lesson.title}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                D:{p.difficulty}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
