import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-xl font-bold text-primary">MathQuest</span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl text-5xl font-bold leading-tight text-foreground">
          Learn math with your AI companion
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          From counting to calculus. MathQuest guides you through an epic
          learning adventure with Pi, your personal AI tutor — always patient,
          always encouraging.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/register"
            className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Start your quest
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary"
          >
            I have an account
          </Link>
        </div>

        {/* Feature grid */}
        <div className="mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
          <div>
            <div className="text-3xl">🤖</div>
            <h3 className="mt-2 font-semibold">AI Tutor</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pi uses the Socratic method — guiding you to discover answers, not
              just giving them.
            </p>
          </div>
          <div>
            <div className="text-3xl">🗺️</div>
            <h3 className="mt-2 font-semibold">Quest-based Learning</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Explore a world map of math topics. Earn XP, badges, and level up
              as you learn.
            </p>
          </div>
          <div>
            <div className="text-3xl">📊</div>
            <h3 className="mt-2 font-semibold">Adaptive Difficulty</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Problems adjust to your level. Spaced repetition ensures you
              remember what you learn.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
