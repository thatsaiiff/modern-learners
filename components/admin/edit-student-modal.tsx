"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface EditStudentModalProps {
  isOpen: boolean;
  studentId: string | null;
  currentName: string;
  studentCode: string;
  rollNumber: string;
  currentPhone?: string | null;
  onClose: () => void;
  onSuccess: (updatedName: string) => void;
}

export function EditStudentModal({
  isOpen,
  studentId,
  currentName,
  studentCode,
  rollNumber,
  currentPhone,
  onClose,
  onSuccess,
}: EditStudentModalProps) {
  const [name, setName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone || "");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setName(currentName);
    setPhone(currentPhone || "");
    setError(null);
    setSuccessMsg(null);
  }, [currentName, currentPhone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setError(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Student name is required.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: phone.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update student name.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg("Student name updated successfully.");
      setIsLoading(false);
      onSuccess(trimmedName);
      setTimeout(() => {
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
      title="Edit Student Name"
      description="Update the student's full name. Permanent Student ID and roll number remain protected."
    >
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start space-x-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start space-x-2 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Read-Only Protected Metadata */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Permanent ID</span>
            <span className="font-mono font-bold text-indigo-700">{studentCode || "—"}</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Roll Number</span>
            <span className="font-mono font-bold text-slate-800">{rollNumber || "—"}</span>
          </div>
        </div>

        {/* Editable Name */}
        <Input
          label="Student Full Name *"
          placeholder="e.g. Rahul Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          required
        />

        {/* Optional Phone */}
        <Input
          label="Contact Phone (Optional)"
          placeholder="e.g. 9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isLoading}
        />

        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={isLoading || !name.trim()}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
