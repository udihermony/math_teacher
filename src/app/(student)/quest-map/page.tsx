"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const WorldMap = dynamic(() => import("@/modules/world-map/components/WorldMap").then((m) => m.WorldMap), { ssr: false });
import { useGamification } from "@/modules/gamification/hooks/useGamification";
import { XPBar } from "@/modules/gamification/components/XPBar";
import { StreakCounter } from "@/modules/gamification/components/StreakCounter";

export default function QuestMapPage() {
  const router = useRouter();
  const { level, xp, progress, xpToNext, streak, isActiveToday } = useGamification();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quest Map</h1>
        <div className="flex items-center gap-4">
          <StreakCounter streak={streak} isActiveToday={isActiveToday} compact />
          <XPBar level={level} xp={xp} progress={progress} xpToNext={xpToNext} compact />
        </div>
      </div>

      <WorldMap
        onSelectTopic={(topicId) => {
          router.push(`/practice?topic=${topicId}`);
        }}
      />
    </div>
  );
}
