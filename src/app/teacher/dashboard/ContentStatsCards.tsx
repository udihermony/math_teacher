"use client";

import { BookOpen, Dumbbell, ClipboardList, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Props {
  stats: {
    totalTopics: number;
    totalLessons: number;
    totalProblems: number;
    practiceProblems: number;
    assignmentProblems: number;
  };
}

export function ContentStatsCards({ stats }: Props) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Content</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="sm">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">Topics</p>
          </div>
          <p className="mt-1 text-xl font-bold">{stats.totalTopics}</p>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-primary" />
            <p className="text-xs text-muted-foreground">Lessons</p>
          </div>
          <p className="mt-1 text-xl font-bold">{stats.totalLessons}</p>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-2">
            <Dumbbell size={14} className="text-blue-500" />
            <p className="text-xs text-muted-foreground">Practice Qs</p>
          </div>
          <p className="mt-1 text-xl font-bold">{stats.practiceProblems}</p>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-amber-500" />
            <p className="text-xs text-muted-foreground">Quiz Qs</p>
          </div>
          <p className="mt-1 text-xl font-bold">{stats.assignmentProblems}</p>
        </Card>
      </div>
    </div>
  );
}
