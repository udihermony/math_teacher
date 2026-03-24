"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LessonEditor } from "@/modules/teacher/components/LessonEditor";

export default function NewLessonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topicId") || "";
  const [saving, setSaving] = useState(false);
  const [topics, setTopics] = useState<{ id: string; name: string; phase: string }[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState(topicId);

  useEffect(() => {
    fetch("/api/teacher/curriculum")
      .then((r) => r.json())
      .then((data) => setTopics(data.topics || []));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handleSave(data: any) {
    setSaving(true);
    try {
      // Get next order number
      const topic = topics.find((t) => t.id === selectedTopicId);
      const res = await fetch("/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopicId,
          title: data.title,
          slug: data.slug,
          description: data.description,
          xpReward: data.xpReward,
          content: { blocks: data.blocks },
          order: 0, // Will be auto-positioned
        }),
      });

      if (res.ok) {
        router.push("/teacher/curriculum");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create lesson");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">New Lesson</h1>

      <div className="mb-6">
        <label htmlFor="topic" className="mb-1 block text-sm font-medium">
          Topic
        </label>
        <select
          id="topic"
          value={selectedTopicId}
          onChange={(e) => setSelectedTopicId(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">Select a topic...</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              [{t.phase}] {t.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTopicId && (
        <LessonEditor
          topicId={selectedTopicId}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
