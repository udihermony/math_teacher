"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Brain, BarChart3, BookOpen, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { IB_GRADE_BOUNDARIES } from "@/modules/exam/types";

export default function IBPrepPage() {
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSuggestions, setIaSuggestions] = useState<string | null>(null);
  const [iaInterest, setIaInterest] = useState("");

  async function getIASuggestions() {
    if (!iaInterest.trim()) return;
    setIaLoading(true);
    try {
      const res = await fetch("/api/ai/companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `I'm an IB Mathematics HL/SL student looking for Internal Assessment (IA) topic ideas. My interests include: ${iaInterest}. Please suggest 5 specific IA topics that connect math to my interests, with brief descriptions of the mathematical exploration each would involve. Include the main math topics/concepts each would cover.`,
            },
          ],
        }),
      });

      if (!res.ok) throw new Error("Failed to get suggestions");

      // Read SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.text) text += parsed.text;
              } catch {
                // skip
              }
            }
          }
        }
      }

      setIaSuggestions(text);
    } catch {
      setIaSuggestions("Failed to get suggestions. Please try again.");
    } finally {
      setIaLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold">IB Exam Preparation</h1>
      <p className="mb-6 text-muted-foreground">
        Everything you need to prepare for the IB Mathematics exam.
      </p>

      {/* Quick links */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Link href="/exam">
          <Card className="flex items-start gap-3 transition-colors hover:border-primary">
            <FileText size={24} className="mt-0.5 text-primary" />
            <div>
              <h3 className="font-semibold">Practice Papers</h3>
              <p className="text-sm text-muted-foreground">
                Timed exam papers with AI marking and IB rubric feedback
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/practice">
          <Card className="flex items-start gap-3 transition-colors hover:border-primary">
            <Brain size={24} className="mt-0.5 text-primary" />
            <div>
              <h3 className="font-semibold">Topic Practice</h3>
              <p className="text-sm text-muted-foreground">
                Focused practice on specific syllabus topics
              </p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Grade boundaries reference */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <BarChart3 size={20} /> Grade Boundaries
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["SL", "HL"] as const).map((level) => (
            <Card key={level}>
              <h3 className="mb-2 font-semibold">{level === "SL" ? "Standard Level" : "Higher Level"}</h3>
              <div className="space-y-1">
                {IB_GRADE_BOUNDARIES[level].map((b) => (
                  <div key={b.grade} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                          backgroundColor: gradeColor(b.grade),
                        }}
                      >
                        {b.grade}
                      </span>
                      Grade {b.grade}
                    </span>
                    <span className="text-muted-foreground">{b.minPercent}%+</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* IA Guidance */}
      <div className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <BookOpen size={20} /> Internal Assessment (IA) Topic Ideas
        </h2>
        <Card>
          <p className="mb-3 text-sm text-muted-foreground">
            Tell us about your interests and we&apos;ll suggest IA topics that connect
            mathematics to what you love.
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="e.g., sports, music, architecture, gaming, environment..."
              value={iaInterest}
              onChange={(e) => setIaInterest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && getIASuggestions()}
            />
            <Button onClick={getIASuggestions} disabled={iaLoading}>
              {iaLoading ? <Spinner size="sm" /> : <><Send size={14} className="mr-1" /> Get Ideas</>}
            </Button>
          </div>

          {iaSuggestions && (
            <div className="mt-4 rounded-lg bg-secondary/50 p-4 text-sm whitespace-pre-wrap">
              {iaSuggestions}
            </div>
          )}
        </Card>
      </div>

      {/* Study tips */}
      <Card>
        <h2 className="mb-2 font-semibold">Exam Day Tips</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• <strong>Paper 1:</strong> No calculator — practice mental math and algebraic manipulation.</li>
          <li>• <strong>Paper 2:</strong> Use your GDC effectively — know how to graph, solve, and find intersections.</li>
          <li>• Always show your working — method marks (M) are awarded even if your final answer is wrong.</li>
          <li>• Read &quot;hence&quot; questions carefully — use the result from the previous part.</li>
          <li>• Manage your time: ~1 minute per mark is a good guide.</li>
        </ul>
      </Card>
    </div>
  );
}

function gradeColor(grade: number): string {
  const colors: Record<number, string> = {
    7: "#22c55e",
    6: "#16a34a",
    5: "#3b82f6",
    4: "#f59e0b",
    3: "#f97316",
    2: "#ef4444",
    1: "#dc2626",
  };
  return colors[grade] || "#9ca3af";
}
