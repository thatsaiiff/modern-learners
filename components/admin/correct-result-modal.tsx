"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ShieldAlert, Edit3, Ban, RotateCcw } from "lucide-react";

interface CorrectResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  resultId: string;
  studentName: string;
  examTitle: string;
  currentMarks: number;
  maximumMarks: number;
  currentStatus: "ACTIVE" | "VOIDED";
  actionType: "CORRECT" | "VOID" | "RESTORE";
  onSuccess: () => void;
}

export function CorrectResultModal({
  isOpen,
  onClose,
  resultId,
  studentName,
  examTitle,
  currentMarks,
  maximumMarks,
  currentStatus,
  actionType,
  onSuccess,
}: CorrectResultModalProps) {
  const [rawMarks, setRawMarks] = useState<number>(currentMarks);
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isCorrection = actionType === "CORRECT";
  const isVoid = actionType === "VOID";

  const modalTitle = isCorrection
    ? "Administrative Result Mark Correction"
    : isVoid
    ? "Void & Exclude Examination Result"
    : "Reactivate Examination Result";

  const modalDescription = isCorrection
    ? "Modify the student's official score. Percentage and grade will be recalculated automatically. An immutable audit record will be logged."
    : isVoid
    ? "Voiding excludes this attempt and score from all leaderboards, pass rates, and official analytics without physical deletion."
    : "Reactivate this examination result to ACTIVE status and re-include it in official academic metrics.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      setError("Please provide a justification reason (minimum 3 characters).");
      return;
    }

    if (isCorrection) {
      if (rawMarks < 0 || rawMarks > maximumMarks || isNaN(rawMarks)) {
        setError(`Score must be between 0 and ${maximumMarks}.`);
        return;
      }
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/results/${resultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          ...(isCorrection ? { rawMarks } : {}),
          reason: trimmedReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update exam result.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg(data.message || "Result updated successfully.");
      setIsLoading(false);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
    >
      {error && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start space-x-2 text-xs text-rose-800 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start space-x-2 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Context Summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Student:</span>
            <strong className="text-slate-900 font-bold">{studentName}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Exam:</span>
            <span className="text-slate-800 font-semibold">{examTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Score:</span>
            <span className="font-mono font-bold text-indigo-700">
              {currentMarks} / {maximumMarks} ({((currentMarks / maximumMarks) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Status:</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                currentStatus === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {currentStatus}
            </span>
          </div>
        </div>

        {/* Correction Marks Input */}
        {isCorrection && (
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Corrected Official Marks (Out of {maximumMarks}) *
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={maximumMarks}
              value={rawMarks}
              onChange={(e) => setRawMarks(parseFloat(e.target.value) || 0)}
              className="h-11 w-full rounded-xl border border-slate-300 px-3.5 font-mono text-sm font-bold text-slate-900 focus:border-indigo-600 focus:outline-none"
              required
              disabled={isLoading}
            />
            <p className="text-[11px] text-slate-500">
              New percentage will be:{" "}
              <strong>{((rawMarks / Math.max(1, maximumMarks)) * 100).toFixed(2)}%</strong>
            </p>
          </div>
        )}

        {/* Void Warning */}
        {isVoid && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
            <div className="font-bold flex items-center">
              <ShieldAlert className="h-4 w-4 mr-1 text-rose-600" />
              Confirmation Notice
            </div>
            <p className="text-[11px] text-rose-800">
              Voiding will exclude this attempt from pass rates, leaderboards, and report cards. The attempt and historical answers remain completely auditable.
            </p>
          </div>
        )}

        {/* Mandatory Reason */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Mandatory Justification Reason *
          </label>
          <textarea
            rows={3}
            placeholder={
              isCorrection
                ? "e.g. Administrative correction of unrecorded student answers due to initial system bug"
                : isVoid
                ? "e.g. Exam invalidated due to approved re-sit or administrative review"
                : "e.g. Reactivating verified attempt"
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
            required
            disabled={isLoading}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading || !reason.trim()}
            className={
              isVoid
                ? "bg-rose-600 hover:bg-rose-700 font-bold"
                : "bg-indigo-600 hover:bg-indigo-700 font-bold"
            }
          >
            {isCorrection ? (
              <>
                <Edit3 className="h-4 w-4 mr-1.5" />
                Apply Correction
              </>
            ) : isVoid ? (
              <>
                <Ban className="h-4 w-4 mr-1.5" />
                Void Result
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Restore Result
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
