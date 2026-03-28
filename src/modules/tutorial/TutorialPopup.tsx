"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { TutorialRenderer } from "./TutorialRenderer";
import type { TutorialBlock } from "./types";

interface Props {
  lessonId: string;
  onClose: () => void;
}

export function TutorialPopup({ lessonId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<TutorialBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/student/tutorial?lessonId=${lessonId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Tutorial not available");
        return res.json();
      })
      .then((data) => {
        setTitle(data.title);
        const tutorial = data.tutorial;
        setBlocks(Array.isArray(tutorial?.blocks) ? tutorial.blocks : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="flex h-[85vh] w-[90vw] max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg font-semibold">{title || "Tutorial"}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {error}
            </div>
          )}
          {!loading && !error && <TutorialRenderer blocks={blocks} />}
        </div>
      </div>
    </div>
  );
}
