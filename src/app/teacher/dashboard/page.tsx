import { auth } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";

export default async function TeacherDashboard() {
  const session = await auth();

  return <DashboardClient userName={session?.user?.name ?? "Teacher"} />;
}
