"use client";

import { useState } from "react";
import katex from "katex";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ExplanationBlock {
  type: "text" | "step" | "latex" | "hint" | "video";
  data: string;
  number?: number;
}

interface Props {
  blocks: ExplanationBlock[];
  animationUrl?: string | null;
}

export function ExplanationRenderer({ blocks, animationUrl }: Props) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} />
      ))}
      {animationUrl && (
        <div className="overflow-hidden rounded-lg border border-border">
          <video
            src={animationUrl}
            controls
            className="w-full"
            playsInline
          />
        </div>
      )}
    </div>
  );
}

function BlockRenderer({ block }: { block: ExplanationBlock }) {
  switch (block.type) {
    case "text":
      return (
        <p className="text-sm leading-relaxed text-foreground">{block.data}</p>
      );

    case "step":
      return (
        <div className="flex gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {block.number ?? "•"}
          </div>
          <p className="text-sm leading-relaxed text-foreground pt-0.5">
            {block.data}
          </p>
        </div>
      );

    case "latex":
      return <LatexBlock latex={block.data} />;

    case "hint":
      return <HintBlock hint={block.data} />;

    case "video":
      return (
        <div className="overflow-hidden rounded-lg border border-border">
          <video src={block.data} controls className="w-full" playsInline />
        </div>
      );

    default:
      return (
        <p className="text-sm text-muted-foreground">{block.data}</p>
      );
  }
}

function LatexBlock({ latex }: { latex: string }) {
  let html: string;
  try {
    html = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
    });
  } catch {
    return (
      <div className="rounded-lg bg-secondary/50 p-3 text-sm font-mono">
        {latex}
      </div>
    );
  }

  return (
    <div
      className="flex justify-center rounded-lg bg-secondary/30 p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function HintBlock({ hint }: { hint: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-amber-700 dark:text-amber-400"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Hint
      </button>
      {expanded && (
        <p className="px-3 pb-3 text-sm text-amber-600 dark:text-amber-300">
          {hint}
        </p>
      )}
    </div>
  );
}
