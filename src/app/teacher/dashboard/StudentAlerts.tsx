"use client";

import { useState } from "react";
import { AlertTriangle, UserX, CheckCircle, ChevronDown } from "lucide-react";

const STRUGGLING_ACCURACY = 50;
const STRUGGLING_MIN_SUBMISSIONS = 5;
const INACTIVE_DAYS = 7;

interface Student {
  userId: string;
  name: string;
  email: string;
  accuracy: number;
  totalSubmissions: number;
  lastActiveDate: string | null;
  level: number;
}

interface Props {
  students: Student[];
  assignmentItems: { totalStudents: number; completedStudents: number }[];
}

export function StudentAlerts({ students, assignmentItems }: Props) {
  const now = Date.now();

  const struggling = students.filter(
    (s) => s.totalSubmissions >= STRUGGLING_MIN_SUBMISSIONS && s.accuracy < STRUGGLING_ACCURACY
  );

  const inactive = students.filter((s) => {
    if (!s.lastActiveDate) return true;
    const daysSince = (now - new Date(s.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > INACTIVE_DAYS;
  });

  // "Completed all" — students who are NOT pending on any assignment
  // (only meaningful if there are assignments)
  const totalAssignments = assignmentItems.length;
  const completedAll = totalAssignments > 0
    ? students.filter(() => {
        // For simplicity, we mark students with high accuracy + submissions as "on track"
        // A more precise check would need per-student per-assignment data
        return false; // We'll skip this for now since the data isn't per-student-per-assignment
      })
    : [];

  // Instead, show students with 100% accuracy as "star students"
  const starStudents = students.filter(
    (s) => s.totalSubmissions >= STRUGGLING_MIN_SUBMISSIONS && s.accuracy >= 90
  );

  if (struggling.length === 0 && inactive.length === 0 && starStudents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Student Alerts</h3>

      {struggling.length > 0 && (
        <AlertSection
          icon={<AlertTriangle size={14} />}
          title={`${struggling.length} Struggling`}
          color="amber"
          students={struggling}
          renderDetail={(s) => `${s.accuracy}% accuracy (${s.totalSubmissions} answers)`}
        />
      )}

      {inactive.length > 0 && (
        <AlertSection
          icon={<UserX size={14} />}
          title={`${inactive.length} Inactive`}
          color="red"
          students={inactive}
          renderDetail={(s) => {
            if (!s.lastActiveDate) return "Never active";
            const days = Math.floor((now - new Date(s.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24));
            return `Last active ${days} days ago`;
          }}
        />
      )}

      {starStudents.length > 0 && (
        <AlertSection
          icon={<CheckCircle size={14} />}
          title={`${starStudents.length} Star Students`}
          color="green"
          students={starStudents}
          renderDetail={(s) => `${s.accuracy}% accuracy · Lv ${s.level}`}
        />
      )}
    </div>
  );
}

function AlertSection({
  icon,
  title,
  color,
  students,
  renderDetail,
}: {
  icon: React.ReactNode;
  title: string;
  color: "amber" | "red" | "green";
  students: Student[];
  renderDetail: (s: Student) => string;
}) {
  const [expanded, setExpanded] = useState(students.length <= 5);
  const shown = expanded ? students : students.slice(0, 3);

  const borderColor = color === "amber" ? "border-l-amber-500" : color === "red" ? "border-l-red-500" : "border-l-green-500";
  const iconColor = color === "amber" ? "text-amber-500" : color === "red" ? "text-red-500" : "text-green-500";
  const bgColor = color === "amber" ? "bg-amber-50 dark:bg-amber-950/10" : color === "red" ? "bg-red-50 dark:bg-red-950/10" : "bg-green-50 dark:bg-green-950/10";

  return (
    <div className={`rounded-lg border border-border border-l-4 ${borderColor} ${bgColor} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="space-y-1">
        {shown.map((s) => (
          <div key={s.userId} className="flex items-center justify-between text-xs">
            <span className="font-medium">{s.name}</span>
            <span className="text-muted-foreground">{renderDetail(s)}</span>
          </div>
        ))}
      </div>
      {students.length > 3 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown size={12} />
          Show all {students.length}
        </button>
      )}
    </div>
  );
}
