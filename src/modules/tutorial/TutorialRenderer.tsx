"use client";

import katex from "katex";
import { P5Sandbox } from "./P5Sandbox";
import type { TutorialBlock } from "./types";

interface Props {
  blocks: TutorialBlock[];
}

export function TutorialRenderer({ blocks }: Props) {
  if (blocks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tutorial content yet.</p>;
  }

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <TutorialBlockRenderer key={i} block={block} />
      ))}
    </div>
  );
}

function TutorialBlockRenderer({ block }: { block: TutorialBlock }) {
  switch (block.type) {
    case "text":
      return <TextBlock content={block.content} />;
    case "latex":
      return <LatexBlock content={block.content} />;
    case "p5":
      return <P5Sandbox code={block.code} height={block.height} />;
    default:
      return null;
  }
}

function LatexBlock({ content }: { content: string }) {
  const html = renderKatex(content, true);
  if (!html) {
    return <pre className="text-sm text-red-500">{content}</pre>;
  }

  return (
    <div
      className="overflow-x-auto py-2 text-center"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function TextBlock({ content }: { content: string }) {
  // Split content on $...$ and $$...$$ for inline/display KaTeX
  const segments = splitLatex(content);

  return (
    <div className="max-w-none text-sm leading-relaxed text-slate-900 dark:text-slate-100">
      {segments.map((seg, i) => {
        if (seg.type === "display-latex") {
          const html = renderKatex(seg.value, true);
          if (!html) {
            return <code key={i}>{seg.value}</code>;
          }
          return (
            <div
              key={i}
              className="overflow-x-auto py-1 text-center"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        if (seg.type === "inline-latex") {
          const html = renderKatex(seg.value, false);
          if (!html) {
            return <code key={i}>{seg.value}</code>;
          }
          return (
            <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
          );
        }
        // Plain text — render with markdown-like formatting
        return <TextSpan key={i} text={seg.value} />;
      })}
    </div>
  );
}

function TextSpan({ text }: { text: string }) {
  // Simple markdown: **bold**, headers, bullet lists
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="mt-3 mb-1 text-base font-semibold text-slate-950 dark:text-slate-50">{formatBold(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="mt-4 mb-1 text-lg font-bold text-slate-950 dark:text-slate-50">{formatBold(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="mt-4 mb-2 text-xl font-bold text-slate-950 dark:text-slate-50">{formatBold(line.slice(2))}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="ml-4 flex gap-2">
          <span className="text-slate-500 dark:text-slate-400">•</span>
          <span>{formatBold(line.slice(2))}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-0.5 text-slate-900 dark:text-slate-100">{formatBold(line)}</p>);
    }
  }

  return <>{elements}</>;
}

function formatBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

type Segment = { type: "text" | "inline-latex" | "display-latex"; value: string };

function splitLatex(text: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Check for display math $$...$$
    const ddIdx = remaining.indexOf("$$");
    // Check for inline math $...$
    const sIdx = findSingleDollar(remaining);

    if (ddIdx === -1 && sIdx === -1) {
      segments.push({ type: "text", value: remaining });
      break;
    }

    // Pick whichever comes first
    const useDisplay = ddIdx !== -1 && (sIdx === -1 || ddIdx <= sIdx);

    if (useDisplay) {
      if (ddIdx > 0) {
        segments.push({ type: "text", value: remaining.slice(0, ddIdx) });
      }
      const endIdx = remaining.indexOf("$$", ddIdx + 2);
      if (endIdx === -1) {
        segments.push({ type: "text", value: remaining.slice(ddIdx) });
        break;
      }
      segments.push({ type: "display-latex", value: remaining.slice(ddIdx + 2, endIdx) });
      remaining = remaining.slice(endIdx + 2);
    } else {
      if (sIdx > 0) {
        segments.push({ type: "text", value: remaining.slice(0, sIdx) });
      }
      const endIdx = findSingleDollar(remaining, sIdx + 1);
      if (endIdx === -1) {
        segments.push({ type: "text", value: remaining.slice(sIdx) });
        break;
      }
      segments.push({ type: "inline-latex", value: remaining.slice(sIdx + 1, endIdx) });
      remaining = remaining.slice(endIdx + 1);
    }
  }

  return segments;
}

function findSingleDollar(text: string, startFrom = 0): number {
  for (let i = startFrom; i < text.length; i++) {
    if (text[i] === "$" && text[i + 1] !== "$" && (i === 0 || text[i - 1] !== "$")) {
      return i;
    }
  }
  return -1;
}

function renderKatex(content: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(content, {
      displayMode,
      throwOnError: false,
    });
  } catch {
    return null;
  }
}
