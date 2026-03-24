"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface TopicNode {
  id: string;
  phase: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  lessons: LessonNode[];
  _count: { skills: number };
}

interface LessonNode {
  id: string;
  title: string;
  slug: string;
  order: number;
  _count: { problems: number };
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  FOUNDATIONS: { label: "Foundations (5-8)", color: "bg-purple-100 text-purple-800" },
  EXPLORER: { label: "Explorer (8-11)", color: "bg-green-100 text-green-800" },
  BUILDER: { label: "Builder (11-14)", color: "bg-blue-100 text-blue-800" },
  CHALLENGER: { label: "Challenger (14-16)", color: "bg-violet-100 text-violet-800" },
  IB_READY: { label: "IB Ready (16-18)", color: "bg-indigo-100 text-indigo-800" },
};

interface CurriculumTreeProps {
  topics: TopicNode[];
  onDeleteTopic: (id: string) => void;
  onDeleteLesson: (id: string) => void;
}

export function CurriculumTree({
  topics,
  onDeleteTopic,
  onDeleteLesson,
}: CurriculumTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Group topics by phase
  const byPhase = new Map<string, TopicNode[]>();
  for (const topic of topics) {
    const list = byPhase.get(topic.phase) || [];
    list.push(topic);
    byPhase.set(topic.phase, list);
  }

  const phases = ["FOUNDATIONS", "EXPLORER", "BUILDER", "CHALLENGER", "IB_READY"];

  return (
    <div className="space-y-4">
      {phases.map((phase) => {
        const phaseTopics = byPhase.get(phase) || [];
        const phaseInfo = PHASE_LABELS[phase];
        const phaseExpanded = expanded.has(phase);

        return (
          <div key={phase} className="rounded-lg border border-border">
            {/* Phase header */}
            <div className="flex items-center">
              <button
                onClick={() => toggleExpand(phase)}
                className="flex flex-1 items-center gap-2 px-4 py-3 text-left hover:bg-secondary/50"
              >
                {phaseExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${phaseInfo.color}`}>
                  {phaseInfo.label}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {phaseTopics.length} topic{phaseTopics.length !== 1 ? "s" : ""}
                </span>
              </button>
              <Link
                href={`/teacher/ai-assistant?action=suggest-topics&phase=${phase}`}
                className="mr-2 rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                title="AI: Suggest topics for this phase"
              >
                <Sparkles size={14} />
              </Link>
            </div>

            {phaseExpanded && (
              <div className="border-t border-border">
                {phaseTopics.length === 0 && (
                  <p className="px-8 py-3 text-sm text-muted-foreground">
                    No topics yet.
                  </p>
                )}

                {phaseTopics.map((topic) => {
                  const topicExpanded = expanded.has(topic.id);

                  return (
                    <div key={topic.id} className="border-b border-border last:border-b-0">
                      {/* Topic row */}
                      <div className="flex items-center gap-2 px-6 py-2 hover:bg-secondary/30">
                        <button onClick={() => toggleExpand(topic.id)} className="p-0.5">
                          {topicExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <BookOpen size={14} className="text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium">{topic.name}</span>
                        <Badge variant="default">{topic._count.skills} skills</Badge>
                        <Link
                          href={`/teacher/ai-assistant?action=generate-lesson&topicId=${topic.id}&topicName=${encodeURIComponent(topic.name)}&phase=${topic.phase}`}
                          className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          title="AI: Generate lesson for this topic"
                        >
                          <Sparkles size={14} />
                        </Link>
                        <Link
                          href={`/teacher/curriculum/new?topicId=${topic.id}`}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title="Add lesson"
                        >
                          <Plus size={14} />
                        </Link>
                        <button
                          onClick={() => onDeleteTopic(topic.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete topic"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Lessons */}
                      {topicExpanded && (
                        <div className="bg-secondary/20">
                          {topic.lessons.length === 0 && (
                            <p className="px-14 py-2 text-xs text-muted-foreground">
                              No lessons yet.
                            </p>
                          )}
                          {topic.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-2 px-14 py-2 hover:bg-secondary/40"
                            >
                              <HelpCircle size={12} className="text-muted-foreground" />
                              <Link
                                href={`/teacher/curriculum/${lesson.id}`}
                                className="flex-1 text-sm text-foreground hover:text-primary"
                              >
                                {lesson.title}
                              </Link>
                              <Badge variant="default">
                                {lesson._count.problems} problem{lesson._count.problems !== 1 ? "s" : ""}
                              </Badge>
                              <Link
                                href={`/teacher/ai-assistant?action=generate-problems&lessonTitle=${encodeURIComponent(lesson.title)}&phase=${topic.phase}`}
                                className="rounded p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                title="AI: Generate problems for this lesson"
                              >
                                <Sparkles size={12} />
                              </Link>
                              <Link
                                href={`/teacher/curriculum/${lesson.id}`}
                                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                                title="Edit lesson"
                              >
                                <Pencil size={12} />
                              </Link>
                              <button
                                onClick={() => onDeleteLesson(lesson.id)}
                                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Delete lesson"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
