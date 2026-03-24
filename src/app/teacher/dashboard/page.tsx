import { auth } from "@/lib/auth";

export default async function TeacherDashboard() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-3xl font-bold">
        Teacher Dashboard
      </h1>
      <p className="mt-2 text-muted-foreground">
        Welcome, {session?.user?.name}. Manage your curriculum and students.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Curriculum</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and edit lessons
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Problem Bank</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage practice problems
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate lessons with AI
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Students</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track student progress
          </p>
        </div>
      </div>
    </div>
  );
}
