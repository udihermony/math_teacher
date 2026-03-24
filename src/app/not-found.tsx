import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <div className="mb-4 text-6xl">🗺️</div>
      <h1 className="mb-2 text-3xl font-bold">Page Not Found</h1>
      <p className="mb-6 max-w-md text-muted-foreground">
        Looks like you&apos;ve wandered off the map! This page doesn&apos;t exist.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-6 py-2 font-medium text-white hover:bg-primary/90"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
