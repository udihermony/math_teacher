"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, UserPlus, Check, Loader2, BookOpen, ArrowRight } from "lucide-react";

interface ClassMember {
  user: { id: string; name: string | null; role: string };
  role: string;
}

interface ClassAssignment {
  id: string;
  problemIds: string[] | null;
  dueDate: string | null;
  note: string | null;
  lesson: {
    id: string;
    title: string;
    topic: { name: string; phase: string };
    problems: { id: string }[];
  };
}

interface MyClass {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  members: ClassMember[];
  assignments: ClassAssignment[];
}

interface AssignmentCompletion {
  lessonId: string;
  attempted: number;
  correct: number;
  totalProblems: number;
  completed: boolean;
}

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<MyClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinResult, setJoinResult] = useState<{ success: boolean; message: string } | null>(null);
  const [completionMap, setCompletionMap] = useState<Map<string, AssignmentCompletion>>(new Map());

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    const res = await fetch("/api/classes");
    if (res.ok) {
      const data = await res.json();
      const loadedClasses = (data.classes ?? []).map((c: MyClass & { members: ClassMember[] }) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        memberCount: c.memberCount,
        members: c.members,
        assignments: c.assignments || [],
      }));
      setClasses(loadedClasses);

      // Fetch completion progress for each class
      const newMap = new Map<string, AssignmentCompletion>();
      for (const cls of loadedClasses) {
        if (cls.assignments.length === 0) continue;
        const progRes = await fetch(`/api/classes/${cls.id}/assignments/progress`);
        if (progRes.ok) {
          const progData = await progRes.json();
          for (const p of progData.progress) {
            // Find the current user's progress in the students array
            const me = p.students?.[0]; // For student view, API returns their own data
            if (me) {
              newMap.set(p.lessonId, {
                lessonId: p.lessonId,
                attempted: me.attempted,
                correct: me.correct,
                totalProblems: me.totalProblems,
                completed: me.completed,
              });
            }
          }
        }
      }
      setCompletionMap(newMap);
    }
    setLoading(false);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || joining) return;

    setJoining(true);
    setJoinResult(null);

    const res = await fetch("/api/classes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });

    const data = await res.json();

    if (res.ok) {
      setJoinResult({ success: true, message: `Joined "${data.className}" successfully!` });
      setCode("");
      fetchClasses();
    } else {
      setJoinResult({ success: false, message: data.error || "Failed to join class" });
    }

    setJoining(false);
    setTimeout(() => setJoinResult(null), 5000);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">My Classes</h1>

      {/* Join class form */}
      <div className="mb-8 rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <UserPlus size={18} />
          Join a Class
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Enter the 6-character code your teacher gave you.
        </p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="e.g. ABC123"
            maxLength={6}
            className="w-32 rounded-md border border-border bg-background px-3 py-2 text-center text-lg font-mono tracking-widest uppercase"
          />
          <button
            type="submit"
            disabled={code.length !== 6 || joining}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {joining ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Join
          </button>
        </form>
        {joinResult && (
          <p className={`mt-3 text-sm font-medium ${joinResult.success ? "text-green-600" : "text-red-600"}`}>
            {joinResult.success && <Check size={14} className="mr-1 inline" />}
            {joinResult.message}
          </p>
        )}
      </div>

      {/* Class list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : classes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <GraduationCap size={32} className="mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-muted-foreground">You haven&apos;t joined any classes yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Ask your teacher for a class code to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div key={cls.id} className="rounded-lg border border-border bg-card px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{cls.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Teacher: {cls.members.find((m) => m.role === "TEACHER")?.user.name ?? "Unknown"} &middot; {cls.memberCount} member{cls.memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <GraduationCap size={20} className="text-muted-foreground" />
              </div>

              {/* Assigned lessons */}
              {cls.assignments && cls.assignments.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Assigned Lessons</p>
                  <div className="space-y-1.5">
                    {cls.assignments.map((a) => {
                      const comp = completionMap.get(a.lesson.id);
                      const isDone = comp?.completed;

                      return (
                        <Link
                          key={a.id}
                          href={a.problemIds && a.problemIds.length > 0 ? `/practice?ids=${a.problemIds.join(",")}` : `/practice?lessonId=${a.lesson.id}`}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary ${isDone ? "opacity-60" : ""}`}
                        >
                          {isDone ? (
                            <Check size={14} className="shrink-0 text-green-500" />
                          ) : (
                            <BookOpen size={14} className="shrink-0 text-muted-foreground" />
                          )}
                          <span className={`flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>
                            {a.lesson.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {comp ? `${comp.correct}/${comp.totalProblems}` : `${a.lesson.problems.length} problems`}
                            {a.dueDate && ` · Due ${new Date(a.dueDate).toLocaleDateString("en-CA")}`}
                          </span>
                          {!isDone && <ArrowRight size={14} className="text-muted-foreground" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
