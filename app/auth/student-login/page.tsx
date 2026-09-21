"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowLeft, KeyRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function StudentLoginPage() {
  const router = useRouter();
  const [rollNumber, setRollNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedRoll = rollNumber.trim();
    const trimmedPin = pin.trim();

    if (!trimmedRoll) {
      setError("Please enter your academic roll number.");
      return;
    }

    if (!/^\d{4}$/.test(trimmedPin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rollNumber: trimmedRoll, pin: trimmedPin }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Login failed. Please check your roll number and PIN.");
        setIsLoading(false);
        return;
      }

      router.push("/student");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto pt-6 sm:pt-12">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100 mx-auto mb-3">
              <GraduationCap className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Student Portal</h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter your Roll Number and 4-digit PIN to access exams
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-rose-50 border border-rose-200 p-3.5 flex items-start space-x-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Roll Number"
              placeholder="e.g. 08-2627-001"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              required
            />

            <div>
              <Input
                label="4-Digit PIN"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPin(val);
                }}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1 flex items-center">
                <KeyRound className="h-3 w-3 mr-1 inline" />
                Contact Saif Sir if you forgot your 4-digit PIN
              </p>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              isLoading={isLoading}
              disabled={isLoading || !rollNumber || pin.length !== 4}
            >
              {isLoading ? "Verifying..." : "Login to Student Portal"}
            </Button>
          </form>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 py-4">
        Modern Learners — Saif Classes
      </div>
    </div>
  );
}
