"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  AlertCircle,
  History,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SessionItem {
  id: string;
  name: string;
  isActive: boolean;
}

interface RollbackHistoryItem {
  id: string;
  student: {
    id: string;
    studentCode: string;
    name: string;
  };
  fromEnrollment: {
    class: { name: string };
    academicSession: { name: string };
    rollNumber: string;
  } | null;
  toEnrollment: {
    class: { name: string };
    academicSession: { name: string };
    rollNumber: string;
  };
  reason: string | null;
  createdAt: string;
}

export default function AcademicPromotionPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [rollbackHistory, setRollbackHistory] = useState<RollbackHistoryItem[]>([]);
  const [rollbackCount, setRollbackCount] = useState<number>(0);

  // Promotion Form state
  const [fromClassNumber, setFromClassNumber] = useState<number>(8);
  const [fromSessionId, setFromSessionId] = useState<string>("");
  const [toSessionId, setToSessionId] = useState<string>("");
  const [promotionReason, setPromotionReason] = useState<string>("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionSuccess, setPromotionSuccess] = useState<string | null>(null);
  const [promotionError, setPromotionError] = useState<string | null>(null);

  // Rollback Action state
  const [enrollmentIdToRollback, setEnrollmentIdToRollback] = useState("");
  const [rollbackReason, setRollbackReason] = useState("");
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sessRes, rollRes] = await Promise.all([
        fetch("/api/academic/sessions"),
        fetch("/api/students/rollback"),
      ]);

      const sessData = await sessRes.json();
      const rollData = await rollRes.json();

      if (sessData.success) {
        setSessions(sessData.sessions);
        const active = sessData.sessions.find((s: SessionItem) => s.isActive);
        if (active) {
          setFromSessionId(active.id);
          setToSessionId(active.id);
        }
      }

      if (rollData.success) {
        setRollbackHistory(rollData.history);
        setRollbackCount(rollData.rollbackCount);
      }
    } catch (err) {
      console.error("Failed to load promotion data:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromotionError(null);
    setPromotionSuccess(null);

    if (!fromSessionId || !toSessionId) {
      setPromotionError("Please select both source and target academic sessions.");
      return;
    }

    const confirmMsg =
      fromClassNumber === 10
        ? "Class 10 students will graduate and leave the active academic progression. Continue?"
        : `Promote all active Class ${fromClassNumber} students to Class ${fromClassNumber + 1}?`;

    if (!confirm(confirmMsg)) return;

    try {
      setIsPromoting(true);
      const res = await fetch("/api/students/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromClassNumber,
          fromSessionId,
          toSessionId,
          reason: promotionReason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPromotionError(data.error || "Promotion failed.");
        setIsPromoting(false);
        return;
      }

      setPromotionSuccess(data.message);
      setPromotionReason("");
      setIsPromoting(false);
      loadData();
    } catch {
      setPromotionError("Network error. Please try again.");
      setIsPromoting(false);
    }
  };

  const handleRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    setRollbackError(null);
    setRollbackSuccessMsg(null);

    if (!enrollmentIdToRollback.trim()) {
      setRollbackError("Please provide an active Enrollment ID to rollback.");
      return;
    }

    if (!rollbackReason.trim()) {
      setRollbackError("A reason is required for rollback.");
      return;
    }

    try {
      setIsRollingBack(true);
      const res = await fetch("/api/students/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: enrollmentIdToRollback.trim(),
          reason: rollbackReason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setRollbackError(data.error || "Rollback failed.");
        setIsRollingBack(false);
        return;
      }

      setRollbackSuccessMsg(data.message);
      setEnrollmentIdToRollback("");
      setRollbackReason("");
      setIsRollingBack(false);
      loadData();
    } catch {
      setRollbackError("Network error during rollback.");
      setIsRollingBack(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Students
        </Link>
      </div>

      {/* Header & KPI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <GraduationCap className="h-6 w-6 mr-2 text-indigo-600" />
            Academic Promotion & Rollback Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Automated progression across sessions preserving full academic and result history
          </p>
        </div>

        {/* KPI Banner Required by PRD */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center space-x-3">
          <RotateCcw className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
              Students Rolled Back
            </p>
            <p className="text-lg font-extrabold text-amber-900 leading-tight">
              {rollbackCount} student{rollbackCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch Class Promotion Card */}
        <Card>
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold flex items-center">
              <Sparkles className="h-4 w-4 mr-2 text-indigo-600" />
              Batch Class Promotion
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {promotionError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start space-x-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{promotionError}</span>
              </div>
            )}

            {promotionSuccess && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start space-x-2 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{promotionSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePromote} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">From Class *</label>
                <select
                  value={fromClassNumber}
                  onChange={(e) => setFromClassNumber(parseInt(e.target.value, 10))}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value={6}>Class 6 → Promotes to Class 7</option>
                  <option value={7}>Class 7 → Promotes to Class 8</option>
                  <option value={8}>Class 8 → Promotes to Class 9</option>
                  <option value={9}>Class 9 → Promotes to Class 10</option>
                  <option value={10}>Class 10 → Graduates (Leaves active tuition)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">From Session *</label>
                  <select
                    value={fromSessionId}
                    onChange={(e) => setFromSessionId(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.isActive ? "(Active)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Target Session *</label>
                  <select
                    value={toSessionId}
                    onChange={(e) => setToSessionId(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Remarks / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Academic Year 2026-27 Promotion"
                  value={promotionReason}
                  onChange={(e) => setPromotionReason(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isPromoting}
                disabled={isPromoting || !fromSessionId || !toSessionId}
              >
                Execute Academic Promotion
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Promotion Rollback Form */}
        <Card>
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold flex items-center">
              <RotateCcw className="h-4 w-4 mr-2 text-amber-600" />
              Manual Rollback / De-promotion
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {rollbackError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start space-x-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{rollbackError}</span>
              </div>
            )}

            {rollbackSuccessMsg && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start space-x-2 text-xs text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{rollbackSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleRollback} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Target Enrollment ID to Roll Back *
                </label>
                <input
                  type="text"
                  placeholder="Enrollment ID from student profile..."
                  value={enrollmentIdToRollback}
                  onChange={(e) => setEnrollmentIdToRollback(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Reason for Rollback *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Parental request, repeating Class 8 curriculum"
                  value={rollbackReason}
                  onChange={(e) => setRollbackReason(e.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="danger"
                className="w-full bg-amber-600 hover:bg-amber-700"
                isLoading={isRollingBack}
                disabled={isRollingBack || !enrollmentIdToRollback || !rollbackReason}
              >
                Rollback Student Promotion
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Rollback Audit History Table */}
      <Card>
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center">
            <History className="h-4 w-4 mr-2 text-indigo-600" />
            Rollback & Movement Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Rolled Back From</th>
                  <th className="px-4 py-3.5">Restored Class</th>
                  <th className="px-4 py-3.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rollbackHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                      No rollback history recorded for this academic session.
                    </td>
                  </tr>
                ) : (
                  rollbackHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{item.student.name}</span>
                        <span className="font-mono text-[11px] text-indigo-600">
                          {item.student.studentCode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {item.fromEnrollment ? (
                          <>
                            {item.fromEnrollment.class.name} ({item.fromEnrollment.rollNumber})
                          </>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-emerald-700">
                        {item.toEnrollment.class.name} ({item.toEnrollment.rollNumber})
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 italic">
                        {item.reason || "—"}
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
