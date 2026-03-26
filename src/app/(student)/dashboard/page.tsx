import { Suspense } from "react";
import { QuestRoad } from "./QuestRoad";
import { Spinner } from "@/components/ui/Spinner";

export default function StudentDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <QuestRoad />
    </Suspense>
  );
}
