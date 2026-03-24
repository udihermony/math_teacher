"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { CurriculumTree } from "@/modules/teacher/components/CurriculumTree";
import { Spinner } from "@/components/ui/Spinner";

const PHASES = [
  { value: "FOUNDATIONS", label: "Foundations" },
  { value: "EXPLORER", label: "Explorer" },
  { value: "BUILDER", label: "Builder" },
  { value: "CHALLENGER", label: "Challenger" },
  { value: "IB_READY", label: "IB Ready" },
] as const;

interface TopicNode {
  id: string;
  phase: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  lessons: {
    id: string;
    title: string;
    slug: string;
    order: number;
    _count: { problems: number; practice: number; assignment: number };
  }[];
}

export default function CurriculumPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>}>
      <CurriculumPageInner />
    </Suspense>
  );
}

function CurriculumPageInner() {
  const searchParams = useSearchParams();
  const highlightLessonId = searchParams.get("lessonId") || undefined;
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicPhase, setNewTopicPhase] = useState("FOUNDATIONS");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCurriculum = useCallback(async () => {
    const res = await fetch("/api/teacher/curriculum");
    if (res.ok) {
      const data = await res.json();
      setTopics(data.topics);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCurriculum();
  }, [fetchCurriculum]);

  async function handleCreateTopic() {
    if (!newTopicName.trim()) return;
    setSaving(true);

    const slug = newTopicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Determine next order for this phase
    const phaseTopics = topics.filter((t) => t.phase === newTopicPhase);
    const nextOrder = phaseTopics.length > 0
      ? Math.max(...phaseTopics.map((t) => t.order)) + 1
      : 1;

    const res = await fetch("/api/teacher/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTopicName.trim(),
        slug,
        phase: newTopicPhase,
        description: newTopicDesc.trim() || undefined,
        order: nextOrder,
      }),
    });

    if (res.ok) {
      setShowNewTopic(false);
      setNewTopicName("");
      setNewTopicPhase("FOUNDATIONS");
      setNewTopicDesc("");
      fetchCurriculum();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to create topic");
    }
    setSaving(false);
  }

  async function handleDeleteTopic(id: string) {
    if (!confirm("Delete this topic? This cannot be undone.")) return;
    const res = await fetch(`/api/teacher/topics/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete topic");
    }
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm("Delete this lesson and all its problems? This cannot be undone.")) return;
    const res = await fetch(`/api/teacher/lessons/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchCurriculum();
    } else {
      alert("Failed to delete lesson");
    }
  }

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
          <h1 className="text-2xl font-bold">Curriculum</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage topics, lessons, and problems
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewTopic(true)}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Plus size={16} />
            New Topic
          </button>
          <Link
            href="/teacher/curriculum/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} />
            New Lesson
          </Link>
        </div>
      </div>

      {showNewTopic && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Create New Topic</h2>
            <button onClick={() => setShowNewTopic(false)} className="text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Topic Name</label>
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="e.g. Fractions & Decimals"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phase</label>
              <select
                value={newTopicPhase}
                onChange={(e) => setNewTopicPhase(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {PHASES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium">Description (optional)</label>
              <input
                type="text"
                value={newTopicDesc}
                onChange={(e) => setNewTopicDesc(e.target.value)}
                placeholder="Brief description of the topic"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleCreateTopic}
              disabled={saving || !newTopicName.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create Topic"}
            </button>
          </div>
        </div>
      )}

      <CurriculumTree
        topics={topics}
        onDeleteTopic={handleDeleteTopic}
        onDeleteLesson={handleDeleteLesson}
        highlightLessonId={highlightLessonId}
      />
    </div>
  );
}
