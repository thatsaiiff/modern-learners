"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  BookOpen,
  AlertTriangle,
  ArrowLeft,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendDirection } from "@/lib/analytics/constants";

interface StudentAnalyticsData {
  summary: {
    overallAverage: number | null;
    passRate: number | null;
    testsAttempted: number;
    testsPassed: number;
    testsFailed: number;
    highestScore: number | null;
    lowestScore: number | null;
    currentGrade: string;
    trendDirection: TrendDirection;
  };
  performanceTrend: Array<{
    resultId: string;
    date: string;
    examTitle: string;
    subjectName: string;
    percentage: number;
    rawMarks: number;
    maximumMarks: number;
    grade: string;
    passed: boolean;
  }>;
  subjectPerformance: Array<{
    code: string;
    name: string;
    testCount: number;
    average: number;
    passRate: number;
    highest: number;
    lowest: number;
  }>;
  topicPerformance: Array<{
    topic: string;
    subjectName: string;
    totalQuestions: number;
    correct: number;
    incorrect: number;
    accuracy: number;
    status: string;
  }>;
  weakTopics: Array<{
    topic: string;
    subjectName: string;
    totalQuestions: number;
    correct: number;
    accuracy: number;
  }>;
  needsAttentionAlerts: Array<{
    code: string;
    title: string;
    detail: string;
    severity: string;
  }>;
}

export default function StudentPerformancePage() {
  const [data, setData] = useState<StudentAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStudentAnalytics() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/analytics/student/me");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error("Failed to load student analytics:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStudentAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading your performance analytics...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    overallAverage: null,
    passRate: null,
    testsAttempted: 0,
    testsPassed: 0,
    testsFailed: 0,
    highestScore: null,
    lowestScore: null,
    currentGrade: "N/A",
    trendDirection: "INSUFFICIENT_DATA" as TrendDirection,
  };
  const trend = data?.performanceTrend || [];
  const subjects = data?.subjectPerformance || [];
  const topics = data?.topicPerformance || [];
  const alerts = data?.needsAttentionAlerts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/student"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
              <Award className="h-6 w-6 mr-2 text-indigo-600" />
              My Academic Performance Analytics
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Deep topic-level analysis, subject radars, score progression, and revision recommendations
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Overall Average
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-indigo-600">
              {summary.overallAverage !== null ? `${summary.overallAverage}%` : "—"}
            </div>
            <p className="text-[11px] text-slate-400">Current Grade: {summary.currentGrade || "N/A"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pass Rate
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {summary.passRate !== null ? `${summary.passRate}%` : "—"}
            </div>
            <p className="text-[11px] text-slate-400">
              {summary.testsPassed} passed / {summary.testsAttempted} tests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Highest Score
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {summary.highestScore !== null ? `${summary.highestScore}%` : "—"}
            </div>
            <p className="text-[11px] text-slate-400">
              Lowest: {summary.lowestScore !== null ? `${summary.lowestScore}%` : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Score Trend
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl sm:text-2xl font-black flex items-center">
              {summary.trendDirection === "IMPROVING" && (
                <span className="text-emerald-600 flex items-center">
                  <TrendingUp className="h-6 w-6 mr-1" /> Improving
                </span>
              )}
              {summary.trendDirection === "DECLINING" && (
                <span className="text-rose-600 flex items-center">
                  <TrendingDown className="h-6 w-6 mr-1" /> Declining
                </span>
              )}
              {summary.trendDirection === "STABLE" && (
                <span className="text-indigo-600 flex items-center">
                  <Minus className="h-6 w-6 mr-1" /> Stable
                </span>
              )}
              {summary.trendDirection === "INSUFFICIENT_DATA" && (
                <span className="text-slate-400 text-sm">Need 2+ Tests</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Trajectory analysis</p>
          </CardContent>
        </Card>
      </div>

      {/* Proactive Needs-Attention Alerts for Student */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="p-4 pb-2 border-b border-amber-100">
            <CardTitle className="text-sm font-bold text-amber-900 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-600" />
              Important Academic Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {alerts.map((al, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white border border-amber-200 text-xs text-amber-950 space-y-0.5"
              >
                <p className="font-bold flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mr-1.5" />
                  {al.title}
                </p>
                <p className="text-slate-600 pl-3">{al.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Chronological Performance Progression */}
      <Card>
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-indigo-600" />
            Official Score Progression Trend
          </CardTitle>
          <span className="text-xs text-slate-400">{trend.length} Tests Evaluated</span>
        </CardHeader>
        <CardContent className="p-5">
          {trend.length === 0 ? (
            <p className="text-center py-8 text-xs text-slate-400">No test data available yet.</p>
          ) : (
            <div className="space-y-3">
              {trend.map((t, idx: number) => (
                <div
                  key={t.resultId}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900">{t.examTitle}</h4>
                      <span className="text-slate-500 text-[11px]">
                        {t.subjectName} • {new Date(t.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {t.rawMarks}/{t.maximumMarks}
                      </span>
                      <span className="block text-[11px] font-bold text-indigo-600">
                        {t.percentage}% • {t.grade}
                      </span>
                    </div>
                    <Badge variant={t.passed ? "success" : "danger"}>
                      {t.passed ? "Pass" : "Fail"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject and Topic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Breakdown */}
        <Card>
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold flex items-center">
              <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
              Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {subjects.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">No subject data yet.</p>
            ) : (
              subjects.map((sub) => (
                <div key={sub.code} className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{sub.name}</span>
                    <span className="text-slate-600">
                      Average: <strong className="text-indigo-600">{sub.average}%</strong> (
                      {sub.testCount} tests)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        sub.average >= 80 ? "bg-indigo-600" : "bg-amber-500"
                      }`}
                      style={{ width: `${sub.average}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Topic Accuracy Breakdown */}
        <Card>
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center">
              <Layers className="h-4 w-4 mr-2 text-indigo-600" />
              Topic Accuracy Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {topics.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">No topic data available yet.</p>
            ) : (
              topics.map((tp) => (
                <div
                  key={tp.topic}
                  className="p-3 rounded-xl border border-slate-100 bg-white text-xs flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{tp.topic}</h4>
                    <span className="text-slate-400 text-[11px]">{tp.subjectName}</span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span
                      className={`font-bold block ${
                        tp.accuracy >= 80 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {tp.accuracy}% Accuracy
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {tp.correct} / {tp.totalQuestions} questions
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
