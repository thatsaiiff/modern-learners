"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Calendar,
  History,
  Award,
  Phone,
  CheckCircle2,
  Pencil,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditStudentModal } from "@/components/admin/edit-student-modal";

interface EnrollmentDetail {
  id: string;
  rollNumber: string;
  status: string;
  createdAt: string;
  class: { name: string; classNumber: number };
  academicSession: { name: string };
}

interface MovementDetail {
  id: string;
  movementType: string;
  reason: string | null;
  createdAt: string;
}

interface ResultDetail {
  id: string;
}

interface StudentDetailData {
  id: string;
  studentCode: string;
  name: string;
  status: string;
  phone: string | null;
  dateOfBirth: string | null;
  joinedAt: string;
  activeEnrollment?: {
    id: string;
    rollNumber: string;
    class?: { name: string };
  };
  enrollments: EnrollmentDetail[];
  academicMovements: MovementDetail[];
  results: ResultDetail[];
}

export default function StudentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [student, setStudent] = useState<StudentDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const loadStudent = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/students/${id}`);
      const data = await res.json();
      if (data.success) {
        setStudent(data.student);
      } else {
        setErrorMsg(data.error || "Student not found.");
      }
    } catch {
      setErrorMsg("Network error loading student details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading student profile...</p>
      </div>
    );
  }

  if (errorMsg || !student) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-4">
        <h3 className="font-bold text-base text-slate-900">Student Not Found</h3>
        <p className="text-xs text-slate-500">{errorMsg}</p>
        <Link href="/admin/students">
          <Button size="sm" variant="outline">
            Back to Students
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/students"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Students
        </Link>
      </div>

      {/* Main Student Header Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {student.name}
              </h2>
              {student.status === "ACTIVE" ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="danger">Inactive</Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>
                Permanent ID: <strong className="font-mono text-indigo-600">{student.studentCode}</strong>
              </span>
              <span>•</span>
              <span>
                Current Roll: <strong className="font-mono text-slate-700">{student.activeEnrollment?.rollNumber || "N/A"}</strong>
              </span>
              <span>•</span>
              <span>
                Class: <strong className="text-slate-700">{student.activeEnrollment?.class?.name || "Unassigned"}</strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {student.phone && (
            <div className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Phone className="h-3.5 w-3.5 mr-1 text-slate-400" />
              {student.phone}
            </div>
          )}
          <Link href={`/admin/students/${student.id}/report-card`}>
            <Button size="sm" variant="outline" className="space-x-1 text-xs">
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              <span>Report Card</span>
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="space-x-1.5 bg-indigo-600 hover:bg-indigo-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit Student</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Academic Enrollments & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrollment History Card */}
          <Card>
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-indigo-600" />
                Academic Session History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {student.enrollments.map((enr, idx) => (
                <div
                  key={enr.id}
                  className="flex items-start space-x-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50"
                >
                  <div className="mt-0.5">
                    {enr.status === "ACTIVE" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        {enr.class.name} — Session {enr.academicSession.name}
                      </h4>
                      <Badge
                        variant={
                          enr.status === "ACTIVE"
                            ? "success"
                            : enr.status === "PROMOTED"
                            ? "info"
                            : "default"
                        }
                      >
                        {enr.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Academic Roll: <span className="font-mono font-medium text-slate-700">{enr.rollNumber}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Enrolled on {new Date(enr.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Academic Movements Card */}
          <Card>
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <History className="h-4 w-4 mr-2 text-indigo-600" />
                Promotion & Rollback Movement Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {student.academicMovements.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No promotion or rollback movements recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {student.academicMovements.map((move) => (
                    <div
                      key={move.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-white text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            move.movementType === "PROMOTION"
                              ? "info"
                              : move.movementType === "ROLLBACK"
                              ? "warning"
                              : "default"
                          }
                        >
                          {move.movementType}
                        </Badge>
                        <span className="text-slate-400">
                          {new Date(move.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {move.reason && (
                        <p className="text-slate-700 font-medium pt-1">
                          Reason: {move.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Statistics & Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <Award className="h-4 w-4 mr-2 text-amber-500" />
                Examination Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Official Tests</span>
                <span className="font-bold text-slate-900">{student.results.length}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Joined Tuition</span>
                <span className="font-medium text-slate-700">
                  {new Date(student.joinedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Account Status</span>
                <span className="font-bold text-slate-900">{student.status}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Student Modal */}
      <EditStudentModal
        isOpen={isEditOpen}
        studentId={student.id}
        currentName={student.name}
        studentCode={student.studentCode}
        rollNumber={student.activeEnrollment?.rollNumber || ""}
        currentPhone={student.phone}
        onClose={() => setIsEditOpen(false)}
        onSuccess={(updatedName) => {
          setStudent((prev) => (prev ? { ...prev, name: updatedName } : null));
        }}
      />
    </div>
  );
}
