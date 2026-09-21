"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PrintableReportCard } from "@/components/report/printable-report-card";
import { ReportCardData } from "@/lib/services/report.service";

export default function AdminStudentReportCardPage() {
  const params = useParams();
  const studentId = params.id as string;

  const [reportData, setReportData] = useState<ReportCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Remark Modal
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [remarkText, setRemarkText] = useState("");
  const [isSavingRemark, setIsSavingRemark] = useState(false);
  const [remarkSuccess, setRemarkSuccess] = useState<string | null>(null);

  const loadReportCard = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/reports/student/${studentId}/card`);
      const data = await res.json();
      if (data.success) {
        setReportData(data.reportCard);
        setRemarkText(data.reportCard.teacherRemark?.remark || "");
      } else {
        setErrorMsg(data.error || "Failed to load report card.");
      }
    } catch {
      setErrorMsg("Network error.");
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadReportCard();
  }, [loadReportCard]);

  const handleSaveRemark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportData) return;

    try {
      setIsSavingRemark(true);
      setRemarkSuccess(null);

      const res = await fetch(`/api/reports/student/${studentId}/remark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: reportData.student.sessionName,
          remark: remarkText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to save remarks.");
        setIsSavingRemark(false);
        return;
      }

      setRemarkSuccess("Remarks updated successfully.");
      setIsSavingRemark(false);
      setTimeout(() => {
        setIsRemarkModalOpen(false);
        loadReportCard();
      }, 1000);
    } catch {
      alert("Network error.");
      setIsSavingRemark(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Generating report card...</p>
      </div>
    );
  }

  if (errorMsg || !reportData) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-4">
        <h3 className="font-bold text-base text-slate-900">Report Card Unavailable</h3>
        <p className="text-xs text-slate-500">{errorMsg}</p>
        <Link href={`/admin/students/${studentId}`}>
          <Button size="sm" variant="outline">
            Back to Student Profile
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          href={`/admin/students/${studentId}`}
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Student Profile
        </Link>
      </div>

      <PrintableReportCard
        data={reportData}
        isAdmin={true}
        onEditRemark={() => setIsRemarkModalOpen(true)}
      />

      {/* Teacher Remark Modal */}
      <Modal
        isOpen={isRemarkModalOpen}
        onClose={() => setIsRemarkModalOpen(false)}
        title="Edit Official Teacher Remarks"
        description={`Student: ${reportData.student.name} • Class: ${reportData.student.className}`}
      >
        <form onSubmit={handleSaveRemark} className="space-y-4">
          {remarkSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
              {remarkSuccess}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Teacher Qualitative Remarks & Guidance *
            </label>
            <textarea
              rows={4}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              placeholder="e.g. Demonstrates strong conceptual understanding in Physics and Chemistry numericals. Encourage regular practice in Biology diagrams..."
              className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRemarkModalOpen(false)}
              disabled={isSavingRemark}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingRemark} disabled={isSavingRemark}>
              Save Remarks
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
