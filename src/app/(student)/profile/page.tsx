import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";

export default async function StudentProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  const submissionStats = await prisma.submission.aggregate({
    where: { userId },
    _count: { _all: true },
  });

  const correctCount = await prisma.submission.count({
    where: { userId, isCorrect: true },
  });

  const total = submissionStats._count._all;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const badges = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
    take: 10,
  });

  const classes = await prisma.classMembership.findMany({
    where: { userId },
    include: { class: { select: { name: true } } },
  });

  const PHASE_LABELS: Record<string, string> = {
    PHASE_0: "Foundations",
    PHASE_1: "Algebra",
    PHASE_2: "Functions",
    PHASE_3: "Sequences & Series",
    PHASE_4: "Trigonometry",
    PHASE_5: "Vectors & Geometry",
    PHASE_6: "Statistics",
    PHASE_7: "Differentiation",
    PHASE_8: "Integration",
    PHASE_9: "HL Topics",
    PHASE_10: "Exam Prep",
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      <div className="space-y-4">
        {/* Identity */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {(session.user.name ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{session.user.name}</h2>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Level" value={profile?.level ?? 1} />
          <StatCard label="XP" value={profile?.xp?.toLocaleString() ?? "0"} />
          <StatCard label="Streak" value={profile?.streak ?? 0} />
          <StatCard label="Accuracy" value={total > 0 ? `${accuracy}%` : "—"} />
        </div>

        {/* Phase & Progress */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-2 font-semibold">Progress</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Phase</span>
              <Badge variant="primary">{PHASE_LABELS[profile?.currentPhase ?? "PHASE_0"]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Problems Attempted</span>
              <span className="font-medium">{total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Correct Answers</span>
              <span className="font-medium">{correctCount}</span>
            </div>
          </div>
        </div>

        {/* Classes */}
        {classes.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold">Classes</h3>
            <div className="space-y-1">
              {classes.map((m) => (
                <p key={m.classId} className="text-sm text-muted-foreground">{m.class.name}</p>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold">Recent Badges</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <Badge key={b.id} variant="default">{b.badgeSlug.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
