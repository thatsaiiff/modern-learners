"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  FileText,
  Upload,
  BookOpen,
  Award,
  BarChart3,
  CalendarCheck2,
  Trophy,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { AdminSessionPayload } from "@/lib/auth/types";

interface AdminShellProps {
  session: AdminSessionPayload;
  children: React.ReactNode;
}

export function AdminShell({ session, children }: AdminShellProps) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Students", href: "/admin/students", icon: Users },
    { label: "Exams", href: "/admin/exams", icon: FileText },
    { label: "Upload HTML", href: "/admin/exams/import", icon: Upload },
    { label: "Question Bank", href: "/admin/questions", icon: BookOpen },
    { label: "Results", href: "/admin/results", icon: Award },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck2 },
    { label: "Leaderboard", href: "/admin/leaderboard", icon: Trophy },
    { label: "Reports", href: "/admin/reports", icon: FileSpreadsheet },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top App Bar (Visible on screens < md) */}
      <header className="md:hidden sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 px-4 h-15 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-xs leading-none tracking-tight">Modern Learners</h1>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
              Saif Classes
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 transition"
          aria-label="Toggle navigation menu"
        >
          {isMobileDrawerOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          <aside className="relative z-50 w-72 max-w-[85vw] bg-slate-900 text-slate-200 flex flex-col justify-between p-4 shadow-2xl animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-white leading-tight">Modern Learners</h2>
                    <p className="text-[10px] text-indigo-400 font-semibold uppercase">Admin Portal</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs font-bold"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs truncate mr-2">
                <p className="font-bold text-white truncate">{session.name}</p>
                <p className="text-[10px] text-indigo-400 uppercase font-semibold">{session.role}</p>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Persistent Sidebar (md:) */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col justify-between shrink-0 border-r border-slate-800">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white leading-tight tracking-tight">Modern Learners</h1>
              <p className="text-[11px] text-indigo-400 font-semibold tracking-wide uppercase">Saif Classes Admin</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs font-bold"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs truncate mr-2">
            <p className="font-bold text-white truncate">{session.name}</p>
            <p className="text-[10px] text-indigo-400 font-semibold uppercase">{session.role}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
