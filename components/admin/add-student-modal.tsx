"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Sparkles } from "lucide-react";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [name, setName] = useState("");
  const [classNumber, setClassNumber] = useState<number>(8);
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateRandomPin = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(random);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Student name is required.");
      return;
    }

    if (!/^\d{4}$/.test(pin.trim())) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          classNumber,
          pin: pin.trim(),
          phone: phone.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create student.");
        setIsLoading(false);
        return;
      }

      setName("");
      setPin("");
      setPhone("");
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
      title="Add New Student"
      description="Create permanent student record and generate academic roll number."
    >
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start space-x-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Student Full Name *"
          placeholder="e.g. Rahul Sharma"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          required
        />

        <div className="w-full space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Class *</label>
          <select
            value={classNumber}
            onChange={(e) => setClassNumber(parseInt(e.target.value, 10))}
            disabled={isLoading}
            className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value={6}>Class 6</option>
            <option value={7}>Class 7</option>
            <option value={8}>Class 8</option>
            <option value={9}>Class 9</option>
            <option value={10}>Class 10</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">
              4-Digit PIN (Student Login) *
            </label>
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
            placeholder="e.g. 1234"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            disabled={isLoading}
            required
          />
        </div>

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
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            Create Student & Enroll
          </Button>
        </div>
      </form>
    </Modal>
  );
}
