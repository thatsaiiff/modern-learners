import { getStudentSession } from "@/lib/auth/session";
import { getStudentAssignedExams } from "@/lib/services/exam-assignment.service";
import Link from "next/link";
import { BookOpen, Award, Clock, PlayCircle, RotateCcw } from "lucide-react";
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
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 shadow-md shadow-indigo-100">
        <h2 className="text-xl sm:text-2xl font-bold">Welcome back, {session?.name}!</h2>
        <p className="text-xs sm:text-sm text-indigo-100 mt-1">
          Class {session?.classNumber} • Roll:{" "}
          <span className="font-mono font-bold">{session?.rollNumber}</span> • Permanent ID:{" "}
          <span className="font-mono">{session?.studentCode}</span>
        </p>
      </div>

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Available Tests
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-indigo-600">
              {assignedData.available.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Ready to attempt</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-slate-900">
              {assignedData.completed.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Submitted tests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Upcoming
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-slate-900">
              {assignedData.upcoming.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Scheduled soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Attendance
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-emerald-600">100%</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Present rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Available Examinations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center">
            <BookOpen className="h-4 w-4 mr-2 text-indigo-600" />
            Available Examinations ({assignedData.available.length})
          </h3>
          <Badge variant="info">Class {session?.classNumber}</Badge>
        </div>

        {assignedData.available.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Clock className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="font-medium text-sm text-slate-700">No active examinations available right now</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                When your teacher assigns an active test for your class, it will appear here with instructions and timer.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedData.available.map((exam) => (
              <Card key={exam.examId} className="border-indigo-100 hover:border-indigo-300 transition flex flex-col justify-between">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        {exam.subjectName} {exam.chapterName ? `• ${exam.chapterName}` : ""}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 leading-snug">{exam.title}</h4>
                    </div>
                    {exam.activeAttemptId ? (
                      <Badge variant="warning">In Progress</Badge>
                    ) : (
                      <Badge variant="success">Open</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-4">
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      {exam.durationMinutes} mins
                    </span>
                    <span>•</span>
                    <span>{exam.totalQuestions} Questions</span>
                    <span>•</span>
                    <span>{exam.totalMarks} Marks</span>
                  </div>

                  {exam.instructions && (
                    <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg">
                      {exam.instructions}
                    </p>
                  )}

                  <div className="pt-2">
                    <Link href={`/student/exams/${exam.examId}`}>
                      <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
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
            <h3 className="text-base font-bold text-slate-900 flex items-center">
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
                    <p className="text-xs text-slate-500 mt-0.5">
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
