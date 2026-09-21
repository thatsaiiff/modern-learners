"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, Upload, Eye, Plus, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExamItem {
  id: string;
  title: string;
  class: { classNumber: number; name: string };
  subject: { name: string; code: string };
  chapter: { name: string } | null;
  durationMinutes: number;
  totalMarks: number;
  passingPercentage: number;
  status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "CLOSED" | "ARCHIVED";
  createdAt: string;
  _count: {
    examQuestions: number;
    assignments: number;
    attempts: number;
  };
}

export default function ExamsListPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchExams = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (classFilter !== "all") params.append("classNumber", classFilter);

      const res = await fetch(`/api/exams?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setExams(data.exams);
      }
    } catch (err) {
      console.error("Failed to fetch exams:", err);
    } finally {
      setIsLoading(false);
    }
  }, [classFilter]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <FileText className="h-6 w-6 mr-2 text-indigo-600" />
            Examinations Manager
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse created, imported and assigned examination papers
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/admin/exams/import">
            <Button size="sm" className="space-x-1.5 bg-indigo-600 hover:bg-indigo-700">
              <Upload className="h-4 w-4" />
              <span>Import HTML Exam</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-500">Filter by Class:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Classes</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total Exams: <strong>{exams.length}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Exams Grid / Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-800">Available Exams</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Exam Title</th>
                  <th className="px-4 py-3.5">Class & Subject</th>
                  <th className="px-4 py-3.5">Questions</th>
                  <th className="px-4 py-3.5">Marks</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                      Loading exams...
                    </td>
                  </tr>
                ) : exams.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-slate-700">No exams found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Import an HTML question paper to create your first exam.
                      </p>
                      <Link href="/admin/exams/import" className="inline-block mt-3">
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-1" />
                          Import HTML Exam
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ) : (
                  exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{exam.title}</span>
                        {exam.chapter && (
                          <span className="text-[11px] text-slate-400">{exam.chapter.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="info">Class {exam.class.classNumber}</Badge>
                        <span className="text-xs text-slate-700 ml-2 font-medium">
                          {exam.subject.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {exam._count.examQuestions} Qs
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">{exam.totalMarks}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {exam.durationMinutes} mins
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            exam.status === "ACTIVE"
                              ? "success"
                              : exam.status === "PUBLISHED"
                              ? "info"
                              : "default"
                          }
                        >
                          {exam.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1">
                        <Link href={`/admin/exams/${exam.id}`}>
                          <button
                            title="View Exam Details & Question Snapshots"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
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
