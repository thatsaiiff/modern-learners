"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Users,
  AlertCircle,
  Search,
  Info,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaperMeta {
  id: string;
  paperCode: string;
  title: string;
  totalQuestions: number;
  totalMarks: number;
  durationMinutes?: number;
  class: { classNumber: number; name: string };
  subject: { name: string; code: string };
}

interface StudentItem {
  id: string;
  studentCode: string;
  name: string;
  rollNumber: string;
  className: string;
}

const REASON_PRESETS = [
  "Absent during preparation period",
  "Medical leave",
  "Joined after examination registration",
  "Not eligible for this assessment",
];

export default function CreateExamFromPaperPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.id as string;

  const [paper, setPaper] = useState<PaperMeta | null>(null);
  const [examTitle, setExamTitle] = useState("");
  const [classNumber, setClassNumber] = useState<number>(8);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingPercentage, setPassingPercentage] = useState(80);
  const [allowedAttempts, setAllowedAttempts] = useState(1);
  const [startAt, setStartAt] = useState("");
  const [loginDeadline, setLoginDeadline] = useState("");
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0.25);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);

  // Student Roster state
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [eligibilityMap, setEligibilityMap] = useState<
    Record<string, { isEligible: boolean; reason: string }>
  >({});
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPaperAndRoster = useCallback(
    async (targetClassNum?: number) => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/papers/${paperId}`);
        const data = await res.json();

        if (data.success) {
          const p = data.paper;
          setPaper(p);
          const currentClass = targetClassNum || p.class.classNumber;
          setClassNumber(currentClass);
          setExamTitle(`${p.title} Assessment`);
          setDurationMinutes(p.durationMinutes || 60);

          const now = new Date();
          const startStr = now.toISOString().slice(0, 16);
          const deadlineStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
          setStartAt(startStr);
          setLoginDeadline(deadlineStr);

          // Fetch enrolled students for this class
          const stuRes = await fetch(`/api/students?classNumber=${currentClass}&status=ACTIVE&limit=100`);
          const stuData = await stuRes.json();

          if (stuData.success) {
            setStudents(stuData.students);
            const initMap: Record<string, { isEligible: boolean; reason: string }> = {};
            stuData.students.forEach((s: StudentItem) => {
              initMap[s.id] = { isEligible: true, reason: "" }; // default all eligible
            });
            setEligibilityMap(initMap);
          }
        }
      } catch {
        setErrorMsg("Failed to load question paper data.");
      } finally {
        setIsLoading(false);
      }
    },
    [paperId]
  );

  useEffect(() => {
    loadPaperAndRoster();
  }, [loadPaperAndRoster]);

  const handleClassChange = (newClass: number) => {
    setClassNumber(newClass);
    loadPaperAndRoster(newClass);
  };

  const toggleStudent = (studentId: string) => {
    setEligibilityMap((prev) => {
      const current = prev[studentId] || { isEligible: true, reason: "" };
      const nextEligible = !current.isEligible;
      return {
        ...prev,
        [studentId]: {
          isEligible: nextEligible,
          reason: nextEligible ? "" : current.reason || REASON_PRESETS[0],
        },
      };
    });
  };

  const updateReason = (studentId: string, reason: string) => {
    setEligibilityMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason,
      },
    }));
  };

  const selectAll = () => {
    setEligibilityMap((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.id] = { isEligible: true, reason: "" };
      });
      return updated;
    });
  };

  const deselectAll = () => {
    setEligibilityMap((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.id] = { isEligible: false, reason: prev[s.id]?.reason || REASON_PRESETS[0] };
      });
      return updated;
    });
  };

  const eligibleCount = useMemo(() => {
    return Object.values(eligibilityMap).filter((e) => e.isEligible).length;
  }, [eligibilityMap]);

  const ineligibleCount = students.length - eligibleCount;

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.trim().toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    );
  }, [students, search]);

  const handleCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const payloadEligibility = students.map((s) => {
      const item = eligibilityMap[s.id] || { isEligible: true, reason: "" };
      return {
        studentId: s.id,
        isEligible: item.isEligible,
        ineligibilityReason: item.isEligible ? null : item.reason.trim(),
      };
    });

    // Verify reasons for ineligible students
    const missingReason = payloadEligibility.find(
      (item) => !item.isEligible && (!item.ineligibilityReason || !item.ineligibilityReason.trim())
    );

    if (missingReason) {
      const stu = students.find((s) => s.id === missingReason.studentId);
      setErrorMsg(`Please provide a reason explaining why ${stu?.name || "the student"} is not eligible.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/papers/${paperId}/create-exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: examTitle.trim(),
          classNumber,
          durationMinutes,
          passingPercentage,
          allowedAttempts,
          startAt: startAt ? new Date(startAt).toISOString() : undefined,
          loginDeadline: loginDeadline ? new Date(loginDeadline).toISOString() : undefined,
          negativeMarkingEnabled: negativeMarking,
          negativeMarkValue: negativeMarking ? negativeMarkValue : 0,
          randomizeQuestions,
          randomizeOptions,
          studentEligibility: payloadEligibility,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to create and assign exam.");
        setIsSubmitting(false);
        return;
      }

      router.push(`/admin/exams/${data.exam.id}`);
    } catch {
      setErrorMsg("Network error.");
      setIsSubmitting(false);
    }
  };

  if (isLoading || !paper) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Preparing exam creation console...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div>
        <Link
          href={`/admin/papers/${paperId}`}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Question Paper {paper.paperCode}
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center">
            <Plus className="h-6 w-6 mr-2 text-indigo-600" />
            Create & Assign Exam from Question Paper
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Source Paper: <strong className="text-indigo-700">{paper.paperCode}</strong> ({paper.title}) • {paper.totalQuestions} Questions • {paper.totalMarks} Marks
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start space-x-2 text-xs text-rose-800 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleCreateAndAssign} className="space-y-6">
        {/* Step 1: Exam Configuration */}
        <Card>
          <CardHeader className="p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold flex items-center">
              <FileText className="h-4 w-4 mr-2 text-indigo-600" />
              1. Examination Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Exam Display Title *
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Class *
                </label>
                <select
                  value={classNumber}
                  onChange={(e) => handleClassChange(parseInt(e.target.value, 10))}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value={6}>Class 6</option>
                  <option value={7}>Class 7</option>
                  <option value={8}>Class 8</option>
                  <option value={9}>Class 9</option>
                  <option value={10}>Class 10</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Duration (Minutes) *
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 font-mono text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Passing Percentage (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(parseFloat(e.target.value) || 80)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 font-mono text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Allowed Attempts *
                </label>
                <select
                  value={allowedAttempts}
                  onChange={(e) => setAllowedAttempts(parseInt(e.target.value, 10))}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                >
                  <option value={1}>1 Attempt (Standard)</option>
                  <option value={2}>2 Attempts</option>
                  <option value={3}>3 Attempts</option>
                  <option value={5}>5 Attempts (Practice)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Available From (Start Time) *
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Login Window Closes *
                </label>
                <input
                  type="datetime-local"
                  value={loginDeadline}
                  onChange={(e) => setLoginDeadline(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Advanced Options */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2 p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={negativeMarking}
                    onChange={(e) => setNegativeMarking(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="font-semibold text-slate-800">Negative Marking</span>
                </label>
                {negativeMarking && (
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={negativeMarkValue}
                    onChange={(e) => setNegativeMarkValue(parseFloat(e.target.value) || 0)}
                    className="h-7 w-16 px-1.5 font-mono text-xs rounded border border-slate-300 bg-white"
                  />
                )}
              </div>

              <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={randomizeQuestions}
                  onChange={(e) => setRandomizeQuestions(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span className="font-semibold text-slate-800">Randomize Questions</span>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={randomizeOptions}
                  onChange={(e) => setRandomizeOptions(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <span className="font-semibold text-slate-800">Randomize Options</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Student Eligibility Roster */}
        <Card>
          <CardHeader className="p-5 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center">
                  <Users className="h-4 w-4 mr-2 text-indigo-600" />
                  2. Class {classNumber} Student Eligibility Roster ({students.length} Enrolled)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  All students are eligible by default. Uncheck any student who should not attempt this exam and provide a reason.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs font-bold shrink-0">
                <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Eligible: {eligibleCount}
                </span>
                <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                  Ineligible: {ineligibleCount}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2 border-t border-slate-100">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex space-x-2 text-xs self-end sm:self-auto">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Select All
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
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No active students found in Class {classNumber}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {filteredStudents.map((stu) => {
                  const item = eligibilityMap[stu.id] || { isEligible: true, reason: "" };
                  const isEligible = item.isEligible;
                  const reason = item.reason;

                  return (
                    <div
                      key={stu.id}
                      className={`p-4 transition space-y-3 ${
                        isEligible ? "bg-white hover:bg-slate-50/70" : "bg-amber-50/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start space-x-3 cursor-pointer min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isEligible}
                            onChange={() => toggleStudent(stu.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-1"
                          />
                          <div className="min-w-0 flex-1">
                            <span
                              className={`font-bold text-sm ${
                                isEligible ? "text-slate-900" : "text-slate-500 line-through"
                              }`}
                            >
                              {stu.name}
                            </span>
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

                      {!isEligible && (
                        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-2 animate-in fade-in">
                          <span className="font-bold text-amber-950 flex items-center">
                            <Info className="h-3.5 w-3.5 mr-1 text-amber-600" />
                            Reason for Ineligibility *
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {REASON_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => updateReason(stu.id, preset)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                  reason === preset
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "bg-white text-slate-700 border border-amber-300 hover:bg-amber-100"
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            placeholder="Enter specific reason..."
                            value={reason}
                            onChange={(e) => updateReason(stu.id, e.target.value)}
                            className={`h-9 w-full rounded-lg border px-3 text-xs text-slate-900 bg-white focus:outline-none ${
                              !reason.trim()
                                ? "border-rose-400 focus:border-rose-500"
                                : "border-slate-300 focus:border-indigo-600"
                            }`}
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Action Bar */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-sm font-bold text-slate-900 block">
              Ready to Create Exam Instance
            </span>
            <p className="text-xs text-slate-500">
              Class {classNumber} • {students.length} Enrolled ({eligibleCount} eligible, {ineligibleCount} ineligible)
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link href={`/admin/papers/${paperId}`}>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md shadow-indigo-600/20"
              isLoading={isSubmitting}
              disabled={isSubmitting || students.length === 0}
            >
              Create & Assign Exam to Class
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
