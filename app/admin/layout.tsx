import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth/session";
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
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/auth/admin-login");
  }

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
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white leading-tight">Modern Learners</h1>
              <p className="text-[11px] text-indigo-400 font-medium">Saif Classes Admin</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs">
            <p className="font-bold text-white">{session.name}</p>
            <p className="text-[11px] text-slate-400">{session.role}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
