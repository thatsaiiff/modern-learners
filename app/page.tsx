import Link from "next/link";
import { GraduationCap, ShieldCheck, BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-15 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-600/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-none tracking-tight">
                Modern Learners
              </h1>
              <p className="text-[10px] sm:text-[11px] text-indigo-600 font-semibold tracking-wide uppercase">
                Saif Classes
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/auth/admin-login">
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs">
                Teacher Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Portal Options */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-14 flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-[11px] font-bold">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Academic Management & Examination Platform</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Precision Learning & Timed Assessments
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Class 6 to 10 • Mathematics, Physics, Chemistry, Biology & Computer Applications
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-3xl mx-auto w-full">
          {/* Student Portal Card */}
          <div className="group rounded-2xl sm:rounded-3xl border-2 border-indigo-500/40 bg-white p-5 sm:p-7 shadow-lg shadow-indigo-600/5 hover:border-indigo-600 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">Student Examination Portal</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Access assigned tests, view live countdown timers, get instant grades, and track your topic analytics.
                </p>
              </div>
              <div className="pt-1 text-xs font-semibold text-slate-500 space-y-1.5">
                <p className="flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 shrink-0" />
                  <span>Login with Academic Roll Number (e.g. 08-2627-001)</span>
                </p>
                <p className="flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 shrink-0" />
                  <span>Secure 4-digit PIN verification</span>
                </p>
              </div>
            </div>
            <div className="pt-6">
              <Link href="/auth/student-login">
                <Button className="w-full h-12 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 space-x-1.5">
                  <span>Enter Student Portal</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Admin / Teacher Portal Card */}
          <div className="group rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm hover:border-slate-400 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">Admin & Faculty Console</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Upload HTML exams, assign tests, manage student promotions, track attendance, and inspect performance intelligence.
                </p>
              </div>
              <div className="pt-1 text-xs font-semibold text-slate-500 space-y-1.5">
                <p className="flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mr-2 shrink-0" />
                  <span>Staff credential authentication</span>
                </p>
                <p className="flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mr-2 shrink-0" />
                  <span>Full academic session & promotion control</span>
                </p>
              </div>
            </div>
            <div className="pt-6">
              <Link href="/auth/admin-login">
                <Button variant="secondary" className="w-full h-12 text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 space-x-1.5">
                  <span>Staff Login</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
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
