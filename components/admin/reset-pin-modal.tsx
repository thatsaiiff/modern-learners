"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Sparkles } from "lucide-react";

interface ResetPinModalProps {
  isOpen: boolean;
  studentId: string | null;
  studentName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResetPinModal({
  isOpen,
  studentId,
  studentName,
  onClose,
  onSuccess,
}: ResetPinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateRandomPin = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(random);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setError(null);

    if (!/^\d{4}$/.test(pin.trim())) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/students/${studentId}/reset-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin: pin.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to reset PIN.");
        setIsLoading(false);
        return;
      }

      setPin("");
      setIsLoading(false);
      onSuccess();
      onClose();
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Student PIN"
      description={`Set a new 4-digit numeric login PIN for ${studentName || "student"}.`}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start space-x-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">New 4-Digit PIN *</label>
            <button
              type="button"
              onClick={generateRandomPin}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Generate PIN
            </button>
          </div>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="e.g. 5678"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            disabled={isLoading}
            required
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={isLoading || pin.length !== 4}>
            Save New PIN
          </Button>
        </div>
      </form>
    </Modal>
  );
}
