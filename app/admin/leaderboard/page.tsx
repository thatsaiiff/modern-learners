"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  SlidersHorizontal,
  Award,
  TrendingUp,
  Percent,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { LeaderboardType, LeaderboardPrivacySettings } from "@/lib/services/leaderboard.service";

interface LeaderboardItem {
  rank: number;
  studentId: string;
  studentCode: string;
  name: string;
  rollNumber: string;
  className: string;
  classNumber: number;
  eligibleTestsCount: number;
  passRate: number | null;
  totalMarks: number;
  averagePercentage: number | null;
  primaryValue: number;
}

export default function AdminLeaderboardPage() {
  const [type, setType] = useState<LeaderboardType>("AVERAGE_PERCENTAGE");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [entries, setEntries] = useState<LeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Privacy Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<LeaderboardPrivacySettings>({
    enabled: true,
    showName: true,
    showRollNumber: true,
    showMarks: true,
    showPassRate: true,
    showClass: true,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ type });
      if (classFilter !== "all") params.append("classNumber", classFilter);
      if (subjectFilter !== "all") params.append("subjectCode", subjectFilter);

      const res = await fetch(`/api/leaderboards?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data) {
        setEntries(data.data.entries || []);
        if (data.data.privacySettings) {
          setSettings(data.data.privacySettings);
        }
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, [type, classFilter, subjectFilter]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSettings(true);
      const res = await fetch("/api/leaderboards/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSavedMsg(true);
        setTimeout(() => {
          setSettingsSavedMsg(false);
          setIsSettingsOpen(false);
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Trophy className="h-6 w-6 mr-2 text-amber-500" />
            Academic Leaderboards
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Normalized competition rankings across Average Percentage, Pass Rate, and Total Marks
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSettingsOpen(true)}
            className="space-x-1.5"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Privacy & Display Controls</span>
          </Button>
        </div>
      </div>

      {/* Leaderboard Type Tabs */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-200/70 rounded-2xl max-w-xl">
        <button
          type="button"
          onClick={() => setType("AVERAGE_PERCENTAGE")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            type === "AVERAGE_PERCENTAGE"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Percent className="h-4 w-4" />
          <span>Average %</span>
        </button>

        <button
          type="button"
          onClick={() => setType("PASS_RATE")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            type === "PASS_RATE"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Pass Rate</span>
        </button>

        <button
          type="button"
          onClick={() => setType("TOTAL_MARKS")}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
            type === "TOTAL_MARKS"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Total Marks</span>
        </button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Classes</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Subjects</option>
              <option value="PHY">Physics</option>
              <option value="MAT">Mathematics</option>
              <option value="CHEM">Chemistry</option>
              <option value="BIO">Biology</option>
              <option value="COMP">Computer Applications</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Eligible Ranked Students: <strong>{entries.length}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            {type === "AVERAGE_PERCENTAGE"
              ? "Average Percentage Standings"
              : type === "PASS_RATE"
              ? "Pass Rate Standings"
              : "Total Marks Standings"}
          </CardTitle>
          <Badge variant="info">Competition Rank (1224)</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 text-center w-16">Rank</th>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Roll No</th>
                  <th className="px-4 py-3.5">Class</th>
                  <th className="px-4 py-3.5">Tests</th>
                  <th className="px-4 py-3.5 font-bold text-indigo-700">
                    {type === "AVERAGE_PERCENTAGE"
                      ? "Average %"
                      : type === "PASS_RATE"
                      ? "Pass Rate %"
                      : "Total Marks"}
                  </th>
                  <th className="px-4 py-3.5 text-right">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                      Computing leaderboard standings...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-slate-700">No ranked students yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Students will appear here as soon as official examination results exist.
                      </p>
                    </td>
                  </tr>
                ) : (
                  entries.map((item) => (
                    <tr key={item.studentId} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 text-center font-bold">
                        {item.rank === 1 ? (
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-100 text-amber-800 text-xs font-black shadow-xs">
                            🥇
                          </span>
                        ) : item.rank === 2 ? (
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-200 text-slate-800 text-xs font-black">
                            🥈
                          </span>
                        ) : item.rank === 3 ? (
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-50 text-amber-700 border border-amber-300 text-xs font-black">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-xs">#{item.rank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="font-mono text-[11px] text-indigo-600">{item.studentCode}</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-slate-700">
                        {item.rollNumber}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{item.className}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {item.eligibleTestsCount} tests
                      </td>
                      <td className="px-4 py-3.5 font-black text-sm text-indigo-700">
                        {type === "AVERAGE_PERCENTAGE"
                          ? `${item.averagePercentage}%`
                          : type === "PASS_RATE"
                          ? `${item.passRate}%`
                          : item.totalMarks}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-700">
                        {item.passRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Leaderboard Privacy & Display Settings"
        description="Configure what student peers can see on their public leaderboard view."
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {settingsSavedMsg && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Settings updated successfully.
            </div>
          )}

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <div>
                <span className="font-bold text-xs text-slate-900 block">Enable Public Leaderboard</span>
                <span className="text-[11px] text-slate-500">Allow students to view rankings</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <div>
                <span className="font-bold text-xs text-slate-900 block">Show Student Names</span>
                <span className="text-[11px] text-slate-500">Display names instead of &quot;Student #Rank&quot;</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showName}
                onChange={(e) => setSettings({ ...settings, showName: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <div>
                <span className="font-bold text-xs text-slate-900 block">Show Roll Numbers</span>
                <span className="text-[11px] text-slate-500">Display academic roll numbers</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showRollNumber}
                onChange={(e) => setSettings({ ...settings, showRollNumber: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <div>
                <span className="font-bold text-xs text-slate-900 block">Show Total Marks</span>
                <span className="text-[11px] text-slate-500">Display raw accumulated marks</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showMarks}
                onChange={(e) => setSettings({ ...settings, showMarks: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSettingsOpen(false)}
              disabled={isSavingSettings}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSavingSettings} disabled={isSavingSettings}>
              Save Settings
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
