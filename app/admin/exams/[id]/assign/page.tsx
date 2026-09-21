"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExamData {
  id: string;
  title: string;
  class: { classNumber: number; name: string };
  subject: { name: string; code: string };
  startAt?: string;
  loginDeadline?: string;
}

interface StudentRosterItem {
  studentId: string;
  studentCode: string;
  name: string;
  rollNumber: string;
  className: string;
  isAssigned: boolean;
  assignmentStatus: string | null;
}

export default function ExamAssignPage() {
  const params = useParams();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [allowedAttempts, setAllowedAttempts] = useState(1);
  const [startAt, setStartAt] = useState("");
  const [loginDeadline, setLoginDeadline] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Submit states
  const [isAssigning, setIsAssigning] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/exams/${examId}/assign?mode=roster`);
      const data = await res.json();

      if (data.success) {
        setExam(data.exam);
        setStudents(data.students);

        // Pre-select all active students in class by default
        const allIds = new Set<string>(data.students.map((s: StudentRosterItem) => s.studentId));
        setSelectedStudentIds(allIds);

        // Set default dates from exam
        if (data.exam.startAt) {
          setStartAt(new Date(data.exam.startAt).toISOString().slice(0, 16));
        }
        if (data.exam.loginDeadline) {
          setLoginDeadline(new Date(data.exam.loginDeadline).toISOString().slice(0, 16));
        }
      }
    } catch (err) {
      console.error("Failed to load roster:", err);
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set(students.map((s) => s.studentId));
    setSelectedStudentIds(all);
  };

  const deselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (selectedStudentIds.size === 0) {
      setErrorMsg("Please select at least one student to assign this exam.");
      return;
    }

    try {
      setIsAssigning(true);
      const res = await fetch(`/api/exams/${examId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudentIds),
          allowedAttempts,
          startAt: startAt ? new Date(startAt).toISOString() : undefined,
          loginDeadline: loginDeadline ? new Date(loginDeadline).toISOString() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Assignment failed.");
        setIsAssigning(false);
        return;
      }

      setSuccessMsg(data.message);
      setIsAssigning(false);
      loadRoster();
    } catch {
      setErrorMsg("Network error during exam assignment.");
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href={`/admin/exams/${examId}`}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Exam Details
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Users className="h-6 w-6 mr-2 text-indigo-600" />
            Assign Exam to Class
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Assign exam to students with availability window and attempt limits
          </p>
        </div>

        {exam && (
          <div className="flex items-center space-x-2">
            <Badge variant="info">Class {exam.class.classNumber}</Badge>
            <Badge variant="default">{exam.subject.name}</Badge>
          </div>
        )}
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start space-x-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start space-x-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Roster Checklist */}
        <div className="lg:col-span-8 space-y-4">
          <Card>
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Enrolled Class Roster ({students.length} active students)
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Selected: {selectedStudentIds.size} / {students.length}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <p className="text-center py-10 text-xs text-slate-400">Loading student roster...</p>
              ) : students.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-sm text-slate-700">No active students in this class</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enroll students in this class to assign exams.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {students.map((stu) => {
                    const isChecked = selectedStudentIds.has(stu.studentId);
                    return (
                      <label
                        key={stu.studentId}
                        className={`flex items-center justify-between p-3.5 px-4 cursor-pointer transition hover:bg-slate-50/80 ${
                          isChecked ? "bg-indigo-50/30" : ""
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStudent(stu.studentId)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">
                              {stu.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              Roll: {stu.rollNumber} • ID: {stu.studentCode}
                            </span>
                          </div>
                        </div>

                        <div>
                          {stu.isAssigned ? (
                            <Badge variant="success">Already Assigned</Badge>
                          ) : (
                            <Badge variant="outline">Unassigned</Badge>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Scheduling & Action */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <Clock className="h-4 w-4 mr-2 text-indigo-600" />
                Scheduling & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <form onSubmit={handleAssign} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Max Allowed Attempts *
                  </label>
                  <select
                    value={allowedAttempts}
                    onChange={(e) => setAllowedAttempts(parseInt(e.target.value, 10))}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value={1}>1 Attempt (Standard)</option>
                    <option value={2}>2 Attempts</option>
                    <option value={3}>3 Attempts</option>
                    <option value={5}>5 Attempts (Practice)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Exam Available From *
                  </label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">Students cannot enter before this time.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Exam Login Window Closes *
                  </label>
                  <input
                    type="datetime-local"
                    value={loginDeadline}
                    onChange={(e) => setLoginDeadline(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Latest time to start. Students who start before this deadline receive full duration.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
                    isLoading={isAssigning}
                    disabled={isAssigning || selectedStudentIds.size === 0}
                  >
                    Assign to {selectedStudentIds.size} Student{selectedStudentIds.size === 1 ? "" : "s"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
