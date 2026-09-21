import Link from "next/link";
import { getAdminSession } from "@/lib/auth/session";
import { getAdminAnalyticsOverview } from "@/lib/services/analytics.service";
import {
  Users,
  FileText,
  Upload,
  ArrowRight,
  TrendingUp,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  const analytics = await getAdminAnalyticsOverview();

  const kpis = analytics?.kpis || {
    totalStudents: 0,
    activeStudents: 0,
    examsConducted: 0,
    upcomingExams: 0,
    testsThisMonth: 0,
    averagePercentage: 0,
    overallPassRate: 0,
    outstandingStudentsCount: 0,
    needsAttentionCount: 0,
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Academic Management Console
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Welcome back, <strong className="text-slate-800">{session?.name}</strong> • Saif Classes
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link href="/admin/exams/import">
            <Button size="sm" className="space-x-1.5 bg-indigo-600 hover:bg-indigo-700">
              <Upload className="h-4 w-4" />
              <span>Upload HTML Exam</span>
            </Button>
          </Link>
          <Link href="/admin/students">
            <Button size="sm" variant="outline" className="space-x-1.5">
              <Users className="h-4 w-4 text-indigo-600" />
              <span>Students</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="p-4 sm:p-5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Students
            </span>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {kpis.activeStudents}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Enrolled across Class 6–10</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Batch Average
            </span>
            <Percent className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-indigo-700 tabular-nums">
              {kpis.averagePercentage ? `${kpis.averagePercentage}%` : "—"}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Official test mean</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pass Rate
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">
              {kpis.overallPassRate ? `${kpis.overallPassRate}%` : "—"}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Threshold: ≥80%</p>
          </CardContent>
        </Card>

        <Card className={kpis.needsAttentionCount > 0 ? "border-amber-300 bg-amber-50/20" : ""}>
          <CardHeader className="p-4 sm:p-5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Needs Attention
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-amber-700 tabular-nums">
              {kpis.needsAttentionCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Intervention alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card className="hover:border-indigo-300 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold mb-2">
              <Users className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Students & Academic Classes</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Manage Class 6–10 enrollments, generate permanent Student IDs and roll numbers, perform academic promotions, and review rollback logs.
            </p>
            <Link
              href="/admin/students"
              className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Open Student Management <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-indigo-300 transition-all">
          <CardHeader className="p-5 pb-2">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold mb-2">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-bold">Modern Learners HTML Exam Importer</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Import prepared HTML question papers with machine-readable metadata, validate questions, check marks sum, and assign to students.
            </p>
            <Link
              href="/admin/exams/import"
              className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Import HTML Exam Paper <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
