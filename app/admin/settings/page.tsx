"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  Award,
  BookOpen,
  Sliders,
  CheckCircle2,
  Save,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SystemConfig } from "@/lib/services/settings.service";
import { MultiAttemptRule } from "@prisma/client";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "grading" | "examRules" | "privacy">("general");
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data.success) {
          setConfig(data.settings);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSaveSuccess(null);

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to update settings.");
        setIsSaving(false);
        return;
      }

      setSaveSuccess(data.message);
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch {
      setErrorMsg("Network error.");
      setIsSaving(false);
    }
  };

  if (isLoading || !config) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Settings className="h-6 w-6 mr-2 text-indigo-600" />
            System & Academic Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized database-backed configuration for branding, grading, exam rules, and privacy
          </p>
        </div>

        <Button
          onClick={handleSave}
          isLoading={isSaving}
          disabled={isSaving}
          className="space-x-1.5 bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="h-4 w-4" />
          <span>Save Configuration</span>
        </Button>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start space-x-2 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start space-x-2 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-200/70 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === "general"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Academy & System</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("grading")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === "grading"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Grading & Passing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("examRules")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === "examRules"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Exam Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("privacy")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === "privacy"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Privacy & Display</span>
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: General & Academy Branding */}
        {activeTab === "general" && (
          <Card>
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <ShieldCheck className="h-4 w-4 mr-2 text-indigo-600" />
                Academy & Institution Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Official Academy Name</label>
                <input
                  type="text"
                  value={config.system.academyName}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      system: { ...config.system, academyName: e.target.value },
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Brand Subtitle / Tagline</label>
                <input
                  type="text"
                  value={config.system.brandSubtitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      system: { ...config.system, brandSubtitle: e.target.value },
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Contact Email</label>
                  <input
                    type="email"
                    value={config.system.contactEmail}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        system: { ...config.system, contactEmail: e.target.value },
                      })
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Contact Phone</label>
                  <input
                    type="text"
                    value={config.system.contactPhone}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        system: { ...config.system, contactPhone: e.target.value },
                      })
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 2: Grading & Passing Thresholds */}
        {activeTab === "grading" && (
          <Card>
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <Award className="h-4 w-4 mr-2 text-indigo-600" />
                Grading Tiers & Passing Percentage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5 max-w-xs">
                <label className="block text-xs font-semibold text-slate-700">
                  Default Passing Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.grading.defaultPassingPercentage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      grading: {
                        ...config.grading,
                        defaultPassingPercentage: parseFloat(e.target.value) || 80,
                      },
                    })
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 px-3.5 font-mono text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-slate-400">Standard Modern Learners threshold is 80%</p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Standard Grade Ranges Mapping
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {config.grading.defaultGradingTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs space-y-1"
                    >
                      <p className="font-mono font-bold text-slate-900">
                        {tier.min}% – {tier.max}%
                      </p>
                      <p className="font-semibold text-indigo-700">{tier.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Exam Rules */}
        {activeTab === "examRules" && (
          <Card>
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
                Examination Default Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Default Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={config.examRules.defaultDurationMinutes}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        examRules: {
                          ...config.examRules,
                          defaultDurationMinutes: parseInt(e.target.value, 10) || 60,
                        },
                      })
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 px-3.5 font-mono text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Official Attempt Selection Rule
                  </label>
                  <select
                    value={config.examRules.defaultMultiAttemptRule}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        examRules: {
                          ...config.examRules,
                          defaultMultiAttemptRule: e.target.value as MultiAttemptRule,
                        },
                      })
                    }
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="BEST">Best Score (Highest %)</option>
                    <option value="LATEST">Latest Attempt</option>
                    <option value="FIRST">First Attempt</option>
                    <option value="TEACHER_SELECTED">Teacher Selected</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Privacy & Display Controls */}
        {activeTab === "privacy" && (
          <Card>
            <CardHeader className="p-5 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center">
                <Sliders className="h-4 w-4 mr-2 text-indigo-600" />
                Public Leaderboard & Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Enable Public Leaderboards</span>
                  <span className="text-[11px] text-slate-500">Allow students to view class rankings</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.privacy.leaderboardEnabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      privacy: { ...config.privacy, leaderboardEnabled: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Display Student Names</span>
                  <span className="text-[11px] text-slate-500">Show names instead of masked anonymous IDs</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.privacy.showName}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      privacy: { ...config.privacy, showName: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Display Roll Numbers</span>
                  <span className="text-[11px] text-slate-500">Show academic roll numbers</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.privacy.showRollNumber}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      privacy: { ...config.privacy, showRollNumber: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">Display Total Marks</span>
                  <span className="text-[11px] text-slate-500">Show accumulated score values</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.privacy.showMarks}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      privacy: { ...config.privacy, showMarks: e.target.checked },
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}
