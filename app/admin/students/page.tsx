"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Eye,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddStudentModal } from "@/components/admin/add-student-modal";
import { ResetPinModal } from "@/components/admin/reset-pin-modal";

interface StudentItem {
  id: string;
  studentCode: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  phone: string | null;
  dateOfBirth: string | null;
  joinedAt: string;
  rollNumber: string;
  className: string;
  classNumber: number | null;
  sessionName: string;
  enrollmentId: string | null;
}

export default function StudentsManagementPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [resetPinStudent, setResetPinStudent] = useState<{ id: string; name: string } | null>(null);

  const fetchStudents = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search.trim()) params.append("search", search.trim());
      if (classFilter !== "all") params.append("classNumber", classFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/students?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setStudents(data.students);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, classFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  const toggleStudentStatus = async (student: StudentItem) => {
    const nextStatus = student.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmMsg =
      nextStatus === "INACTIVE"
        ? `Are you sure you want to deactivate ${student.name}? Deactivated students cannot login to write exams.`
        : `Reactivate ${student.name}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStudents(pagination.page);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Users className="h-6 w-6 mr-2 text-indigo-600" />
            Student Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enrolled students across Class 6–10 with permanent IDs and academic roll numbers
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/admin/students/promotion">
            <Button variant="outline" size="sm" className="space-x-1.5">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              <span>Promotion & Rollback</span>
            </Button>
          </Link>
          <Button size="sm" onClick={() => setIsAddOpen(true)} className="space-x-1.5">
            <UserPlus className="h-4 w-4" />
            <span>Add Student</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, roll number (e.g. 08-2627-001) or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Classes</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            Total Students: {pagination.total}
          </CardTitle>
          {pagination.total > 0 && (
            <span className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Student ID</th>
                  <th className="px-4 py-3.5">Student Name</th>
                  <th className="px-4 py-3.5">Roll Number</th>
                  <th className="px-4 py-3.5">Class</th>
                  <th className="px-4 py-3.5">Session</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                      Loading students list...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-slate-700">No students found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Add your first student to begin managing tuition classes.
                      </p>
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-indigo-700">
                        {student.studentCode}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {student.name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-700">
                        {student.rollNumber}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {student.className}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {student.sessionName}
                      </td>
                      <td className="px-4 py-3.5">
                        {student.status === "ACTIVE" ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1">
                        <Link href={`/admin/students/${student.id}`}>
                          <button
                            title="View Full Profile & History"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() =>
                            setResetPinStudent({ id: student.id, name: student.name })
                          }
                          title="Reset PIN"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleStudentStatus(student)}
                          title={
                            student.status === "ACTIVE"
                              ? "Deactivate Student"
                              : "Reactivate Student"
                          }
                          className={`p-1.5 rounded-lg transition ${
                            student.status === "ACTIVE"
                              ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} students
              </span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchStudents(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchStudents(pagination.page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => fetchStudents(1)}
      />

      {/* Reset PIN Modal */}
      <ResetPinModal
        isOpen={!!resetPinStudent}
        studentId={resetPinStudent?.id || null}
        studentName={resetPinStudent?.name || null}
        onClose={() => setResetPinStudent(null)}
        onSuccess={() => fetchStudents(pagination.page)}
      />
    </div>
  );
}
