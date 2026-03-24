"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Minus,
  BookOpen,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface TopicData {
  id: string;
  name: string;
  phase: string;
  lessons: LessonData[];
}

interface LessonData {
  id: string;
  title: string;
  order: number;
  totalProblems: number;
  attempted: number;
  correct: number;
}

const PHASE_LABELS: Record<string, string> = {
  FOUNDATIONS: "Foundations",
  EXPLORER: "Explorer",
  BUILDER: "Builder",
  CHALLENGER: "Challenger",
  IB_READY: "IB Ready",
};

const PHASE_COLORS: Record<string, string> = {
  FOUNDATIONS: "#22c55e",
  EXPLORER: "#3b82f6",
  BUILDER: "#a855f7",
  CHALLENGER: "#f59e0b",
  IB_READY: "#ef4444",
};

function lessonStatus(l: LessonData): "not_started" | "in_progress" | "completed" {
  if (l.totalProblems === 0) return "not_started";
  if (l.correct >= l.totalProblems) return "completed";
  if (l.attempted > 0) return "in_progress";
  return "not_started";
}

export function TopicBrowser() {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/student/curriculum")
      .then((r) => r.json())
      .then((data) => {
        setTopics(data.topics || []);
        // Auto-expand the first phase that has topics
        if (data.topics?.length > 0) {
          setExpanded(new Set([data.topics[0].phase]));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Group by phase
  const byPhase = new Map<string, TopicData[]>();
  for (const t of topics) {
    const list = byPhase.get(t.phase) || [];
    list.push(t);
    byPhase.set(t.phase, list);
  }
  const phases = ["FOUNDATIONS", "EXPLORER", "BUILDER", "CHALLENGER", "IB_READY"];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a lesson to practice
        </p>
      </div>

      <div className="space-y-4">
        {phases.map((phase) => {
          const phaseTopics = byPhase.get(phase) || [];
          if (phaseTopics.length === 0) return null;
          const isExpanded = expanded.has(phase);
          const color = PHASE_COLORS[phase];

          return (
            <div key={phase}>
              <button
                onClick={() => toggle(phase)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="flex h-8 w-1 rounded-full" style={{ backgroundColor: color }} />
                <h2 className="flex-1 text-lg font-semibold">{PHASE_LABELS[phase]}</h2>
                {isExpanded ? (
                  <ChevronDown size={18} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={18} className="text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-5 mt-3 space-y-4 border-l-2 border-border pl-4">
                  {phaseTopics.map((topic) => (
                    <div key={topic.id}>
                      <h3 className="mb-1 text-sm font-semibold">{topic.name}</h3>
                      <div className="space-y-1">
                        {topic.lessons.map((lesson) => {
                          const status = lessonStatus(lesson);
                          return (
                            <Link
                              key={lesson.id}
                              href={`/practice?lessonId=${lesson.id}`}
                              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-secondary"
                            >
                              {status === "completed" ? (
                                <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                              ) : status === "in_progress" ? (
                                <Minus size={16} className="shrink-0 text-blue-500" />
                              ) : (
                                <Circle size={16} className="shrink-0 text-muted-foreground/40" />
                              )}
                              <span className={status === "completed" ? "text-muted-foreground" : "text-foreground"}>
                                {lesson.title}
                              </span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {lesson.totalProblems > 0
                                  ? status === "not_started"
                                    ? `${lesson.totalProblems} problems`
                                    : `${lesson.correct}/${lesson.totalProblems}`
                                  : "No problems yet"}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
