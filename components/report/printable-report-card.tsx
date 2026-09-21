"use client";

import React from "react";
import {
  Printer,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Percent,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportCardData } from "@/lib/services/report.service";

interface PrintableReportCardProps {
  data: ReportCardData;
  isAdmin?: boolean;
  onEditRemark?: () => void;
}

export function PrintableReportCard({ data, isAdmin, onEditRemark }: PrintableReportCardProps) {
  const {
    academy,
    student,
    performanceSummary,
    attendanceSummary,
    subjectBreakdown,
    recentExams,
    strengths,
    areasForImprovement,
    teacherRemark,
  } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Control Bar (Hidden on Print) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Academic Report Card Preview</h3>
          <p className="text-xs text-slate-500">Ready for high-resolution A4 printing or PDF export</p>
        </div>
        <div className="flex items-center space-x-2">
          {isAdmin && onEditRemark && (
            <Button size="sm" variant="outline" onClick={onEditRemark}>
              Edit Teacher Remarks
            </Button>
          )}
          <Button size="sm" onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 space-x-1.5">
            <Printer className="h-4 w-4" />
            <span>Print / Save PDF</span>
          </Button>
        </div>
      </div>

      {/* Actual Printable Document Container (A4 Printable Layout) */}
      <div className="report-card-document bg-white border border-slate-300 sm:rounded-2xl p-6 sm:p-10 shadow-sm text-slate-900 space-y-6 max-w-4xl mx-auto">
        {/* Academy Header Banner */}
        <div className="border-b-2 border-indigo-600 pb-5 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                {academy.name}
              </h1>
              <p className="text-xs font-semibold text-indigo-700">{academy.brandSubtitle}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Session {student.sessionName} • Academic Evaluation Report
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="inline-block font-black text-xs uppercase px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 mb-1">
              OFFICIAL REPORT
            </span>
            <p className="text-[11px] text-slate-500">Date: {academy.generatedAt}</p>
          </div>
        </div>

        {/* Student Metadata Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Student Name</span>
            <strong className="text-sm font-bold text-slate-900">{student.name}</strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Student ID</span>
            <strong className="font-mono text-indigo-700">{student.studentCode}</strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Class & Roll</span>
            <strong className="text-slate-900">
              {student.className} • Roll: <span className="font-mono">{student.rollNumber}</span>
            </strong>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block uppercase font-medium">Status</span>
            <span className="font-bold text-emerald-700">{student.status}</span>
          </div>
        </div>

        {/* Overall Summary KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 text-center">
            <span className="text-[11px] font-semibold text-indigo-900 uppercase">Overall Average</span>
            <div className="text-2xl font-black text-indigo-700 mt-0.5">
              {performanceSummary.overallAverage !== null ? `${performanceSummary.overallAverage}%` : "—"}
            </div>
            <span className="text-[11px] font-bold text-indigo-800">{performanceSummary.performanceLabel}</span>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 text-center">
            <span className="text-[11px] font-semibold text-emerald-900 uppercase">Pass Rate</span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">
              {performanceSummary.passRate !== null ? `${performanceSummary.passRate}%` : "—"}
            </div>
            <span className="text-[11px] text-emerald-800">
              {performanceSummary.testsPassed} / {performanceSummary.testsAttempted} Tests Passed
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <span className="text-[11px] font-semibold text-slate-600 uppercase">Attendance</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {attendanceSummary.attendancePercentage}%
            </div>
            <span className="text-[11px] text-slate-500">
              {attendanceSummary.presentCount + attendanceSummary.lateCount} / {attendanceSummary.totalSessions} Classes
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <span className="text-[11px] font-semibold text-slate-600 uppercase">Highest Score</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {performanceSummary.highestScore !== null ? `${performanceSummary.highestScore}%` : "—"}
            </div>
            <span className="text-[11px] text-slate-500">Grade: {performanceSummary.grade}</span>
          </div>
        </div>

        {/* Subject Performance Breakdown Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
            <Percent className="h-3.5 w-3.5 mr-1 text-indigo-600" />
            Subject-Wise Academic Performance
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Subject</th>
                  <th className="px-3.5 py-2.5 text-center">Tests</th>
                  <th className="px-3.5 py-2.5 text-center">Average %</th>
                  <th className="px-3.5 py-2.5 text-center">Pass Rate</th>
                  <th className="px-3.5 py-2.5 text-center">Highest</th>
                  <th className="px-3.5 py-2.5 text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjectBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      No subject exam records available for this session.
                    </td>
                  </tr>
                ) : (
                  subjectBreakdown.map((sub) => (
                    <tr key={sub.code}>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{sub.name}</td>
                      <td className="px-3.5 py-2.5 text-center">{sub.testsCount}</td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-indigo-700">
                        {sub.averagePercentage}%
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-semibold text-emerald-700">
                        {sub.passRate}%
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono">{sub.highestScore}%</td>
                      <td className="px-3.5 py-2.5 text-right font-bold text-slate-800">{sub.grade}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Official Examinations Table */}
        {recentExams.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <FileText className="h-3.5 w-3.5 mr-1 text-indigo-600" />
              Recent Examination Results
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Exam Title</th>
                    <th className="px-3.5 py-2.5">Subject</th>
                    <th className="px-3.5 py-2.5 text-center">Score</th>
                    <th className="px-3.5 py-2.5 text-center">Percentage</th>
                    <th className="px-3.5 py-2.5 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentExams.map((ex, idx) => (
                    <tr key={idx}>
                      <td className="px-3.5 py-2 text-slate-500 font-mono">{ex.date}</td>
                      <td className="px-3.5 py-2 font-bold text-slate-900">{ex.title}</td>
                      <td className="px-3.5 py-2 text-slate-600">{ex.subjectName}</td>
                      <td className="px-3.5 py-2 text-center font-mono">
                        {ex.score}/{ex.maxMarks}
                      </td>
                      <td className="px-3.5 py-2 text-center font-bold text-indigo-700">
                        {ex.percentage}%
                      </td>
                      <td className="px-3.5 py-2 text-right font-bold text-slate-800">{ex.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Strengths & Improvement Areas Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Strengths */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
            <h4 className="font-bold text-emerald-950 flex items-center text-xs">
              <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
              Academic Strengths & Competencies
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              {strengths.map((str, idx) => (
                <li key={idx}>{str}</li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-2">
            <h4 className="font-bold text-amber-950 flex items-center text-xs">
              <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-600" />
              Identified Revision & Improvement Areas
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              {areasForImprovement.map((imp, idx) => (
                <li key={idx}>{imp}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Official Teacher Remarks */}
        <div className="p-4 rounded-xl border-2 border-indigo-100 bg-slate-50/60 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="font-bold uppercase tracking-wider text-indigo-950">
              Official Faculty & Teacher Remarks
            </span>
            {teacherRemark?.authorName && (
              <span className="text-[11px] text-slate-500">By {teacherRemark.authorName}</span>
            )}
          </div>
          <p className="text-slate-800 font-medium leading-relaxed italic">
            &quot;{teacherRemark?.remark || "Consistent student participation and academic effort across the term."}&quot;
          </p>
        </div>

        {/* Signatures and Certification Footer */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-center">
          <div>
            <div className="h-10 border-b border-slate-300 w-48 mx-auto" />
            <p className="font-bold text-slate-800 mt-1">Class Teacher / Evaluator</p>
            <p className="text-[10px] text-slate-400">Saif Classes</p>
          </div>
          <div>
            <div className="h-10 border-b border-slate-300 w-48 mx-auto" />
            <p className="font-bold text-slate-800 mt-1">Academic Director</p>
            <p className="text-[10px] text-slate-400">Modern Learners</p>
          </div>
        </div>
      </div>
    </div>
  );
}
