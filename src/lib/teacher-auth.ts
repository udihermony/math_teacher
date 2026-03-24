import { auth } from "@/lib/auth";

/**
 * Check that the current user is an authenticated teacher.
 * Returns the session or null if unauthorized.
 */
export async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") return null;
  return session;
}
