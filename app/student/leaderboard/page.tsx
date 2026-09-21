"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Trophy,
  ArrowLeft,
  Award,
  TrendingUp,
  Percent,
  BookOpen,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeaderboardType } from "@/lib/services/leaderboard.service";

interface LeaderboardEntry {
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
  isSelf: boolean;
}

export default function StudentLeaderboardPage() {
  const [type, setType] = useState<LeaderboardType>("AVERAGE_PERCENTAGE");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myPosition, setMyPosition] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setMyPosition(data.data.myPosition || null);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/student"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
              <Trophy className="h-6 w-6 mr-2 text-amber-500" />
              Academic Leaderboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Live standings across official tests, normalized average scores and pass rates
            </p>
          </div>
        </div>
      </div>

      {/* My Position Highlight Card */}
      {myPosition && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 shadow-md shadow-indigo-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-bold text-indigo-200 tracking-wider">
              Your Current Standing
            </span>
            <h3 className="text-xl font-bold">{myPosition.name}</h3>
            <p className="text-xs text-indigo-100">
              Class {myPosition.classNumber} • Roll: {myPosition.rollNumber} • {myPosition.eligibleTestsCount} Eligible Tests
            </p>
          </div>

          <div className="flex items-center space-x-4 bg-white/10 px-4 py-3 rounded-2xl backdrop-blur-xs">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-200 block">Rank</span>
              <span className="text-2xl sm:text-3xl font-black">#{myPosition.rank}</span>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-200 block">Score</span>
              <span className="text-2xl sm:text-3xl font-black">
                {type === "AVERAGE_PERCENTAGE"
                  ? `${myPosition.averagePercentage}%`
                  : type === "PASS_RATE"
                  ? `${myPosition.passRate}%`
                  : myPosition.totalMarks}
              </span>
            </div>
          </div>
        </div>
      )}

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
            Ranked Peers: <strong>{entries.length}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            {type === "AVERAGE_PERCENTAGE"
              ? "Normalized Average % Ranking"
              : type === "PASS_RATE"
              ? "Pass Rate Standings"
              : "Total Marks Standings"}
          </CardTitle>
          <Badge variant="info">Official Results Only</Badge>
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
                  <th className="px-4 py-3.5 font-bold text-indigo-700 text-right">
                    {type === "AVERAGE_PERCENTAGE"
                      ? "Average %"
                      : type === "PASS_RATE"
                      ? "Pass Rate %"
                      : "Total Marks"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                      Loading standings...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500">
                      <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-slate-700">No ranked peers yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Complete assigned exams to earn your official rank.
                      </p>
                    </td>
                  </tr>
                ) : (
                  entries.map((item) => (
                    <tr
                      key={item.studentId}
                      className={`transition ${
                        item.isSelf
                          ? "bg-indigo-50/80 font-semibold"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
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
                        <span className="font-bold text-slate-900 block">
                          {item.name} {item.isSelf && <span className="text-[11px] text-indigo-600 font-bold ml-1">(You)</span>}
                        </span>
                        {item.isSelf && (
                          <span className="font-mono text-[11px] text-indigo-600">{item.studentCode}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                        {item.rollNumber}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">{item.className}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {item.eligibleTestsCount} tests
                      </td>
                      <td className="px-4 py-3.5 font-black text-sm text-indigo-700 text-right">
                        {type === "AVERAGE_PERCENTAGE"
                          ? `${item.averagePercentage}%`
                          : type === "PASS_RATE"
                          ? `${item.passRate}%`
                          : item.totalMarks}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
