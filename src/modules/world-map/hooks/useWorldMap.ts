"use client";

import { useState, useEffect } from "react";

export interface MapNode {
  id: string;
  topicId: string;
  name: string;
  phase: string;
  order: number;
  lessonCount: number;
  completedLessons: number;
  status: "locked" | "available" | "in_progress" | "completed";
  position: { x: number; y: number };
}

export interface WorldMapData {
  nodes: MapNode[];
  loading: boolean;
  error: string | null;
}

/** Calculate node positions in a winding path layout. */
function calculatePositions(nodes: MapNode[]): MapNode[] {
  return nodes.map((node, i) => {
    // Winding path: alternate left/right as we go down
    const row = Math.floor(i / 3);
    const col = i % 3;
    const reversed = row % 2 === 1;
    const actualCol = reversed ? 2 - col : col;

    return {
      ...node,
      position: {
        x: 15 + actualCol * 35, // percent-based positioning
        y: 10 + row * 20,
      },
    };
  });
}

export function useWorldMap(): WorldMapData {
  const [nodes, setNodes] = useState<MapNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMap() {
      try {
        const res = await fetch("/api/gamification/world-map");
        if (!res.ok) throw new Error("Failed to load world map");
        const data = await res.json();
        setNodes(calculatePositions(data.nodes));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchMap();
  }, []);

  return { nodes, loading, error };
}
