import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsForm } from "./SettingsForm";

export default async function StudentSettingsPage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { aiProvider: true, aiApiKey: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <SettingsForm
        initialName={session?.user?.name ?? ""}
        email={session?.user?.email ?? ""}
        initialProvider={user?.aiProvider ?? null}
        hasApiKey={!!user?.aiApiKey}
      />
    </div>
  );
}
