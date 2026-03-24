import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { Badge } from "@/components/ui/Badge";

export default async function TeacherStudentsPage() {
  const session = await requireTeacher();
  if (!session) return null;

  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      studentProfile: {
        select: {
          currentPhase: true,
          xp: true,
          level: true,
          streak: true,
          lastActiveDate: true,
        },
      },
      _count: {
        select: { submissions: true },
      },
    },
  });

  // Get correct counts per student
  const correctCounts = await prisma.submission.groupBy({
    by: ["userId"],
    where: { isCorrect: true },
    _count: { _all: true },
  });
  const correctMap = new Map(correctCounts.map((c) => [c.userId, c._count._all]));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Students ({students.length})</h1>

      {students.length === 0 ? (
        <p className="text-muted-foreground">No students have registered yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Phase</th>
                <th className="px-4 py-2.5 text-right font-medium">Level</th>
                <th className="px-4 py-2.5 text-right font-medium">XP</th>
                <th className="px-4 py-2.5 text-right font-medium">Problems</th>
                <th className="px-4 py-2.5 text-right font-medium">Accuracy</th>
                <th className="px-4 py-2.5 text-right font-medium">Streak</th>
                <th className="px-4 py-2.5 text-right font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const p = student.studentProfile;
                const totalSubs = student._count.submissions;
                const correctSubs = correctMap.get(student.id) ?? 0;
                const accuracy = totalSubs > 0 ? Math.round((correctSubs / totalSubs) * 100) : 0;

                return (
                  <tr key={student.id} className="border-t border-border">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">{student.email}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="primary">{p?.currentPhase ?? "—"}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">{p?.level ?? 1}</td>
                    <td className="px-4 py-2.5 text-right">{p?.xp?.toLocaleString() ?? 0}</td>
                    <td className="px-4 py-2.5 text-right">
                      {totalSubs > 0 ? `${correctSubs}/${totalSubs}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {totalSubs > 0 ? (
                        <span className={accuracy >= 70 ? "text-green-600" : accuracy >= 40 ? "text-amber-600" : "text-red-600"}>
                          {accuracy}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">{p?.streak ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {p?.lastActiveDate
                        ? formatRelative(p.lastActiveDate)
                        : "Never"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
