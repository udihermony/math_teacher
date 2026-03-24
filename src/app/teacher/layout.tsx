import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeacherSidebar } from "@/components/layout/Sidebar";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full">
      <TeacherSidebar user={session.user} />
      <main id="main-content" className="flex-1 p-6">{children}</main>
    </div>
  );
}
