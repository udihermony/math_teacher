"use client";

import { useWorldMap, type MapNode } from "../hooks/useWorldMap";
import { Spinner } from "@/components/ui/Spinner";

interface WorldMapProps {
  onSelectTopic?: (topicId: string) => void;
}

const PHASE_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  PHASE_0: { bg: "#22c55e", border: "#16a34a", glow: "0 0 12px rgba(34,197,94,0.4)" },
  PHASE_1: { bg: "#3b82f6", border: "#2563eb", glow: "0 0 12px rgba(59,130,246,0.4)" },
  PHASE_2: { bg: "#6366f1", border: "#4f46e5", glow: "0 0 12px rgba(99,102,241,0.4)" },
  PHASE_3: { bg: "#a855f7", border: "#9333ea", glow: "0 0 12px rgba(168,85,247,0.4)" },
  PHASE_4: { bg: "#f59e0b", border: "#d97706", glow: "0 0 12px rgba(245,158,11,0.4)" },
  PHASE_5: { bg: "#14b8a6", border: "#0d9488", glow: "0 0 12px rgba(20,184,166,0.4)" },
  PHASE_6: { bg: "#f43f5e", border: "#e11d48", glow: "0 0 12px rgba(244,63,94,0.4)" },
  PHASE_7: { bg: "#f97316", border: "#ea580c", glow: "0 0 12px rgba(249,115,22,0.4)" },
  PHASE_8: { bg: "#ef4444", border: "#dc2626", glow: "0 0 12px rgba(239,68,68,0.4)" },
  PHASE_9: { bg: "#8b5cf6", border: "#7c3aed", glow: "0 0 12px rgba(139,92,246,0.4)" },
  PHASE_10: { bg: "#64748b", border: "#475569", glow: "0 0 12px rgba(100,116,139,0.4)" },
};

const STATUS_STYLES: Record<MapNode["status"], string> = {
  locked: "opacity-40 cursor-not-allowed grayscale",
  available: "cursor-pointer hover:scale-110",
  in_progress: "cursor-pointer hover:scale-110 animate-pulse",
  completed: "cursor-pointer hover:scale-105",
};

export function WorldMap({ onSelectTopic }: WorldMapProps) {
  const { nodes, loading, error } = useWorldMap();

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        {error}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        No topics available yet. Check back soon!
      </div>
    );
  }

  // Calculate SVG path connections
  const maxY = Math.max(...nodes.map((n) => n.position.y));

  return (
    <div
      className="relative w-full overflow-auto rounded-xl border border-border bg-gradient-to-b from-card to-secondary/20"
      style={{ minHeight: `${maxY + 25}vh` }}
    >
      {/* Connection paths */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: 0 }}
        preserveAspectRatio="none"
      >
        {nodes.slice(1).map((node, i) => {
          const prev = nodes[i];
          return (
            <line
              key={`path-${i}`}
              x1={`${prev.position.x}%`}
              y1={`${prev.position.y}%`}
              x2={`${node.position.x}%`}
              y2={`${node.position.y}%`}
              stroke={node.status === "locked" ? "#e5e7eb" : "#9ca3af"}
              strokeWidth="2"
              strokeDasharray={node.status === "locked" ? "6 4" : "none"}
            />
          );
        })}
      </svg>

      {/* Map nodes */}
      {nodes.map((node) => (
        <MapNodeComponent
          key={node.id}
          node={node}
          onClick={() => {
            if (node.status !== "locked" && onSelectTopic) {
              onSelectTopic(node.topicId);
            }
          }}
        />
      ))}
    </div>
  );
}

function MapNodeComponent({
  node,
  onClick,
}: {
  node: MapNode;
  onClick: () => void;
}) {
  const colors = PHASE_COLORS[node.phase] || PHASE_COLORS.PHASE_0;
  const statusClass = STATUS_STYLES[node.status];
  const progress =
    node.lessonCount > 0
      ? Math.round((node.completedLessons / node.lessonCount) * 100)
      : 0;

  return (
    <div
      className={`absolute flex flex-col items-center transition-transform duration-200 ${statusClass}`}
      style={{
        left: `${node.position.x}%`,
        top: `${node.position.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 1,
      }}
      onClick={onClick}
    >
      {/* Node circle */}
      <div
        className="relative flex h-14 w-14 items-center justify-center rounded-full border-3 text-white shadow-lg"
        style={{
          backgroundColor: node.status === "locked" ? "#d1d5db" : colors.bg,
          borderColor: node.status === "locked" ? "#9ca3af" : colors.border,
          boxShadow: node.status === "locked" ? "none" : colors.glow,
        }}
      >
        {node.status === "completed" ? (
          <span className="text-xl">✓</span>
        ) : node.status === "locked" ? (
          <span className="text-xl">🔒</span>
        ) : (
          <span className="text-sm font-bold">{node.order}</span>
        )}

        {/* Progress ring for in-progress nodes */}
        {node.status === "in_progress" && progress > 0 && (
          <svg
            className="absolute -inset-1"
            viewBox="0 0 64 64"
          >
            <circle
              cx="32"
              cy="32"
              r="30"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeDasharray={`${(progress / 100) * 188.5} 188.5`}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              opacity="0.6"
            />
          </svg>
        )}
      </div>

      {/* Label */}
      <span
        className="mt-1 max-w-24 text-center text-xs font-medium leading-tight"
        style={{ color: node.status === "locked" ? "#9ca3af" : "var(--foreground)" }}
      >
        {node.name}
      </span>
    </div>
  );
}
