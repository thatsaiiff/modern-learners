"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Award, Eye, BookOpen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ResultItem {
  id: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  className: string;
  chapterName: string | null;
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

export default function StudentResultsListPage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadResults() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/student/results");
        const data = await res.json();
        if (data.success) {
          setResults(data.results);
        }
      } catch (err) {
        console.error("Failed to load results:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadResults();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
          <Award className="h-6 w-6 mr-2 text-indigo-600" />
          My Examination Results
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Historical scores, official grades, performance breakdowns and question review
        </p>
      </div>

      <Card>
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-800">
            Total Results: {results.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-10 text-xs text-slate-400">Loading results...</p>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm text-slate-700">No examination results yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Completed exam results will be listed here immediately after submission.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900">
                        {r.examTitle}
                      </h4>
                      <Badge variant={r.passed ? "success" : "danger"}>
                        {r.passed ? "PASSED" : "NEEDS IMPROVEMENT"}
                      </Badge>
                      {r.isOfficial && <Badge variant="info">Official Result</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {r.subjectName} • {r.className}
                      {r.chapterName && ` • Chapter: ${r.chapterName}`} • Attempt #{r.attemptNumber}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Submitted on {new Date(r.submittedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xl sm:text-2xl font-black text-slate-900">
                        {r.rawMarks} / {r.maximumMarks}
                      </div>
                      <span className="text-xs font-bold text-indigo-600 block">
                        {r.percentage}% • {r.grade}
                      </span>
                    </div>

                    <Link href={`/student/results/${r.id}`}>
                      <button
                        title="View Detailed Analysis & Question Review"
                        className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
