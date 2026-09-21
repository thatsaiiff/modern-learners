"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Download,
  Users,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface StudentReportItem {
  id: string;
  studentCode: string;
  name: string;
  rollNumber: string;
  className: string;
  classNumber: number;
}

export default function AdminReportsDashboardPage() {
  const [classFilter, setClassFilter] = useState("8");
  const [students, setStudents] = useState<StudentReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        classNumber: classFilter,
        status: "ACTIVE",
      });
      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setIsLoading(false);
    }
  }, [classFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <FileSpreadsheet className="h-6 w-6 mr-2 text-indigo-600" />
          Academic Reports & Export Center
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Generate individual printable report cards, export full exam result datasets and attendance spreadsheets
        </p>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Results CSV Export */}
        <Card className="border-indigo-100 hover:border-indigo-300 transition">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold flex items-center">
              <Download className="h-5 w-5 mr-2 text-indigo-600" />
              Examination Results Dataset (CSV)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <p className="text-xs text-slate-600">
              Download complete raw records of all official exam submissions with student IDs, marks, percentages, and grades.
            </p>
            <a href="/api/reports/export/csv?type=results" download>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 space-x-1.5">
                <Download className="h-4 w-4" />
                <span>Export Exam Results (CSV)</span>
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* Attendance CSV Export */}
        <Card className="border-emerald-100 hover:border-emerald-300 transition">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-base font-bold flex items-center">
              <Download className="h-5 w-5 mr-2 text-emerald-600" />
              Attendance Records Dataset (CSV)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <p className="text-xs text-slate-600">
              Download session-by-session presence logs with check-in methods, timestamps, and teacher remarks.
            </p>
            <a href="/api/reports/export/csv?type=attendance" download>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 space-x-1.5">
                <Download className="h-4 w-4" />
                <span>Export Attendance Log (CSV)</span>
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Printable Report Cards Roster */}
      <Card>
        <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center">
              <Printer className="h-5 w-5 mr-2 text-indigo-600" />
              Printable Student Report Cards Roster
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Select class to generate official individual student report cards
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Select Class:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Roll No</th>
                  <th className="px-4 py-3.5">Student Name</th>
                  <th className="px-4 py-3.5">Student ID</th>
                  <th className="px-4 py-3.5">Class</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                      Loading class roster...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500">
                      <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-slate-700">No students enrolled</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Enroll students in Class {classFilter} to generate report cards.
                      </p>
                    </td>
                  </tr>
                ) : (
                  students.map((stu) => (
                    <tr key={stu.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900">
                        {stu.rollNumber}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{stu.name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-indigo-700">
                        {stu.studentCode}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">{stu.className}</td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/students/${stu.id}/report-card`}>
                          <Button size="sm" variant="outline" className="text-xs h-8 space-x-1">
                            <Printer className="h-3.5 w-3.5 text-indigo-600" />
                            <span>Open Report Card</span>
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
