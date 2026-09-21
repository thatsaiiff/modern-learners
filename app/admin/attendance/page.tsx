"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Plus,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface SessionListItem {
  id: string;
  title: string;
  classNumber: number;
  className: string;
  date: string;
  startTime: string;
  endTime: string;
  studentCheckInEnabled: boolean;
  totalStudents: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  attendanceRate: number;
}

export default function AdminAttendancePage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // New Session Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classNumber, setClassNumber] = useState<number>(8);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [studentCheckIn, setStudentCheckIn] = useState(true);
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (classFilter !== "all") params.append("classNumber", classFilter);

      const res = await fetch(`/api/attendance/sessions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error("Failed to load attendance sessions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [classFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const openNewSessionModal = () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startStr = new Date(now.getTime() - 5 * 60000).toISOString().slice(0, 16);
    const endStr = new Date(now.getTime() + 60 * 60000).toISOString().slice(0, 16);

    setDate(todayStr);
    setStartTime(startStr);
    setEndTime(endStr);
    setTitle(`Class ${classNumber} Tuition Session`);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!date || !startTime || !endTime) {
      setErrorMsg("Please provide valid date and start/end times.");
      return;
    }

    try {
      setIsCreating(true);
      const res = await fetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classNumber,
          date: new Date(date).toISOString(),
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          studentCheckInEnabled: studentCheckIn,
          title: title.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to create session.");
        setIsCreating(false);
        return;
      }

      setIsCreating(false);
      setIsModalOpen(false);
      fetchSessions();
    } catch {
      setErrorMsg("Network error.");
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <CalendarCheck2 className="h-6 w-6 mr-2 text-indigo-600" />
            Attendance Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track tuition class attendance, enable student check-in, and manage rosters
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={openNewSessionModal} className="space-x-1.5 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            <span>New Attendance Session</span>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-500">Filter by Class:</span>
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
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total Sessions: <strong>{sessions.length}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-800">Attendance Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Session Title</th>
                  <th className="px-4 py-3.5">Class</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Check-In Window</th>
                  <th className="px-4 py-3.5">Present / Total</th>
                  <th className="px-4 py-3.5">Rate</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                      Loading attendance sessions...
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-semibold text-sm text-slate-700">No attendance sessions found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Create your first attendance session to start tracking student presence.
                      </p>
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{s.title}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant="info">Class {s.classNumber}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {new Date(s.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                        {new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {s.studentCheckInEnabled && (
                          <span className="block text-[10px] text-emerald-600 font-bold">
                            ✓ Self Check-in Enabled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {s.presentCount + s.lateCount} / {s.totalStudents}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            s.attendanceRate >= 80
                              ? "success"
                              : s.attendanceRate >= 60
                              ? "warning"
                              : "danger"
                          }
                        >
                          {s.attendanceRate}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/attendance/${s.id}`}>
                          <Button size="sm" variant="outline" className="text-xs h-8">
                            Mark Roster
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Session Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Attendance Session"
        description="Schedule an attendance window for a tuition class."
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Class *</label>
            <select
              value={classNumber}
              onChange={(e) => {
                const c = parseInt(e.target.value, 10);
                setClassNumber(c);
                setTitle(`Class ${c} Tuition Session`);
              }}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            >
              <option value={6}>Class 6</option>
              <option value={7}>Class 7</option>
              <option value={8}>Class 8</option>
              <option value={9}>Class 9</option>
              <option value={10}>Class 10</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Session Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Start Time *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">End Time *</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
                required
              />
            </div>
          </div>

          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={studentCheckIn}
              onChange={(e) => setStudentCheckIn(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="font-bold text-xs text-slate-900 block">Allow Student Self Check-In</span>
              <span className="text-[11px] text-slate-500">Students can mark attendance during this window</span>
            </div>
          </label>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating} disabled={isCreating}>
              Create Session & Load Roster
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
