import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { getResultDetails, ResultDetailsData } from "@/lib/services/grading.service";
import { AdminResultDetailView } from "@/components/admin/admin-result-detail-view";

export default async function AdminResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/auth/admin-login");
  }

  const { id } = await params;
  let data: ResultDetailsData | null = null;

  try {
    data = await getResultDetails(id, { isAdmin: true });
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  return <AdminResultDetailView data={data} />;
}
