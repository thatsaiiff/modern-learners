import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/auth/admin-login");
  }

  return <AdminShell session={session}>{children}</AdminShell>;
}
