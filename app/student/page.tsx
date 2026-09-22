import { getStudentSession } from "@/lib/auth/session";
import { getStudentAssignedExams } from "@/lib/services/exam-assignment.service";
import Link from "next/link";
import { BookOpen, Award, Clock, PlayCircle, RotateCcw, Sparkles } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function StudentDashboardPage() {
  const session = await getStudentSession();

  const assignedData = session
    ? await getStudentAssignedExams(session.studentId)
    : { available: [], upcoming: [], completed: [], expired: [] };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-950 text-white p-5 sm:p-7 shadow-md shadow-indigo-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-semibold text-indigo-100 backdrop-blur-xs">
            <Sparkles className="h-3 w-3 text-amber-300" />
            <span>Academic Portal • 2026–27</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Welcome back, {session?.name}!
          </h2>
          <p className="text-xs text-indigo-200/90 font-medium">
            Class {session?.classNumber} • Roll:{" "}
            <span className="font-mono font-bold text-white tabular-nums">{session?.rollNumber}</span> • ID:{" "}
            <span className="font-mono text-white/90 tabular-nums">{session?.studentCode}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto bg-black/20 p-3 sm:p-4 rounded-2xl backdrop-blur-xs text-xs">
          <div>
            <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">
              Tests Ready
            </span>
            <span className="text-2xl font-black text-white tabular-nums">
              {assignedData.available.length}
            </span>
          </div>
          <div className="h-8 w-px bg-white/20" />
          <div>
            <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">
              Completed
            </span>
            <span className="text-2xl font-black text-white tabular-nums">
              {assignedData.completed.length}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Available Tests
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-indigo-600 tabular-nums">
              {assignedData.available.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Ready to attempt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {assignedData.completed.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Submitted tests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Upcoming
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {assignedData.upcoming.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Scheduled soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Attendance
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">100%</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Present rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Available Examinations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center">
            <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
            Available Examinations ({assignedData.available.length})
          </h3>
          <Badge variant="info">Class {session?.classNumber}</Badge>
        </div>

        {assignedData.available.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Clock className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-700">No active examinations available right now</p>
              <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                When your teacher assigns an active test for your class, it will appear here with instructions and timer.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedData.available.map((exam) => (
              <Card
                key={exam.examId}
                className="border-indigo-100 hover:border-indigo-300 transition-all flex flex-col justify-between shadow-sm"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        {exam.subjectName} {exam.chapterName ? `• ${exam.chapterName}` : ""}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 leading-snug">{exam.title}</h4>
                    </div>
                    {exam.isEligible === false ? (
                      <Badge variant="warning">Not Eligible</Badge>
                    ) : exam.activeAttemptId ? (
                      <Badge variant="warning">In Progress</Badge>
                    ) : (
                      <Badge variant="success">Open</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 font-medium tabular-nums">
                    <span className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      {exam.durationMinutes} mins
                    </span>
                    <span>•</span>
                    <span>{exam.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>{exam.totalMarks} Marks</span>
                  </div>

                  {exam.isEligible === false ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                      <p className="font-bold flex items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 mr-1.5 shrink-0" />
                        You are not eligible to attempt this assessment.
                      </p>
                      <p className="text-slate-700 pl-3 leading-relaxed">
                        Reason: <strong>{exam.ineligibilityReason || "Not eligible for this assessment."}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400 pl-3">
                        If you believe this is an error, please contact Saif Sir.
                      </p>
                    </div>
                  ) : exam.instructions ? (
                    <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {exam.instructions}
                    </p>
                  ) : null}

                  <div className="pt-1">
                    {exam.isEligible === false ? (
                      <Button disabled className="w-full bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed min-h-[44px]">
                        Not Eligible to Start
                      </Button>
                    ) : (
                      <Link href={`/student/exams/${exam.examId}`}>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 min-h-[44px]">
                          {exam.activeAttemptId ? (
                            <>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Resume Exam Attempt
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Start Examination
                            </>
                          )}
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Examinations Section */}
      {assignedData.completed.length > 0 && (
        <div className="space-y-3" id="results">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center">
              <Award className="h-4 w-4 mr-2 text-amber-500" />
              Completed Examinations ({assignedData.completed.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assignedData.completed.map((exam) => (
              <Card key={exam.examId}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{exam.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {exam.subjectName} • {exam.totalMarks} Marks
                    </p>
                  </div>
                  <Badge variant="success">Submitted</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
