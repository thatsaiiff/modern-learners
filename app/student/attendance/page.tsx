"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AttendanceSummaryData {
  studentInfo: {
    id: string;
    name: string;
    studentCode: string;
    rollNumber: string;
    className: string;
  };
  summary: {
    attendancePercentage: number;
    totalSessions: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    isLowAttendance: boolean;
  };
  activeCheckInSession: {
    id: string;
    title: string;
    endTime: string;
  } | null;
  recentRecords: Array<{
    id: string;
    sessionId: string;
    sessionTitle: string;
    className: string;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE";
    method: string;
    markedAt: string;
    remarks?: string;
  }>;
}

export default function StudentAttendancePage() {
  const [data, setData] = useState<AttendanceSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/student/attendance");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load attendance:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleCheckIn = async () => {
    try {
      setIsCheckingIn(true);
      setCheckInMsg(null);
      setCheckInError(null);

      const res = await fetch("/api/student/attendance/check-in", {
        method: "POST",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setCheckInError(json.error || "Check-in failed.");
        setIsCheckingIn(false);
        return;
      }

      setCheckInMsg(json.message);
      setIsCheckingIn(false);
      loadAttendance();
    } catch {
      setCheckInError("Network error during check-in.");
      setIsCheckingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading attendance records...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    attendancePercentage: 100,
    totalSessions: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    isLowAttendance: false,
  };
  const records = data?.recentRecords || [];
  const activeCheckIn = data?.activeCheckInSession;

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
              <CalendarCheck2 className="h-6 w-6 mr-2 text-indigo-600" />
              My Attendance Records
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tuition class presence log, student check-in and monthly attendance rates
            </p>
          </div>
        </div>
      </div>

      {/* Live Check-In Banner */}
      {activeCheckIn && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 shadow-md shadow-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-block text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
              Live Attendance Window Open
            </span>
            <h3 className="text-xl font-bold">{activeCheckIn.title}</h3>
            <p className="text-xs text-emerald-100 flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Check-in window open until {new Date(activeCheckIn.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <div>
            <Button
              onClick={handleCheckIn}
              isLoading={isCheckingIn}
              disabled={isCheckingIn}
              className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
              Check In to Class Now
            </Button>
          </div>
        </div>
      )}

      {/* Check In Alerts */}
      {checkInMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start space-x-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{checkInMsg}</span>
        </div>
      )}

      {checkInError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start space-x-2 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{checkInError}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Attendance Rate
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div
              className={`text-2xl sm:text-3xl font-black ${
                summary.attendancePercentage >= 80
                  ? "text-emerald-600"
                  : summary.attendancePercentage >= 60
                  ? "text-amber-600"
                  : "text-rose-600"
              }`}
            >
              {summary.attendancePercentage}%
            </div>
            <p className="text-[11px] text-slate-400">Target: ≥75%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Present
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {summary.presentCount}
            </div>
            <p className="text-[11px] text-slate-400">Classes attended</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Late
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {summary.lateCount}
            </div>
            <p className="text-[11px] text-slate-400">Late arrivals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Absent
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-rose-600">
              {summary.absentCount}
            </div>
            <p className="text-[11px] text-slate-400">Missed classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Log Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            Attendance Log ({records.length} sessions)
          </CardTitle>
          <Badge variant="info">{data?.studentInfo.className}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Session Title</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5">Marked At</th>
                  <th className="px-4 py-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                      No attendance sessions recorded yet.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{r.sessionTitle}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {new Date(r.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {r.method === "STUDENT_CHECKIN" ? (
                          <Badge variant="info">Self Check-in</Badge>
                        ) : (
                          <span className="text-slate-400">Teacher Marked</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(r.markedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Badge
                          variant={
                            r.status === "PRESENT"
                              ? "success"
                              : r.status === "LATE"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {r.status}
                        </Badge>
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
