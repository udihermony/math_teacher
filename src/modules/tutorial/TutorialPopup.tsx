"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Maximize2, Minimize2 } from "lucide-react";
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
  const [size, setSize] = useState<"default" | "large" | "full">("default");

  const sizeClasses = {
    default: "h-[60vh] w-[90vw] max-w-2xl",
    large: "h-[85vh] w-[90vw] max-w-4xl",
    full: "h-[95vh] w-[95vw] max-w-7xl",
  };

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
        className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">{title || "Tutorial"}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSize(size === "full" ? "default" : size === "large" ? "full" : "large")}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
              title={size === "full" ? "Shrink" : "Expand"}
            >
              {size === "full" ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={24} className="animate-spin text-slate-500 dark:text-slate-400" />
            </div>
          )}
          {error && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              {error}
            </div>
          )}
          {!loading && !error && <TutorialRenderer blocks={blocks} />}
        </div>
      </div>
    </div>
  );
}
