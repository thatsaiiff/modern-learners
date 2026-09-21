import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth/session";
import { StudentShell } from "@/components/student/student-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStudentSession();

  if (!session) {
    redirect("/auth/student-login");
  }

  return <StudentShell session={session}>{children}</StudentShell>;
}
