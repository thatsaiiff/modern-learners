"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  AlertTriangle,
  Sparkles,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentAttentionProfile } from "@/lib/services/analytics.service";

interface AdminAnalyticsOverviewData {
  kpis: {
    totalStudents: number;
    activeStudents: number;
    examsConducted: number;
    upcomingExams: number;
    testsThisMonth: number;
    averagePercentage: number;
    overallPassRate: number;
    outstandingStudentsCount: number;
    needsAttentionCount: number;
  };
  classBreakdown: Array<{
    classNumber: number;
    className: string;
    studentsCount: number;
    testsCount: number;
    averagePercentage: number | null;
    passRate: number | null;
  }>;
  subjectBreakdown: Array<{
    code: string;
    name: string;
    testsCount: number;
    averagePercentage: number | null;
    passRate: number | null;
  }>;
  recentOfficialResultsCount: number;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsOverviewData | null>(null);
  const [attentionStudents, setAttentionStudents] = useState<StudentAttentionProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setIsLoading(true);
        const [ovRes, attRes] = await Promise.all([
          fetch("/api/analytics/admin/overview"),
          fetch("/api/analytics/admin/needs-attention"),
        ]);

        const ovData = await ovRes.json();
        const attData = await attRes.json();

        if (ovData.success) setData(ovData.data);
        if (attData.success) setAttentionStudents(attData.students);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Calculating academic analytics...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {
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
  const classBreakdown = data?.classBreakdown || [];
  const subjectBreakdown = data?.subjectBreakdown || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-indigo-600" />
            Performance Analytics & Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Authoritative metrics aggregated across official examinations, subjects, topics and classes
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Batch Average
            </span>
            <Percent className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-slate-900">
              {kpis.averagePercentage ? `${kpis.averagePercentage}%` : "—"}
            </div>
            <p className="text-xs text-slate-400 mt-1">Official test average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overall Pass Rate
            </span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-emerald-600">
              {kpis.overallPassRate ? `${kpis.overallPassRate}%` : "—"}
            </div>
            <p className="text-xs text-slate-400 mt-1">Threshold: ≥80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding (≥95%)
            </span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-amber-600">
              {kpis.outstandingStudentsCount || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">OP / Outstanding tests</p>
          </CardContent>
        </Card>

        <Card className={attentionStudents.length > 0 ? "border-amber-300 bg-amber-50/20" : ""}>
          <CardHeader className="p-5 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Needs Attention
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-amber-600">
              {attentionStudents.length}
            </div>
            <p className="text-xs text-slate-400 mt-1">Rule-triggered alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Needs Attention Section */}
      <div id="attention" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
            Students Requiring Academic Attention ({attentionStudents.length})
          </h3>
          <span className="text-xs text-slate-500">Transparent Rule-Based Signals</span>
        </div>

        {attentionStudents.length === 0 ? (
          <Card className="p-8 text-center bg-emerald-50/40 border-emerald-200 text-slate-600">
            <Sparkles className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
            <p className="font-bold text-sm text-slate-800">No Attention Alerts Triggered</p>
            <p className="text-xs text-slate-500 mt-0.5">
              All active students are performing above the configured intervention thresholds.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attentionStudents.map((stu) => (
              <Card key={stu.studentId} className="border-amber-200 shadow-xs hover:border-amber-300 transition">
                <CardHeader className="p-4 pb-2 border-b border-amber-100 flex flex-row items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-slate-900">{stu.name}</h4>
                      <Badge variant="info">Class {stu.classNumber}</Badge>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Roll: {stu.rollNumber} • {stu.studentCode}
                    </span>
                  </div>
                  <Link href={`/admin/students/${stu.studentId}`}>
                    <Button size="sm" variant="outline" className="text-xs h-8 px-2.5">
                      Profile <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-600">
                    Average: <strong className="text-slate-900">{stu.averagePercentage}%</strong> • Pass Rate:{" "}
                    <strong className="text-slate-900">{stu.passRate}%</strong> ({stu.testsCount} tests)
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {stu.triggers.map((trig, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-950 flex items-start space-x-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                        <div>
                          <strong className="block leading-tight">{trig.title}</strong>
                          <span className="text-slate-600 leading-tight">{trig.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Class and Subject Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Performance Table */}
        <Card>
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center">
              <Users className="h-4 w-4 mr-2 text-indigo-600" />
              Class-wise Academic Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Tests</th>
                  <th className="px-4 py-3">Average %</th>
                  <th className="px-4 py-3">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classBreakdown.map((cls) => (
                  <tr key={cls.classNumber} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{cls.className}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">{cls.studentsCount}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">{cls.testsCount}</td>
                    <td className="px-4 py-3.5 font-bold text-indigo-600">
                      {cls.averagePercentage !== null ? `${cls.averagePercentage}%` : "—"}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {cls.passRate !== null ? `${cls.passRate}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Subject Performance Breakdown */}
        <Card>
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center">
              <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
              Subject Performance Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {subjectBreakdown.map((sub) => (
              <div key={sub.code} className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{sub.name}</span>
                  <div className="space-x-3 text-slate-600">
                    <span>
                      Avg: <strong className="text-indigo-600">{sub.averagePercentage ? `${sub.averagePercentage}%` : "—"}</strong>
                    </span>
                    <span>
                      Pass: <strong className="text-emerald-600">{sub.passRate ? `${sub.passRate}%` : "—"}</strong>
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${sub.averagePercentage || 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
