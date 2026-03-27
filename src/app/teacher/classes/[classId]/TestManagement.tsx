"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  ClipboardList,
  Clock,
  Sparkles,
} from "lucide-react";

interface TestItem {
  id: string;
  title: string;
  scope: string;
  scopeId: string;
  questionCount: number;
  durationMinutes: number | null;
  aiGenerated: boolean;
  pendingRequests: number;
  _count: { requests: number };
  createdAt: string;
}

interface TopicOption {
  id: string;
  name: string;
  phase: string;
  lessons: { id: string; title: string }[];
}

const SCOPE_LABELS: Record<string, string> = {
  LESSON: "Lesson",
  TOPIC: "Topic",
  PHASE: "Phase",
};

const PHASE_LABELS: Record<string, string> = {
  PHASE_0: "Foundations", PHASE_1: "Algebra", PHASE_2: "Functions",
  PHASE_3: "Sequences & Series", PHASE_4: "Trigonometry",
  PHASE_5: "Vectors & Geometry", PHASE_6: "Statistics",
  PHASE_7: "Differentiation", PHASE_8: "Integration",
  PHASE_9: "HL Topics", PHASE_10: "Exam Prep",
};

export function TestManagement({ classId }: { classId: string }) {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [scope, setScope] = useState<"LESSON" | "TOPIC" | "PHASE">("LESSON");
  const [scopeId, setScopeId] = useState("");
  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>();
  const [topics, setTopics] = useState<TopicOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/teacher/tests?classId=${classId}`).then((r) => r.json()),
      fetch("/api/teacher/curriculum").then((r) => r.json()),
    ]).then(([testsData, currData]) => {
      setTests(testsData.tests ?? []);
      setTopics(currData.topics ?? []);
      setLoading(false);
    });
  }, [classId]);

  async function createTest() {
    if (!scopeId || !title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teacher/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          scope,
          scopeId,
          title: title.trim(),
          questionCount,
          durationMinutes,
          aiGenerate: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTests((prev) => [{ ...data.test, pendingRequests: 0, _count: { requests: 0 } }, ...prev]);
        if (data.recommendedDuration && !durationMinutes) {
          // Update with recommended duration
          setDurationMinutes(data.recommendedDuration);
        }
        setShowForm(false);
        setTitle("");
        setScopeId("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create test");
      }
    } catch {
      alert("Failed to create test");
    }
    setCreating(false);
  }

  async function deleteTest(testId: string) {
    if (!confirm("Archive this test?")) return;
    await fetch(`/api/teacher/tests/${testId}`, { method: "DELETE" });
    setTests((prev) => prev.filter((t) => t.id !== testId));
  }

  const allLessons = topics.flatMap((t) => t.lessons.map((l) => ({ ...l, topicName: t.name })));
  const phases = Object.keys(PHASE_LABELS);

  if (loading) return null;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <ClipboardList size={16} />
          Tests
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus size={12} />
          Add Test
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-4 rounded-md border border-border bg-secondary/30 p-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Test Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Algebra Unit Test"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Scope</label>
              <select
                value={scope}
                onChange={(e) => { setScope(e.target.value as "LESSON" | "TOPIC" | "PHASE"); setScopeId(""); }}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="LESSON">Lesson</option>
                <option value="TOPIC">Topic</option>
                <option value="PHASE">Phase</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium">
                {scope === "LESSON" ? "Select Lesson" : scope === "TOPIC" ? "Select Topic" : "Select Phase"}
              </label>
              <select
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Choose...</option>
                {scope === "LESSON" && allLessons.map((l) => (
                  <option key={l.id} value={l.id}>{l.topicName} — {l.title}</option>
                ))}
                {scope === "TOPIC" && topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                {scope === "PHASE" && phases.map((p) => (
                  <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Questions</label>
              <input
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Duration (min)</label>
              <input
                type="number"
                min={1}
                value={durationMinutes ?? ""}
                onChange={(e) => setDurationMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="AI will suggest"
                className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={createTest}
              disabled={creating || !scopeId || !title.trim()}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {creating ? "Generating..." : "Create & Generate"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Test list */}
      {tests.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">No tests created yet.</p>
      )}

      <div className="space-y-2">
        {tests.map((test) => (
          <div key={test.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
            <ClipboardList size={14} className="text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{test.title}</p>
              <p className="text-xs text-muted-foreground">
                {SCOPE_LABELS[test.scope]} · {test.questionCount} Qs
                {test.durationMinutes && (
                  <> · <Clock size={10} className="inline" /> {test.durationMinutes} min</>
                )}
                {test.pendingRequests > 0 && (
                  <span className="ml-1 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    {test.pendingRequests} pending
                  </span>
                )}
                {test.aiGenerated && (
                  <span className="ml-1 inline-flex items-center gap-0.5 text-primary">
                    <Sparkles size={9} /> AI
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => deleteTest(test.id)}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Archive test"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
