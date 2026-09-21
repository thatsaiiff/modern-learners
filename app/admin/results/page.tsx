"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  Search,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResultRow {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  rollNumber: string;
  className: string;
  subjectName: string;
  examId: string;
  examTitle: string;
  rawMarks: number;
  maximumMarks: number;
  percentage: number;
  grade: string;
  performanceLabel: string;
  passed: boolean;
  attemptNumber: number;
  isOfficial: boolean;
  submittedAt: string;
}

export default function AdminResultsPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [passedFilter, setPassedFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchResults = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search.trim()) params.append("search", search.trim());
      if (classFilter !== "all") params.append("classNumber", classFilter);
      if (passedFilter !== "all") params.append("passed", passedFilter);

      const res = await fetch(`/api/results?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.results);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to load results:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, classFilter, passedFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchResults]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Award className="h-6 w-6 mr-2 text-indigo-600" />
            Examination Results
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Evaluated student attempts, score breakdowns, grades and attempt histories
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/admin/retakes">
            <Button variant="outline" size="sm" className="space-x-1.5 text-amber-700 border-amber-200 hover:bg-amber-50">
              <RotateCcw className="h-4 w-4 text-amber-600" />
              <span>Retake Requests</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Classes</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>

            <select
              value={passedFilter}
              onChange={(e) => setPassedFilter(e.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Outcomes</option>
              <option value="true">Passed (≥80%)</option>
              <option value="false">Needs Improvement</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            Total Results: {pagination.total}
          </CardTitle>
          {pagination.total > 0 && (
            <span className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <div className="h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading results...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-700">No results found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Completed exam attempts will automatically appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Result Cards (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {results.map((r) => (
                  <div key={r.id} className="p-4 space-y-2.5 hover:bg-slate-50/70 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-slate-900 truncate">{r.studentName}</h4>
                          <Badge variant={r.passed ? "success" : "danger"}>
                            {r.passed ? "Pass" : "Fail"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 font-mono tabular-nums">
                          Roll: {r.rollNumber} • ID: <span className="text-indigo-600 font-bold">{r.studentCode}</span>
                        </p>
                        <p className="text-[11px] text-slate-700 font-medium">
                          {r.examTitle} ({r.className} • {r.subjectName})
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-sm text-slate-900 block tabular-nums">
                          {r.rawMarks}/{r.maximumMarks}
                        </span>
                        <span className="text-[11px] font-bold text-indigo-700 block tabular-nums">
                          {r.percentage}% • {r.grade}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">
                        {new Date(r.submittedAt).toLocaleDateString()} • Att #{r.attemptNumber}
                      </span>
                      <Link href={`/admin/results/${r.id}`}>
                        <Button size="sm" variant="outline" className="h-9 px-3 text-xs space-x-1">
                          <Eye className="h-3.5 w-3.5 text-indigo-600" />
                          <span>View Review</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5">Student</th>
                      <th className="px-4 py-3.5">Roll No</th>
                      <th className="px-4 py-3.5">Exam</th>
                      <th className="px-4 py-3.5">Score</th>
                      <th className="px-4 py-3.5">Percentage</th>
                      <th className="px-4 py-3.5">Grade</th>
                      <th className="px-4 py-3.5">Outcome</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 block">{r.studentName}</span>
                          <span className="font-mono text-[11px] text-indigo-600">{r.studentCode}</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-700 tabular-nums">
                          {r.rollNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-900 block">{r.examTitle}</span>
                          <span className="text-[11px] text-slate-400">
                            {r.className} • {r.subjectName} • Att #{r.attemptNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-black text-slate-900 tabular-nums">
                          {r.rawMarks} / {r.maximumMarks}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-indigo-700 tabular-nums">{r.percentage}%</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{r.grade}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={r.passed ? "success" : "danger"}>
                            {r.passed ? "Pass" : "Fail"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/admin/results/${r.id}`}>
                            <button
                              title="View Result Details & Review"
                              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition min-h-[36px] min-w-[36px]"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} results
              </span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchResults(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchResults(pagination.page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
