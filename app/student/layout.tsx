import { redirect } from "next/navigation";
import Link from "next/link";
import { getStudentSession } from "@/lib/auth/session";
import { GraduationCap, BookOpen, Award, User, LogOut, BarChart3, Printer } from "lucide-react";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStudentSession();

  if (!session) {
    redirect("/auth/student-login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16 sm:pb-0">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/student" className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 leading-none block">
                  {session.name}
                </span>
                <span className="text-[11px] font-medium text-indigo-600 leading-none">
                  Class {session.classNumber} • Roll: {session.rollNumber}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/student/performance"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition flex items-center"
            >
              <BarChart3 className="h-4 w-4 mr-1 text-indigo-600" />
              <span>Performance</span>
            </Link>
            <Link
              href="/student/results"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition flex items-center"
            >
              <Award className="h-4 w-4 mr-1 text-amber-500" />
              <span>Results</span>
            </Link>
            <Link
              href="/student/report-card"
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition flex items-center"
            >
              <Printer className="h-4 w-4 mr-1 text-indigo-600" />
              <span>Report Card</span>
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="inline-flex items-center text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-center justify-around h-16 px-2 shadow-lg">
        <Link
          href="/student"
          className="flex flex-col items-center justify-center text-indigo-600 text-[10px] font-medium py-1 px-3"
        >
          <BookOpen className="h-5 w-5 mb-0.5" />
          <span>Exams</span>
        </Link>
        <Link
          href="/student/performance"
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 text-[10px] font-medium py-1 px-3"
        >
          <BarChart3 className="h-5 w-5 mb-0.5" />
          <span>Analytics</span>
        </Link>
        <Link
          href="/student/results"
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 text-[10px] font-medium py-1 px-3"
        >
          <Award className="h-5 w-5 mb-0.5" />
          <span>Results</span>
        </Link>
        <Link
          href="/student#profile"
          className="flex flex-col items-center justify-center text-slate-500 hover:text-indigo-600 text-[10px] font-medium py-1 px-3"
        >
          <User className="h-5 w-5 mb-0.5" />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
