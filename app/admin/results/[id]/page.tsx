import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth/session";
import { getResultDetails, ResultDetailsData } from "@/lib/services/grading.service";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/auth/admin-login");
  }

  const { id } = await params;
  let data: ResultDetailsData | null = null;

  try {
    data = await getResultDetails(id, { isAdmin: true });
  } catch {
    notFound();
  }

  if (!data) {
    notFound();
  }

  const { result, exam, student, analysis, questions } = data;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/results"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Results
        </Link>
      </div>

      {/* Hero Card */}
      <div
        className={`rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
          result.passed
            ? "bg-gradient-to-r from-emerald-600 to-teal-700 shadow-emerald-100"
            : "bg-gradient-to-r from-rose-600 to-rose-800 shadow-rose-100"
        }`}
      >
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{result.performanceLabel}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{exam.title}</h2>
          <p className="text-xs sm:text-sm text-white/80">
            Student: <strong>{student.name}</strong> ({student.studentCode}) • Roll:{" "}
            <strong>{student.rollNumber}</strong> • {student.className} • Attempt #{result.attemptNumber}
          </p>
        </div>

        <div className="flex items-center space-x-6 self-start sm:self-auto bg-black/15 p-4 sm:p-5 rounded-2xl backdrop-blur-xs">
          <div className="text-center">
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block">
              Score
            </span>
            <span className="text-3xl sm:text-4xl font-black">
              {result.rawMarks}/{result.maximumMarks}
            </span>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div className="text-center">
            <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wider block">
              Percentage
            </span>
            <span className="text-3xl sm:text-4xl font-black">{result.percentage}%</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Status
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-xl font-black ${result.passed ? "text-emerald-600" : "text-rose-600"}`}>
              {result.passed ? "PASSED" : "FAILED"}
            </div>
            <p className="text-[11px] text-slate-400">Pass mark: {exam.passingPercentage}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Correct
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-600 flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-1" />
              {result.correctCount}
            </div>
            <p className="text-[11px] text-slate-400">Questions correct</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Incorrect / Skipped
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-rose-600 flex items-center">
              <XCircle className="h-5 w-5 mr-1" />
              {result.wrongCount + result.unansweredCount}
            </div>
            <p className="text-[11px] text-slate-400">
              {result.wrongCount} wrong, {result.unansweredCount} skipped
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Time Taken
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-slate-900 flex items-center">
              <Clock className="h-5 w-5 mr-1 text-indigo-600" />
              {formatDuration(result.durationSeconds)}
            </div>
            <p className="text-[11px] text-slate-400">Exam duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Improvement Areas */}
      {analysis.weakTopics && analysis.weakTopics.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader className="p-4 pb-2 border-b border-amber-100">
            <CardTitle className="text-sm font-bold text-amber-900 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-600" />
              Identified Student Improvement Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {analysis.weakTopics.map((wt) => (
                <div
                  key={wt.topic}
                  className="p-3 rounded-xl bg-white border border-amber-200 text-xs flex justify-between items-center"
                >
                  <span className="font-bold text-slate-800">{wt.topic}</span>
                  <span className="font-bold text-rose-600">
                    {wt.accuracy}% ({wt.correct}/{wt.total} correct)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question by Question Review */}
      <Card>
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center">
            <HelpCircle className="h-4 w-4 mr-2 text-indigo-600" />
            Detailed Question Evaluation ({questions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {questions.map((q) => (
            <div
              key={q.index}
              className={`p-4 sm:p-5 rounded-2xl border-2 text-xs space-y-3 transition ${
                q.isCorrect
                  ? "bg-emerald-50/20 border-emerald-200"
                  : q.selectedAnswer
                  ? "bg-rose-50/20 border-rose-200"
                  : "bg-slate-50/60 border-slate-200"
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-slate-900">Q{q.index}.</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-500">
                    {q.customId}
                  </span>
                  <Badge variant="default">{q.type?.toUpperCase()}</Badge>
                  {q.topic && <Badge variant="outline">{q.topic}</Badge>}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs">
                    {q.marksAwarded} / {q.maxMarks} Mark{q.maxMarks === 1 ? "" : "s"}
                  </span>
                  {q.isCorrect ? (
                    <Badge variant="success">✓ Correct</Badge>
                  ) : q.selectedAnswer ? (
                    <Badge variant="danger">✗ Incorrect</Badge>
                  ) : (
                    <Badge variant="default">Unanswered</Badge>
                  )}
                </div>
              </div>

              <div
                className="text-sm sm:text-base text-slate-900 font-medium leading-relaxed"
                dangerouslySetInnerHTML={{ __html: q.questionText }}
              />

              {q.options && q.options.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {q.options.map((opt) => {
                    const isSelected = Array.isArray(q.selectedAnswer)
                      ? q.selectedAnswer.includes(opt.id)
                      : q.selectedAnswer === opt.id;
                    const isCorrect = Array.isArray(q.correctAnswer)
                      ? q.correctAnswer.includes(opt.id)
                      : q.correctAnswer === opt.id;

                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          isCorrect
                            ? "bg-emerald-100/70 border-emerald-400 text-emerald-950 font-semibold"
                            : isSelected
                            ? "bg-rose-100/70 border-rose-300 text-rose-950 font-medium"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <span>
                          <strong>{opt.id}.</strong> {opt.text}
                        </span>
                        <div>
                          {isCorrect && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md">
                              Correct Answer
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-md ml-1">
                              Student Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === "true_false" && (
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-1">
                  <p>
                    Student Answer: <strong>{q.selectedAnswer ? String(q.selectedAnswer).toUpperCase() : "None"}</strong>
                  </p>
                  <p className="text-emerald-700 font-bold">
                    Correct Answer: {q.correctAnswer ? "TRUE" : "FALSE"}
                  </p>
                </div>
              )}

              {q.type === "numerical" && (
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-1">
                  <p>
                    Student Answer: <strong>{q.selectedAnswer !== null && q.selectedAnswer !== undefined ? String(q.selectedAnswer) : "None"}</strong>
                  </p>
                  <p className="text-emerald-700 font-bold">
                    Correct Value: {typeof q.correctAnswer === "object" && q.correctAnswer !== null && "value" in q.correctAnswer ? String((q.correctAnswer as { value?: unknown }).value) : String(q.correctAnswer || "")}{" "}
                    {typeof q.correctAnswer === "object" && q.correctAnswer !== null && "unit" in q.correctAnswer ? String((q.correctAnswer as { unit?: unknown }).unit) : ""}
                  </p>
                </div>
              )}

              {q.explanation && (
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-indigo-950 text-xs">
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
