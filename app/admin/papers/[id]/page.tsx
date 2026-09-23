"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Plus,
  Copy,
  Archive,
  Check,
  Calendar,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestionOptionItem {
  id: string;
  text: string;
  correct?: boolean;
}

interface PaperQuestionItem {
  id: string;
  orderNumber: number;
  marks: number;
  questionSnapshot: {
    customId?: string;
    type?: string;
    topic?: string;
    difficulty?: string;
    question?: { text: string; image?: { src: string; alt?: string } };
    options?: QuestionOptionItem[];
    correctAnswer?: unknown;
    explanation?: string | null;
  };
}

interface QuestionPaperDetail {
  id: string;
  paperCode: string;
  title: string;
  description: string | null;
  instructions: string | null;
  class: { classNumber: number; name: string };
  subject: { name: string; code: string };
  chapter: string | null;
  topic: string | null;
  totalQuestions: number;
  totalMarks: number;
  sourceType: string;
  status: string;
  createdAt: string;
  paperQuestions: PaperQuestionItem[];
  exams: Array<{
    id: string;
    title: string;
    class: { name: string };
    status: string;
    createdAt: string;
    _count: { assignments: number; attempts: number };
  }>;
}

export default function QuestionPaperDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.id as string;

  const [paper, setPaper] = useState<QuestionPaperDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPaper = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/papers/${paperId}`);
      const data = await res.json();
      if (data.success) {
        setPaper(data.paper);
      } else {
        setErrorMsg(data.error || "Question paper not found.");
      }
    } catch {
      setErrorMsg("Network error loading question paper.");
    } finally {
      setIsLoading(false);
    }
  }, [paperId]);

  useEffect(() => {
    loadPaper();
  }, [loadPaper]);

  const handleDuplicate = async () => {
    if (!paper) return;
    try {
      const res = await fetch(`/api/papers/${paper.id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.push(`/admin/papers/${data.paper.id}`);
      } else {
        alert(data.error || "Failed to duplicate.");
      }
    } catch {
      alert("Network error.");
    }
  };

  const handleArchive = async () => {
    if (!paper || !confirm(`Archive Question Paper ${paper.paperCode}?`)) return;
    try {
      const res = await fetch(`/api/papers/${paper.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/admin/papers");
      } else {
        alert(data.error || "Failed to archive.");
      }
    } catch {
      alert("Network error.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading question paper...</p>
      </div>
    );
  }

  if (errorMsg || !paper) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-4">
        <h3 className="font-bold text-base text-slate-900">Question Paper Unavailable</h3>
        <p className="text-xs text-slate-500">{errorMsg}</p>
        <Link href="/admin/papers">
          <Button size="sm" variant="outline">
            Back to Question Papers Library
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/admin/papers"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Question Papers Library
        </Link>
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl shrink-0">
            <FileText className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-black text-indigo-700 tabular-nums">
                {paper.paperCode}
              </span>
              <Badge variant="info">Class {paper.class.classNumber}</Badge>
              <Badge variant="default">{paper.subject.name}</Badge>
              <Badge variant="outline">{paper.sourceType}</Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {paper.title}
            </h2>
            <p className="text-xs text-slate-500">
              {paper.totalQuestions} Questions • {paper.totalMarks} Total Marks
              {paper.chapter && ` • Chapter: ${paper.chapter}`}
            </p>
          </div>
        </div>

        {/* Paper Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link href={`/admin/papers/${paper.id}/create-exam`}>
            <Button size="sm" className="space-x-1.5 bg-indigo-600 hover:bg-indigo-700 font-bold">
              <Plus className="h-4 w-4" />
              <span>Create Exam from Paper</span>
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={handleDuplicate} className="space-x-1 text-xs">
            <Copy className="h-3.5 w-3.5 text-slate-500" />
            <span>Duplicate</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleArchive}
            className="space-x-1 text-xs text-rose-600 hover:bg-rose-50"
          >
            <Archive className="h-3.5 w-3.5" />
            <span>Archive</span>
          </Button>
        </div>
      </div>

      {/* Description / Topic Comment */}
      {paper.description && (
        <Card className="bg-slate-50/70 border-slate-200/80">
          <CardContent className="p-4 text-xs text-slate-700 leading-relaxed">
            <strong className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
              Paper Overview & Coverage
            </strong>
            {paper.description}
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      <Card>
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center">
            <Layers className="h-4 w-4 mr-2 text-indigo-600" />
            Questions in this Paper ({paper.paperQuestions.length})
          </CardTitle>
          <span className="text-xs text-slate-400 font-mono">Total {paper.totalMarks} Marks</span>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {paper.paperQuestions.map((pq, idx) => {
            const snap = pq.questionSnapshot;
            return (
              <div
                key={pq.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white text-xs space-y-3 shadow-xs"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900">Q{idx + 1}.</span>
                    <span className="font-mono text-xs font-semibold text-indigo-600">
                      {snap?.customId || `Q-${idx + 1}`}
                    </span>
                    <Badge variant="default">{snap?.type?.toUpperCase()}</Badge>
                    {snap?.difficulty && (
                      <Badge variant="outline">{snap.difficulty.toUpperCase()}</Badge>
                    )}
                    {snap?.topic && <Badge variant="info">{snap.topic}</Badge>}
                  </div>
                  <span className="font-bold text-slate-800">
                    {pq.marks} mark{pq.marks === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Question Text */}
                <div
                  className="text-sm sm:text-base text-slate-900 font-medium leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: snap?.question?.text || "" }}
                />

                {/* Options with correct answer marked */}
                {snap?.options && snap.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {snap.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          opt.correct
                            ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span>
                          <strong>{opt.id}.</strong> {opt.text}
                        </span>
                        {opt.correct && (
                          <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center">
                            <Check className="h-3 w-3 mr-0.5" /> Correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* True/False or Numerical Answer */}
                {snap?.type === "true_false" && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-semibold">
                    Correct Answer: {snap.correctAnswer ? "TRUE" : "FALSE"}
                  </div>
                )}

                {snap?.type === "numerical" && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-semibold">
                    Correct Value: {typeof snap?.correctAnswer === "object" && snap?.correctAnswer !== null && "value" in snap.correctAnswer ? String((snap.correctAnswer as { value?: unknown }).value) : String(snap?.correctAnswer || "")}{" "}
                    {typeof snap?.correctAnswer === "object" && snap?.correctAnswer !== null && "unit" in snap.correctAnswer ? String((snap.correctAnswer as { unit?: unknown }).unit) : ""}
                  </div>
                )}

                {/* Explanation */}
                {snap?.explanation && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                    <strong>Explanation:</strong> {snap.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Past Exams Created from this Paper */}
      {paper.exams && paper.exams.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
            <CardTitle className="text-base font-bold flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-indigo-600" />
              Exams Created from this Question Paper ({paper.exams.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {paper.exams.map((ex) => (
                <div key={ex.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{ex.title}</h4>
                    <p className="text-slate-500 mt-0.5">
                      {ex.class.name} • Created on {new Date(ex.createdAt).toLocaleDateString()} • {ex._count.assignments} assigned students
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={ex.status === "ACTIVE" ? "success" : "default"}>{ex.status}</Badge>
                    <Link href={`/admin/exams/${ex.id}`}>
                      <Button size="sm" variant="outline" className="text-xs h-8">
                        View Exam
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
