"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RotateCcw,
  ArrowLeft,
  Check,
  X,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface RetakeItem {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt: string | null;
  reviewComment: string | null;
  student: {
    id: string;
    name: string;
    studentCode: string;
    enrollments: Array<{ rollNumber: string; class: { name: string } }>;
  };
  exam: {
    id: string;
    title: string;
    subject: { name: string };
    class: { name: string };
  };
  reviewer: { name: string } | null;
}

export default function AdminRetakesPage() {
  const [requests, setRequests] = useState<RetakeItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Review Modal state
  const [selectedRequest, setSelectedRequest] = useState<RetakeItem | null>(null);
  const [isApproveMode, setIsApproveMode] = useState(true);
  const [reviewComment, setReviewComment] = useState("");
  const [additionalAttempts, setAdditionalAttempts] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/admin/retakes?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch (err) {
      console.error("Failed to load retakes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openReviewModal = (req: RetakeItem, approve: boolean) => {
    setSelectedRequest(req);
    setIsApproveMode(approve);
    setReviewComment("");
    setAdditionalAttempts(1);
    setErrorMsg(null);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setErrorMsg(null);

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/admin/retakes/${selectedRequest.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: isApproveMode,
          reviewComment: reviewComment.trim() || undefined,
          additionalAttempts: isApproveMode ? additionalAttempts : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Review submission failed.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch {
      setErrorMsg("Network error during review.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/results"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Results
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
              <RotateCcw className="h-6 w-6 mr-2 text-indigo-600" />
              Retake Requests Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review and grant additional examination attempts to students
            </p>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Requests</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total Requests: <strong>{requests.length}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-800">Retake Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Roll No</th>
                  <th className="px-4 py-3.5">Exam</th>
                  <th className="px-4 py-3.5">Reason</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                      Loading retake requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-slate-700">No retake requests found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        When students request an exam re-attempt, it will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{req.student.name}</span>
                        <span className="font-mono text-[11px] text-indigo-600">
                          {req.student.studentCode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-700">
                        {req.student.enrollments[0]?.rollNumber || "N/A"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-slate-900 block">{req.exam.title}</span>
                        <span className="text-[11px] text-slate-400">
                          {req.exam.class.name} • {req.exam.subject.name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700 max-w-xs truncate">
                        {req.reason}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(req.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            req.status === "APPROVED"
                              ? "success"
                              : req.status === "REJECTED"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {req.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1">
                        {req.status === "PENDING" ? (
                          <>
                            <button
                              onClick={() => openReviewModal(req, true)}
                              title="Approve Retake"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openReviewModal(req, false)}
                              title="Reject Retake"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={isApproveMode ? "Approve Retake Request" : "Reject Retake Request"}
        description={`Student: ${selectedRequest?.student.name} • Exam: ${selectedRequest?.exam.title}`}
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
            <span className="text-slate-500 font-semibold">Student&apos;s Request Reason:</span>
            <p className="text-slate-800 font-medium">{selectedRequest?.reason}</p>
          </div>

          {isApproveMode && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Grant Additional Attempt(s) *
              </label>
              <select
                value={additionalAttempts}
                onChange={(e) => setAdditionalAttempts(parseInt(e.target.value, 10))}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                <option value={1}>+1 Attempt</option>
                <option value={2}>+2 Attempts</option>
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Teacher Remark / Comment (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Approved for revision attempt..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedRequest(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={
                isApproveMode
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {isApproveMode ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
