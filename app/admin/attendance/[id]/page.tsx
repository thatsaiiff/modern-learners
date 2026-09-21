"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarCheck2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttendanceStatus } from "@prisma/client";

interface SessionMeta {
  id: string;
  title: string;
  className: string;
  classNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  studentCheckInEnabled: boolean;
}

interface RosterStudent {
  recordId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  rollNumber: string;
  status: AttendanceStatus;
  method: string;
  markedAt: string;
  remarks?: string;
}

export default function AdminAttendanceRosterPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<SessionMeta | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/attendance/sessions/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        setRoster(data.roster);
      }
    } catch {
      setErrorMsg("Failed to load attendance roster.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const updateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status } : r))
    );
  };

  const markAllPresent = () => {
    setRoster((prev) =>
      prev.map((r) => ({ ...r, status: AttendanceStatus.PRESENT }))
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSaveSuccess(null);

      const res = await fetch(`/api/attendance/sessions/${sessionId}/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: roster.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            remarks: r.remarks,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to save attendance.");
        setIsSaving(false);
        return;
      }

      setSaveSuccess(data.message);
      setIsSaving(false);
    } catch {
      setErrorMsg("Network error while saving attendance.");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading class roster...</p>
      </div>
    );
  }

  const presentCount = roster.filter((r) => r.status === AttendanceStatus.PRESENT).length;
  const lateCount = roster.filter((r) => r.status === AttendanceStatus.LATE).length;
  const absentCount = roster.filter((r) => r.status === AttendanceStatus.ABSENT).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/attendance"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sessions
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
              <CalendarCheck2 className="h-6 w-6 mr-2 text-indigo-600" />
              {session?.title || "Class Attendance Roster"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Class {session?.classNumber} • Date: {session?.date ? new Date(session.date).toLocaleDateString() : ""} •{" "}
              {session?.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""} –{" "}
              {session?.endTime ? new Date(session.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={markAllPresent}
              className="text-xs space-x-1.5"
            >
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Mark All Present</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={isSaving}
              className="space-x-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              <span>Save Roster</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start space-x-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start space-x-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-emerald-50/50 border-emerald-200">
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
              Present
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-700">{presentCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-200">
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Late
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-amber-700">{lateCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-rose-50/50 border-rose-200">
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">
              Absent
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-rose-700">{absentCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Roster Marking Grid */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            Student Roster ({roster.length})
          </CardTitle>
          <span className="text-xs text-slate-400">One-tap presence recording</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Roll No</th>
                  <th className="px-4 py-3.5">Student Name</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5 text-right">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-800">
                      {stu.rollNumber}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      {stu.studentName}
                      <span className="font-mono text-[11px] text-slate-400 block font-normal">
                        {stu.studentCode}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {stu.method === "STUDENT_CHECKIN" ? (
                        <Badge variant="info">Self Check-in</Badge>
                      ) : (
                        <span className="text-slate-400">Teacher</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                        <button
                          type="button"
                          onClick={() => updateStudentStatus(stu.studentId, AttendanceStatus.PRESENT)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            stu.status === AttendanceStatus.PRESENT
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-emerald-700"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStudentStatus(stu.studentId, AttendanceStatus.LATE)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            stu.status === AttendanceStatus.LATE
                              ? "bg-amber-500 text-white shadow-xs"
                              : "text-slate-600 hover:text-amber-700"
                          }`}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStudentStatus(stu.studentId, AttendanceStatus.ABSENT)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            stu.status === AttendanceStatus.ABSENT
                              ? "bg-rose-600 text-white shadow-xs"
                              : "text-slate-600 hover:text-rose-700"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
