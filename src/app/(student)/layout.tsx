import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StudentSidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/modules/theme";
import { CompanionWidget, ExplanationPopup } from "@/modules/companion";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "TEACHER") {
    redirect("/teacher/dashboard");
  }

  return (
    <ThemeProvider initialPhase={session.user.phase || "PHASE_0"}>
      <div className="flex min-h-full">
        <StudentSidebar user={session.user} />
        <main id="main-content" className="flex-1 p-6">{children}</main>
        <CompanionWidget />
        <ExplanationPopup />
      </div>
    </ThemeProvider>
  );
}
