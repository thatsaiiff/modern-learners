import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth/session";
import { getStudentReportCardData } from "@/lib/services/report.service";
import { PrintableReportCard } from "@/components/report/printable-report-card";
import { ArrowLeft } from "lucide-react";

export default async function StudentReportCardPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/auth/student-login");
  }

  let reportData = null;
  try {
    reportData = await getStudentReportCardData(session.studentId, undefined, {
      studentId: session.studentId,
      isAdmin: false,
    });
  } catch (err) {
    console.error("Failed to load report card:", err);
  }

  if (!reportData) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-4">
        <h3 className="font-bold text-base text-slate-900">Report Card Unavailable</h3>
        <p className="text-xs text-slate-500">
          Unable to generate academic report card at this time.
        </p>
        <Link href="/student">
          <button className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold">
            Back to Dashboard
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          href="/student"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <PrintableReportCard data={reportData} />
    </div>
  );
}
