import { auth } from "@/lib/auth";
import { SettingsForm } from "../../(student)/settings/SettingsForm";

export default async function TeacherSettingsPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <SettingsForm
        initialName={session?.user?.name ?? ""}
        email={session?.user?.email ?? ""}
      />
    </div>
  );
}
