"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Search,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ExamData {
  id: string;
  title: string;
  subjectName: string;
  className: string;
  classNumber: number;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  passingPercentage: number;
  startAt?: string;
  loginDeadline?: string;
  allowedAttempts: number;
  isClassLocked: boolean;
}

interface StudentRosterItem {
  studentId: string;
  studentCode: string;
  name: string;
  rollNumber: string;
  className: string;
  isAssigned: boolean;
  isEligible: boolean;
  ineligibilityReason: string | null;
  assignmentStatus: string | null;
  attemptsCount: number;
}

const REASON_PRESETS = [
  "Absent during preparation period",
  "Medical leave",
  "Joined after examination registration",
  "Not eligible for this assessment",
];

export default function ExamAssignPage() {
  const params = useParams();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [selectedClassNumber, setSelectedClassNumber] = useState<number>(8);
  const [isClassLocked, setIsClassLocked] = useState(false);
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [eligibilityMap, setEligibilityMap] = useState<
    Record<string, { isEligible: boolean; reason: string }>
  >({});

  // Scheduling state
  const [allowedAttempts, setAllowedAttempts] = useState(1);
  const [startAt, setStartAt] = useState("");
  const [loginDeadline, setLoginDeadline] = useState("");

  // Filters & Search
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "eligible" | "ineligible">("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRoster = useCallback(
    async (classNum?: number) => {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        const urlParams = new URLSearchParams({ mode: "roster" });
        if (classNum) {
          urlParams.append("classNumber", classNum.toString());
        }

        const res = await fetch(`/api/exams/${examId}/assign?${urlParams.toString()}`);
        const data = await res.json();

        if (data.success) {
          setExam(data.exam);
          setSelectedClassNumber(data.targetClassNumber);
          setIsClassLocked(data.isClassLocked);
          setStudents(data.students);
          setAllowedAttempts(data.exam.allowedAttempts || 1);

          // Populate eligibility map from existing data or default to true
          const initialMap: Record<string, { isEligible: boolean; reason: string }> = {};
          data.students.forEach((s: StudentRosterItem) => {
            initialMap[s.studentId] = {
              isEligible: s.isEligible !== false, // default true
              reason: s.ineligibilityReason || "",
            };
          });
          setEligibilityMap(initialMap);

          if (data.exam.startAt) {
            setStartAt(new Date(data.exam.startAt).toISOString().slice(0, 16));
          }
          if (data.exam.loginDeadline) {
            setLoginDeadline(new Date(data.exam.loginDeadline).toISOString().slice(0, 16));
          }
        } else {
          setErrorMsg(data.error || "Failed to load exam assignment data.");
        }
      } catch {
        setErrorMsg("Network error loading assignment roster.");
      } finally {
        setIsLoading(false);
      }
    },
    [examId]
  );

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const handleClassChange = (newClassNumber: number) => {
    if (isClassLocked) return;
    setSelectedClassNumber(newClassNumber);
    loadRoster(newClassNumber);
  };

  const toggleStudentEligibility = (studentId: string, makeEligible?: boolean) => {
    setEligibilityMap((prev) => {
      const current = prev[studentId] || { isEligible: true, reason: "" };
      const nextEligible = makeEligible !== undefined ? makeEligible : !current.isEligible;
      return {
        ...prev,
        [studentId]: {
          isEligible: nextEligible,
          reason: nextEligible ? "" : current.reason || REASON_PRESETS[0],
        },
      };
    });
  };

  const updateStudentReason = (studentId: string, reason: string) => {
    setEligibilityMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason,
      },
    }));
  };

  const selectAllEligible = () => {
    setEligibilityMap((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.studentId] = { isEligible: true, reason: "" };
      });
      return updated;
    });
  };

  const deselectAll = () => {
    setEligibilityMap((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.studentId] = {
          isEligible: false,
          reason: prev[s.studentId]?.reason || REASON_PRESETS[0],
        };
      });
      return updated;
    });
  };

  const eligibleCount = useMemo(() => {
    return Object.values(eligibilityMap).filter((e) => e.isEligible).length;
  }, [eligibilityMap]);

  const ineligibleCount = students.length - eligibleCount;

  const filteredStudents = useMemo(() => {
    return students.filter((stu) => {
      const isEligible = eligibilityMap[stu.studentId]?.isEligible ?? true;

      // Filter Tab
      if (filterTab === "eligible" && !isEligible) return false;
      if (filterTab === "ineligible" && isEligible) return false;

      // Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesName = stu.name.toLowerCase().includes(q);
        const matchesRoll = stu.rollNumber.toLowerCase().includes(q);
        const matchesCode = stu.studentCode.toLowerCase().includes(q);
        return matchesName || matchesRoll || matchesCode;
      }

      return true;
    });
  }, [students, eligibilityMap, filterTab, search]);

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate that all ineligible students have a reason
    const payloadEligibility = students.map((s) => {
      const item = eligibilityMap[s.studentId] || { isEligible: true, reason: "" };
      return {
        studentId: s.studentId,
        isEligible: item.isEligible,
        ineligibilityReason: item.isEligible ? null : item.reason.trim(),
      };
    });

    const missingReason = payloadEligibility.find(
      (item) => !item.isEligible && (!item.ineligibilityReason || !item.ineligibilityReason.trim())
    );

    if (missingReason) {
      const stu = students.find((s) => s.studentId === missingReason.studentId);
      setErrorMsg(`Please specify a reason explaining why ${stu?.name || "the student"} is not eligible.`);
      return;
    }

    try {
      setIsAssigning(true);
      const res = await fetch(`/api/exams/${examId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classNumber: selectedClassNumber,
          studentEligibility: payloadEligibility,
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
      loadRoster(selectedClassNumber);
    } catch {
      setErrorMsg("Network error during assignment save.");
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
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
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Users className="h-6 w-6 mr-2 text-indigo-600" />
            Class Exam Assignment & Student Eligibility
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Assign exam to an entire class and configure individual student eligibility with reasons
          </p>
        </div>

        {exam && (
          <div className="flex items-center space-x-2">
            <Badge variant="info">Class {selectedClassNumber}</Badge>
            <Badge variant="default">{exam.subjectName}</Badge>
            {isClassLocked && (
              <span className="inline-flex items-center text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                <Lock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Class Locked
              </span>
            )}
          </div>
        )}
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start space-x-2 text-xs text-rose-800 font-medium animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start space-x-2 text-xs text-emerald-800 font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveAssignment} className="space-y-6">
        {/* Step 1: Target Class Selection Card */}
        <Card>
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                Step 1
              </span>
              <CardTitle className="text-base font-bold text-slate-900">
                Target Academic Class
              </CardTitle>
            </div>
            {isClassLocked && (
              <span className="text-[11px] text-slate-500 flex items-center">
                <Lock className="h-3 w-3 mr-1 text-slate-400" />
                Locked because student assignments exist
              </span>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="max-w-xs space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Class *
              </label>
              <select
                value={selectedClassNumber}
                disabled={isClassLocked || isLoading}
                onChange={(e) => handleClassChange(parseInt(e.target.value, 10))}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value={6}>Class 6</option>
                <option value={7}>Class 7</option>
                <option value={8}>Class 8</option>
                <option value={9}>Class 9</option>
                <option value={10}>Class 10</option>
              </select>
            </div>

            {isClassLocked ? (
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                🔒 <strong>Target Class is locked to Class {selectedClassNumber}.</strong> Student records and exam attempt history are associated with this class. To protect academic continuity, target class cannot be changed.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Selecting a class dynamically loads all currently active students enrolled in that class.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Student Eligibility Roster Card */}
        <Card>
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Step 2
                </span>
                <CardTitle className="text-base font-bold text-slate-900">
                  Student Eligibility Roster ({students.length} Enrolled)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every enrolled student is eligible by default. Deselect students who cannot attempt this exam and provide a reason.
                </p>
              </div>

              {/* Quick Summary Pill Counters */}
              <div className="flex items-center space-x-2 text-xs font-bold shrink-0">
                <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Eligible: {eligibleCount}
                </span>
                <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                  Ineligible: {ineligibleCount}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or roll..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterTab("all")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      filterTab === "all" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    All ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("eligible")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      filterTab === "eligible" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Eligible ({eligibleCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab("ineligible")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      filterTab === "ineligible" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Ineligible ({ineligibleCount})
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs self-end sm:self-auto">
                <button
                  type="button"
                  onClick={selectAllEligible}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Select All Eligible
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <div className="h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading enrolled students...
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm text-slate-700">
                  No active students enrolled in Class {selectedClassNumber}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enroll students in this class to configure examination assignments.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No students match your filter criteria.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredStudents.map((stu) => {
                  const item = eligibilityMap[stu.studentId] || { isEligible: true, reason: "" };
                  const isEligible = item.isEligible;
                  const reason = item.reason;

                  return (
                    <div
                      key={stu.studentId}
                      className={`p-4 transition space-y-3 ${
                        isEligible ? "bg-white hover:bg-slate-50/70" : "bg-amber-50/20"
                      }`}
                    >
                      {/* Top Row: Checkbox, Name, Roll, Status */}
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start space-x-3 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isEligible}
                            onChange={() => toggleStudentEligibility(stu.studentId)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`font-bold text-sm ${
                                  isEligible ? "text-slate-900" : "text-slate-600 line-through"
                                }`}
                              >
                                {stu.name}
                              </span>
                              {stu.isAssigned && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  (Previously Assigned)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 font-mono tabular-nums">
                              Roll: <strong className="text-slate-800">{stu.rollNumber}</strong> • ID:{" "}
                              <span className="text-indigo-600 font-bold">{stu.studentCode}</span>
                            </p>
                          </div>
                        </label>

                        <div>
                          {isEligible ? (
                            <Badge variant="success">Eligible</Badge>
                          ) : (
                            <Badge variant="warning">Not Eligible</Badge>
                          )}
                        </div>
                      </div>

                      {/* Inline Ineligibility Reason Section (Revealed when unchecked) */}
                      {!isEligible && (
                        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-950 flex items-center">
                              <Info className="h-3.5 w-3.5 mr-1 text-amber-600" />
                              Reason for Ineligibility *
                            </span>
                            <span className="text-[11px] text-amber-800">
                              (Visible to student respectfully)
                            </span>
                          </div>

                          {/* Quick Preset Reason Chips */}
                          <div className="flex flex-wrap gap-1.5">
                            {REASON_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => updateStudentReason(stu.studentId, preset)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                  reason === preset
                                    ? "bg-amber-600 text-white shadow-xs font-bold"
                                    : "bg-white text-slate-700 border border-amber-300 hover:bg-amber-100"
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>

                          {/* Custom Reason Input */}
                          <input
                            type="text"
                            placeholder="Enter specific reason (e.g. Medical leave, Joined late)..."
                            value={reason}
                            onChange={(e) => updateStudentReason(stu.studentId, e.target.value)}
                            className={`h-9 w-full rounded-lg border px-3 text-xs text-slate-900 bg-white focus:outline-none ${
                              !reason.trim()
                                ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                : "border-slate-300 focus:border-indigo-600"
                            }`}
                            required
                          />
                          {!reason.trim() && (
                            <p className="text-[11px] text-rose-600 font-semibold">
                              ⚠️ Reason is required before saving assignment.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Exam Availability & Timing Card */}
        <Card>
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
              Step 3
            </span>
            <CardTitle className="text-base font-bold text-slate-900 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-indigo-600" />
              Exam Availability & Timing Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Max Allowed Attempts *
                </label>
                <select
                  value={allowedAttempts}
                  onChange={(e) => setAllowedAttempts(parseInt(e.target.value, 10))}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value={1}>1 Attempt (Standard)</option>
                  <option value={2}>2 Attempts</option>
                  <option value={3}>3 Attempts</option>
                  <option value={5}>5 Attempts (Practice)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Available From (Earliest Start) *
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Login Window Closes (Latest Start) *
                </label>
                <input
                  type="datetime-local"
                  value={loginDeadline}
                  onChange={(e) => setLoginDeadline(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-normal">
              Students who start validly before the login deadline receive the full configured duration ({exam?.durationMinutes || 60} minutes).
            </p>
          </CardContent>
        </Card>

        {/* Step 4: Summary & Save Action Bar */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-800 block">
              Assignment Summary: Class {selectedClassNumber}
            </span>
            <p className="text-xs text-slate-500">
              Total: <strong>{students.length}</strong> enrolled students (
              <span className="text-emerald-700 font-bold">{eligibleCount} eligible</span>,{" "}
              <span className="text-amber-800 font-bold">{ineligibleCount} ineligible</span>)
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link href={`/admin/exams/${examId}`}>
              <Button type="button" variant="outline" disabled={isAssigning}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 font-bold"
              isLoading={isAssigning}
              disabled={isAssigning || students.length === 0}
            >
              Confirm & Save Class Assignment
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
