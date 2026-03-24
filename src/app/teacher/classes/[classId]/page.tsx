"use client";

import { useState, useEffect, use, useCallback } from "react";
import { ArrowLeft, Copy, Check, UserMinus, Plus, Trash2, Sparkles, Loader2, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

interface StudentData {
  id: string;
  name: string;
  email: string;
  role: string;
  studentProfile?: {
    xp: number;
    level: number;
    streak: number;
    currentPhase: string;
  };
}

interface Analytics {
  studentCount: number;
  totalSubmissions: number;
  correctSubmissions: number;
  accuracy: number;
  activeThisWeek: number;
  averageXP: number;
  averageLevel: number;
  averageStreak: number;
}

interface Assignment {
  id: string;
  lessonId: string;
  dueDate: string | null;
  note: string | null;
  lesson: {
    id: string;
    title: string;
    topic: { name: string; phase: string };
    problems: { id: string }[];
  };
}

interface AssignmentProgress {
  assignmentId: string;
  lessonId: string;
  totalProblems: number;
  studentCount: number;
  completedCount: number;
  students: {
    userId: string;
    name: string;
    attempted: number;
    correct: number;
    totalProblems: number;
    completed: boolean;
  }[];
}

interface TopicWithLessons {
  id: string;
  name: string;
  phase: string;
  lessons: { id: string; title: string }[];
}

export default function ClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const [classData, setClassData] = useState<{ name: string; code: string; members: Array<{ role: string; user: StudentData }> } | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [topics, setTopics] = useState<TopicWithLessons[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Problem selection for assignment
  const [lessonProblems, setLessonProblems] = useState<{ id: string; type: string; difficulty: number; content: Record<string, unknown> }[]>([]);
  const [selectedProblemIds, setSelectedProblemIds] = useState<Set<string>>(new Set());
  const [loadingProblems, setLoadingProblems] = useState(false);

  // Assignment progress
  const [assignProgress, setAssignProgress] = useState<AssignmentProgress[]>([]);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);

  // AI Summary
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchClassData = useCallback(async () => {
    const res = await fetch(`/api/classes/${classId}`);
    if (res.ok) {
      const data = await res.json();
      setClassData(data.class);
      setAnalytics(data.analytics);
    }
    setLoading(false);
  }, [classId]);

  const fetchAssignments = useCallback(async () => {
    const res = await fetch(`/api/classes/${classId}/assignments`);
    if (res.ok) {
      const data = await res.json();
      setAssignments(data.assignments);
    }
    // Also fetch progress
    const progRes = await fetch(`/api/classes/${classId}/assignments/progress`);
    if (progRes.ok) {
      const progData = await progRes.json();
      setAssignProgress(progData.progress);
    }
  }, [classId]);

  useEffect(() => {
    fetchClassData();
    fetchAssignments();
    // Fetch topics for assignment dropdown
    fetch("/api/teacher/curriculum")
      .then((r) => r.json())
      .then((data) => setTopics(data.topics || []));
  }, [fetchClassData, fetchAssignments]);

  // Fetch problems when lesson selection changes
  async function fetchLessonProblems(lessonId: string) {
    if (!lessonId) {
      setLessonProblems([]);
      setSelectedProblemIds(new Set());
      return;
    }
    setLoadingProblems(true);
    const res = await fetch(`/api/problems?lessonId=${lessonId}&limit=100`);
    if (res.ok) {
      const data = await res.json();
      setLessonProblems(data.problems || []);
      // Select all by default
      setSelectedProblemIds(new Set((data.problems || []).map((p: { id: string }) => p.id)));
    }
    setLoadingProblems(false);
  }

  function toggleProblem(id: string) {
    setSelectedProblemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllProblems() {
    if (selectedProblemIds.size === lessonProblems.length) {
      setSelectedProblemIds(new Set());
    } else {
      setSelectedProblemIds(new Set(lessonProblems.map((p) => p.id)));
    }
  }

  async function removeStudent(userId: string) {
    await fetch(`/api/classes/${classId}?userId=${userId}`, { method: "DELETE" });
    fetchClassData();
  }

  async function handleAssign() {
    if (!selectedLessonId || assigning || selectedProblemIds.size === 0) return;
    setAssigning(true);

    const res = await fetch(`/api/classes/${classId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lessonId: selectedLessonId,
        problemIds: Array.from(selectedProblemIds),
        dueDate: assignDueDate ? new Date(assignDueDate).toISOString() : undefined,
        note: assignNote || undefined,
      }),
    });

    if (res.ok) {
      setShowAssignForm(false);
      setSelectedTopicId("");
      setSelectedLessonId("");
      setAssignDueDate("");
      setAssignNote("");
      setLessonProblems([]);
      setSelectedProblemIds(new Set());
      fetchAssignments();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to assign");
    }
    setAssigning(false);
  }

  async function removeAssignment(id: string) {
    await fetch(`/api/classes/${classId}/assignments?id=${id}`, { method: "DELETE" });
    fetchAssignments();
  }

  async function generateAISummary() {
    setAiLoading(true);
    setAiSummary("");

    try {
      const res = await fetch(`/api/classes/${classId}/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        for (const line of text.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setAiSummary(accumulated);
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch {
      setAiSummary("Failed to generate summary. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  if (loading || !classData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const students = classData.members.filter((m) => m.role === "STUDENT");
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  return (
    <div>
      <Link href="/teacher/classes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to Classes
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{classData.name}</h1>
        <button
          onClick={() => {
            navigator.clipboard.writeText(classData.code);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
          }}
          className="flex items-center gap-1 rounded bg-secondary px-3 py-1.5 font-mono text-sm hover:bg-secondary/80"
        >
          {copiedCode ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Join code: {classData.code}</>}
        </button>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-xs text-muted-foreground">Students</p>
            <p className="text-2xl font-bold">{analytics.studentCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted-foreground">Class Accuracy</p>
            <p className="text-2xl font-bold">{analytics.accuracy}%</p>
            <p className="text-xs text-muted-foreground">{analytics.totalSubmissions} total answers</p>
          </Card>
          <Card>
            <p className="text-xs text-muted-foreground">Active This Week</p>
            <p className="text-2xl font-bold">{analytics.activeThisWeek}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted-foreground">Avg Level / Streak</p>
            <p className="text-2xl font-bold">Lv{analytics.averageLevel}</p>
            <p className="text-xs text-muted-foreground">{analytics.averageStreak} day avg streak</p>
          </Card>
        </div>
      )}

      {/* Assigned Lessons */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Assigned Lessons</h2>
          <button
            onClick={() => setShowAssignForm(!showAssignForm)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus size={14} />
            Assign Lesson
          </button>
        </div>

        {showAssignForm && (
          <div className="mb-4 rounded-lg border border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Topic</label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => { setSelectedTopicId(e.target.value); setSelectedLessonId(""); setLessonProblems([]); setSelectedProblemIds(new Set()); }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select topic...</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>[{t.phase}] {t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Lesson</label>
                <select
                  value={selectedLessonId}
                  onChange={(e) => { setSelectedLessonId(e.target.value); fetchLessonProblems(e.target.value); }}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  disabled={!selectedTopicId}
                >
                  <option value="">Select lesson...</option>
                  {(selectedTopic?.lessons || []).map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Due Date (optional)</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Note (optional)</label>
                <input
                  type="text"
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="e.g. Complete before Friday's class"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            {/* Problem selection */}
            {selectedLessonId && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium">
                    Problems ({selectedProblemIds.size}/{lessonProblems.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/teacher/ai-assistant?action=generate-problems&lessonId=${selectedLessonId}&lessonTitle=${encodeURIComponent(selectedTopic?.lessons.find(l => l.id === selectedLessonId)?.title || '')}&phase=${selectedTopic?.phase || ''}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                      title="Generate more problems with AI"
                    >
                      <Sparkles size={12} /> Add problems
                    </Link>
                    {lessonProblems.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleAllProblems}
                        className="text-xs text-primary hover:underline"
                      >
                        {selectedProblemIds.size === lessonProblems.length ? "Deselect all" : "Select all"}
                      </button>
                    )}
                  </div>
                </div>

                {loadingProblems ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" /> Loading problems...
                  </div>
                ) : lessonProblems.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">
                    No problems yet for this lesson.{" "}
                    <Link
                      href={`/teacher/ai-assistant?action=generate-problems&lessonId=${selectedLessonId}&lessonTitle=${encodeURIComponent(selectedTopic?.lessons.find(l => l.id === selectedLessonId)?.title || '')}&phase=${selectedTopic?.phase || ''}`}
                      className="text-primary hover:underline"
                    >
                      Generate some with AI
                    </Link>
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-background p-2">
                    {lessonProblems.map((p, i) => {
                      const label = (p.content as Record<string, unknown>)?.question
                        || (p.content as Record<string, unknown>)?.title
                        || `Problem ${i + 1}`;
                      return (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-secondary"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProblemIds.has(p.id)}
                            onChange={() => toggleProblem(p.id)}
                            className="rounded border-border"
                          />
                          <span className="flex-1 truncate">{String(label)}</span>
                          <Badge variant="default" className="text-[10px]">{p.type.replace("_", " ")}</Badge>
                          <span className="text-[10px] text-muted-foreground">D{p.difficulty}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setShowAssignForm(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedLessonId || assigning || selectedProblemIds.size === 0}
                className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {assigning ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Assign
              </button>
            </div>
          </div>
        )}

        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lessons assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const prog = assignProgress.find((p) => p.assignmentId === a.id);
              const isExpanded = expandedAssignment === a.id;

              return (
                <div key={a.id} className="rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <BookOpen size={16} className="shrink-0 text-muted-foreground" />
                    <button
                      className="flex-1 text-left"
                      onClick={() => setExpandedAssignment(isExpanded ? null : a.id)}
                    >
                      <p className="text-sm font-medium">{a.lesson.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.lesson.topic.name} &middot; {a.lesson.problems.length} problems
                        {a.dueDate && ` · Due ${new Date(a.dueDate).toLocaleDateString("en-CA")}`}
                        {a.note && ` · ${a.note}`}
                      </p>
                    </button>
                    {prog && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-green-500"
                            style={{ width: `${prog.studentCount > 0 ? (prog.completedCount / prog.studentCount) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {prog.completedCount}/{prog.studentCount}
                        </span>
                      </div>
                    )}
                    <Link
                      href={`/teacher/curriculum?lessonId=${a.lesson.id}`}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="View in curriculum"
                    >
                      <ExternalLink size={14} />
                    </Link>
                    <button
                      onClick={() => removeAssignment(a.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Remove assignment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Per-student breakdown */}
                  {isExpanded && prog && (
                    <div className="border-t border-border px-4 py-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="py-1 text-left font-medium">Student</th>
                            <th className="py-1 text-right font-medium">Progress</th>
                            <th className="py-1 text-right font-medium">Correct</th>
                            <th className="py-1 text-right font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prog.students.map((s) => (
                            <tr key={s.userId} className="border-t border-border/50">
                              <td className="py-1.5">{s.name}</td>
                              <td className="py-1.5 text-right">{s.attempted}/{s.totalProblems}</td>
                              <td className="py-1.5 text-right">{s.correct}/{s.totalProblems}</td>
                              <td className="py-1.5 text-right">
                                {s.completed ? (
                                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">Done</span>
                                ) : s.attempted > 0 ? (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">In progress</span>
                                ) : (
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">Not started</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Performance Summary */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">AI Performance Summary</h2>
          <button
            onClick={generateAISummary}
            disabled={aiLoading || students.length === 0}
            className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {aiLoading ? "Analyzing..." : "Generate Summary"}
          </button>
        </div>

        {aiSummary ? (
          <div className="rounded-lg border border-border bg-card p-5 text-sm leading-relaxed whitespace-pre-wrap">
            {aiSummary}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click &quot;Generate Summary&quot; to get AI-powered insights about each student&apos;s performance, strengths, and areas for improvement.
          </p>
        )}
      </div>

      {/* Student list */}
      <h2 className="mb-3 text-lg font-semibold">Students ({students.length})</h2>
      {students.length === 0 ? (
        <p className="text-muted-foreground">
          No students yet. Share the join code with your class!
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Phase</th>
                <th className="px-4 py-2 text-right font-medium">Level</th>
                <th className="px-4 py-2 text-right font-medium">XP</th>
                <th className="px-4 py-2 text-right font-medium">Streak</th>
                <th className="px-4 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((m) => (
                <tr key={m.user.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div>
                      <p className="font-medium">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="primary">
                      {m.user.studentProfile?.currentPhase || "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {m.user.studentProfile?.level || 1}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {m.user.studentProfile?.xp?.toLocaleString() || 0}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {m.user.studentProfile?.streak || 0}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStudent(m.user.id)}
                      title="Remove student"
                    >
                      <UserMinus size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
