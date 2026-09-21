import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth/session";
import {
  ArrowLeft,
  FileText,
  Clock,
  Award,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SnapshotOption {
  id: string;
  text: string;
  correct: boolean;
}

interface QuestionSnapshot {
  customId?: string;
  type?: string;
  difficulty?: string;
  marks?: number;
  question?: { text?: string };
  options?: SnapshotOption[];
  correctAnswer?: string | boolean | number | { value?: number; unit?: string };
  explanation?: string;
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/auth/admin-login");
  }

  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      class: true,
      subject: true,
      chapter: true,
      gradingRules: {
        orderBy: { displayOrder: "asc" },
      },
      examQuestions: {
        orderBy: { orderNumber: "asc" },
      },
      _count: {
        select: {
          assignments: true,
          attempts: true,
        },
      },
    },
  });

  if (!exam) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/admin/exams"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Exams
        </Link>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <FileText className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{exam.title}</h2>
              <Badge variant="info">Class {exam.class.classNumber}</Badge>
              <Badge variant="default">{exam.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Subject: <strong className="text-slate-700">{exam.subject.name}</strong>
              {exam.chapter && ` • Chapter: ${exam.chapter.name}`} • Format:{" "}
              <span className="font-mono text-indigo-600">v{exam.formatVersion}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Exam Parameters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Questions
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-slate-900">
              {exam.examQuestions.length}
            </div>
            <p className="text-[11px] text-slate-400">Snapshotted Qs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Marks
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-slate-900">{exam.totalMarks}</div>
            <p className="text-[11px] text-slate-400">Passing: {exam.passingPercentage}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Duration
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-slate-900 flex items-center">
              <Clock className="h-5 w-5 mr-1.5 text-indigo-600" />
              {exam.durationMinutes}m
            </div>
            <p className="text-[11px] text-slate-400">Authoritative timer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Negative Marking
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-slate-900">
              {exam.negativeMarkingEnabled ? `-${exam.negativeMarkValue}` : "None"}
            </div>
            <p className="text-[11px] text-slate-400">Per wrong answer</p>
          </CardContent>
        </Card>
      </div>

      {/* Snapshotted Questions List */}
      <Card>
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center">
            <Layers className="h-4 w-4 mr-2 text-indigo-600" />
            Immutable Question Snapshots ({exam.examQuestions.length})
          </CardTitle>
          <span className="text-xs text-slate-400">
            Snapshotted on {new Date(exam.createdAt).toLocaleDateString()}
          </span>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {exam.examQuestions.map((eq, idx) => {
            const snap = eq.questionSnapshot as unknown as QuestionSnapshot;
            return (
              <div
                key={eq.id}
                className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2 shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">Q{idx + 1}.</span>
                    <span className="font-mono text-xs font-semibold text-indigo-600">
                      {snap?.customId || "Q-" + eq.id.slice(0, 8)}
                    </span>
                    <Badge variant="default">{snap?.type?.toUpperCase()}</Badge>
                    {snap?.difficulty && (
                      <Badge variant="outline">{snap.difficulty.toUpperCase()}</Badge>
                    )}
                  </div>
                  <span className="font-bold text-slate-800">
                    {eq.marks} mark{eq.marks === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Question Text (Sanitized) */}
                <div
                  className="text-slate-900 font-medium text-sm pt-1"
                  dangerouslySetInnerHTML={{ __html: snap?.question?.text || "" }}
                />

                {/* Options List */}
                {snap?.options && snap.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {snap.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                          opt.correct
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span>
                          <strong>{opt.id}.</strong> {opt.text}
                        </span>
                        {opt.correct && (
                          <span className="text-[10px] uppercase font-bold text-emerald-700">
                            ✓ Correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* True/False or Numerical Answer */}
                {snap?.type === "true_false" && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-semibold">
                    Correct Answer: {snap.correctAnswer ? "TRUE" : "FALSE"}
                  </div>
                )}

                {snap?.type === "numerical" && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 font-semibold">
                    Correct Value: {typeof snap?.correctAnswer === "object" && snap?.correctAnswer !== null && "value" in snap.correctAnswer ? snap.correctAnswer.value : String(snap?.correctAnswer || "")}{" "}
                    {typeof snap?.correctAnswer === "object" && snap?.correctAnswer !== null && "unit" in snap.correctAnswer ? snap.correctAnswer.unit : ""}
                  </div>
                )}

                {/* Explanation */}
                {snap?.explanation && (
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                    <strong>Explanation:</strong> {snap.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Grading Rules Card */}
      <Card>
        <CardHeader className="p-5 border-b border-slate-100">
          <CardTitle className="text-base font-bold flex items-center">
            <Award className="h-4 w-4 mr-2 text-amber-500" />
            Grading Tiers Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {exam.gradingRules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs space-y-1"
              >
                <p className="font-mono font-bold text-slate-900">
                  {rule.minPercentage}% – {rule.maxPercentage}%
                </p>
                <p className="font-semibold text-indigo-700">{rule.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
