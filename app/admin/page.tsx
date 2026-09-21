import Link from "next/link";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/session";
import { Users, FileText, Upload, CalendarCheck2, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();

  // Load real counts from database
  const activeSession = await prisma.academicSession.findFirst({
    where: { isActive: true },
  });

  const totalStudents = await prisma.student.count({
    where: { status: "ACTIVE" },
  });

  const totalExams = await prisma.exam.count();

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Academic Overview
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome back, {session?.name} • Academic Session:{" "}
            <span className="font-semibold text-indigo-600">
              {activeSession?.name || "2026-27"}
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/admin/exams/import">
            <Button size="sm" className="space-x-1.5">
              <Upload className="h-4 w-4" />
              <span>Upload HTML Exam</span>
            </Button>
          </Link>
          <Link href="/admin/students">
            <Button size="sm" variant="outline" className="space-x-1.5">
              <Users className="h-4 w-4" />
              <span>Manage Students</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Students
            </span>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-slate-900">{totalStudents}</div>
            <p className="text-xs text-slate-500 mt-1">Active enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Exams
            </span>
            <FileText className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-slate-900">{totalExams}</div>
            <p className="text-xs text-slate-500 mt-1">Created & imported tests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Batch Average
            </span>
            <span className="text-xs font-bold text-slate-400">—</span>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-slate-900">—</div>
            <p className="text-xs text-slate-500 mt-1">Across all classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Attendance
            </span>
            <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-emerald-600">—</div>
            <p className="text-xs text-slate-500 mt-1">Monthly average</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Students & Academic Classes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              Manage Class 6–10 enrollments, generate roll numbers (e.g. 08-2627-001), perform academic promotions and review rollback logs.
            </p>
            <Link
              href="/admin/students"
              className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Open Student Management <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modern Learners HTML Exam Importer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              Import prepared HTML question papers with machine-readable metadata, validate questions, check marks sum, and assign to students.
            </p>
            <Link
              href="/admin/exams/import"
              className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Import HTML Exam Paper <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
