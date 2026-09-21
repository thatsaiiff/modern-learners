"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  Award,
  LogOut,
  BarChart3,
  Printer,
  Trophy,
  CalendarCheck2,
} from "lucide-react";
import { StudentSessionPayload } from "@/lib/auth/types";

interface StudentShellProps {
  session: StudentSessionPayload;
  children: React.ReactNode;
}

export function StudentShell({ session, children }: StudentShellProps) {
  const pathname = usePathname();

  const navLinks = [
    { label: "Performance", href: "/student/performance", icon: BarChart3 },
    { label: "Results", href: "/student/results", icon: Award },
    { label: "Leaderboard", href: "/student/leaderboard", icon: Trophy },
    { label: "Report Card", href: "/student/report-card", icon: Printer },
  ];

  const mobileTabs = [
    { label: "Exams", href: "/student", icon: BookOpen },
    { label: "Analytics", href: "/student/performance", icon: BarChart3 },
    { label: "Results", href: "/student/results", icon: Award },
    { label: "Ranking", href: "/student/leaderboard", icon: Trophy },
    { label: "Attendance", href: "/student/attendance", icon: CalendarCheck2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-8">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-2">
          {/* Student Identity Brand Cluster */}
          <Link
            href="/student"
            className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 hover:opacity-90 transition"
          >
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight truncate max-w-[140px] xs:max-w-[190px] sm:max-w-[300px]">
                  {session.name}
                </span>
              </div>
              <p className="text-[11px] text-indigo-600 font-semibold leading-tight truncate tabular-nums">
                Class {session.classNumber} • Roll: {session.rollNumber}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links & Action */}
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <nav className="hidden sm:flex items-center space-x-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex items-center space-x-1 min-h-[36px] ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="inline-flex items-center justify-center text-xs font-semibold px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition min-h-[44px] min-w-[44px]"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3.5 sm:px-6 py-5 sm:py-7">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop) */}
      <nav
        aria-label="Mobile student navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex items-center justify-around h-16 px-1 shadow-lg"
      >
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.href !== "/student" && pathname?.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all min-h-[44px] ${
                isActive ? "text-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`h-5 w-5 mb-0.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
