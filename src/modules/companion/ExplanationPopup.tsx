"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { useCompanion } from "./hooks/useCompanion";
import { ExplanationRenderer } from "./ExplanationRenderer";
import { Spinner } from "@/components/ui/Spinner";

interface ExplanationBlock {
  type: "text" | "step" | "latex" | "hint" | "video";
  data: string;
  number?: number;
}

interface ExplanationData {
  id: string;
  title: string;
  content: ExplanationBlock[];
  animationUrl?: string | null;
}

export function ExplanationPopup() {
  const { explanationId, closeExplanation } = useCompanion();
  const [data, setData] = useState<ExplanationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    closeExplanation();
    setData(null);
    setError(null);
  }, [closeExplanation]);

  // Fetch explanation data
  useEffect(() => {
    if (!explanationId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/ai/explanations/${explanationId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load explanation");
        return r.json();
      })
      .then((d: ExplanationData) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
        setLoading(false);
      });
  }, [explanationId]);

  // ESC to close
  useEffect(() => {
    if (!explanationId) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [explanationId, handleClose]);

  if (!explanationId) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) handleClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {loading ? "Loading..." : data?.title ?? "Explanation"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {data && !loading && (
          <ExplanationRenderer
            blocks={data.content}
            animationUrl={data.animationUrl}
          />
        )}
      </div>
    </div>
  );
}
