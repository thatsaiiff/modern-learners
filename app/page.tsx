import Link from "next/link";
import { GraduationCap, ShieldCheck, BookOpen, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-100">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-slate-900 leading-tight">
                Modern Learners
              </h1>
              <p className="text-xs text-indigo-600 font-medium">Saif Classes</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link
              href="/auth/admin-login"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
            >
              Teacher Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Portal Options */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Official Academic & Examination Portal</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-snug">
            Excellence in Learning & Timed Assessments
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Classes 6 to 10 • Mathematics, Physics, Chemistry, Biology & Computer Applications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {/* Student Card */}
          <div className="group relative rounded-2xl border-2 border-indigo-500/30 bg-white p-6 sm:p-8 shadow-lg shadow-indigo-50/50 hover:border-indigo-600 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Student Portal</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Access assigned tests, view live countdown timers, get instant grades and track your performance trends.
                </p>
              </div>
              <div className="pt-2 text-xs font-medium text-slate-500 space-y-1">
                <p className="flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2" />
                  Login with Roll Number (e.g. 08-2627-001)
                </p>
                <p className="flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2" />
                  Secure 4-digit PIN verification
                </p>
              </div>
            </div>
            <div className="pt-6">
              <Link
                href="/auth/student-login"
                className="w-full inline-flex items-center justify-center h-12 px-6 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
              >
                Enter Student Portal →
              </Link>
            </div>
          </div>

          {/* Admin / Teacher Card */}
          <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Admin & Teacher Portal</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Upload HTML exams, assign tests, manage students, track attendance, and inspect performance analytics.
                </p>
              </div>
              <div className="pt-2 text-xs font-medium text-slate-500 space-y-1">
                <p className="flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mr-2" />
                  Staff authentication required
                </p>
                <p className="flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mr-2" />
                  Full academic session & promotion control
                </p>
              </div>
            </div>
            <div className="pt-6">
              <Link
                href="/auth/admin-login"
                className="w-full inline-flex items-center justify-center h-12 px-6 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 shadow-sm transition-all active:scale-[0.98]"
              >
                Staff Login →
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Modern Learners — Saif Classes. All rights reserved.</p>
      </footer>
    </div>
  );
}
