"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, Copy, Check, UserMinus } from "lucide-react";
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

export default function ClassDetailPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const [classData, setClassData] = useState<{ name: string; code: string; members: Array<{ role: string; user: StudentData }> } | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function fetch_() {
      const res = await fetch(`/api/classes/${classId}`);
      if (res.ok) {
        const data = await res.json();
        setClassData(data.class);
        setAnalytics(data.analytics);
      }
      setLoading(false);
    }
    fetch_();
  }, [classId]);

  async function removeStudent(userId: string) {
    await fetch(`/api/classes/${classId}?userId=${userId}`, { method: "DELETE" });
    // Re-fetch
    const res = await fetch(`/api/classes/${classId}`);
    if (res.ok) {
      const data = await res.json();
      setClassData(data.class);
      setAnalytics(data.analytics);
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
