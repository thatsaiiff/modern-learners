"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Layers,
  Send,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

interface OptionItem {
  id: string;
  text: string;
}

interface QuestionItem {
  id: string;
  questionKey: string;
  displayOrder: number;
  customId?: string;
  type: string;
  topic?: string;
  difficulty?: string;
  marks: number;
  question: { text: string; image?: { src: string; alt?: string; width?: number } };
  options?: OptionItem[];
  currentAnswer?: {
    selectedOptions?: string[];
    answerText?: string;
    numericAnswer?: number;
  } | null;
}

interface AttemptDelivery {
  attemptId: string;
  examId: string;
  examTitle: string;
  className: string;
  subjectName: string;
  instructions: string | null;
  attemptNumber: number;
  status: string;
  startedAt: string;
  serverDeadline: string;
  durationMinutes: number;
  remainingSeconds: number;
  totalQuestions: number;
  questions: QuestionItem[];
}

export default function StudentExamRoomPage() {
  const params = useParams();
  const examId = params.id as string;

  // Exam / Attempt state
  const [attemptData, setAttemptData] = useState<AttemptDelivery | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOptions?: string[]; answerText?: string; numericAnswer?: number }>>({});
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "offline">("saved");

  // Modals
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionComplete, setSubmissionComplete] = useState<boolean>(false);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load & Attempt Check
  const initializeExam = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      // Check if attempt already exists or if we should fetch instructions
      const res = await fetch(`/api/student/exams/${examId}/start`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoadError(data.error || "Unable to enter examination.");
        setIsLoading(false);
        return;
      }

      const delivery: AttemptDelivery = data.data;
      setAttemptData(delivery);
      setRemainingTime(delivery.remainingSeconds);

      // Populate existing answers
      const initialAnswers: Record<string, { selectedOptions?: string[]; answerText?: string; numericAnswer?: number }> = {};
      delivery.questions.forEach((q) => {
        if (q.currentAnswer) {
          initialAnswers[q.questionKey] = q.currentAnswer;
        }
      });
      setAnswers(initialAnswers);

      if (delivery.status === "SUBMITTED" || delivery.status === "AUTO_SUBMITTED") {
        setSubmissionComplete(true);
      }
    } catch (err) {
      console.error("Exam init error:", err);
      setLoadError("Network error while connecting to exam server.");
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    initializeExam();
  }, [initializeExam]);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setSaveStatus("saved");
    const handleOffline = () => setSaveStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Submission handler
  const handleSubmitExam = useCallback(async (auto = false) => {
    if (!attemptData || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/student/attempts/${attemptData.attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoSubmitted: auto }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmissionComplete(true);
        setIsSubmitModalOpen(false);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Submission failed. Retrying...");
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptData, isSubmitting]);

  // Authoritative Timer countdown
  useEffect(() => {
    if (!attemptData || remainingTime <= 0 || submissionComplete) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [attemptData, remainingTime, submissionComplete, handleSubmitExam]);

  // Autosave function
  const triggerSaveAnswer = async (
    questionKey: string,
    answerPayload: { selectedOptions?: string[]; answerText?: string; numericAnswer?: number }
  ) => {
    if (!attemptData || submissionComplete) return;

    setSaveStatus("saving");

    try {
      const res = await fetch(`/api/student/attempts/${attemptData.attemptId}/answers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: questionKey,
          ...answerPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.error && data.error.includes("expired")) {
          setSubmissionComplete(true);
          alert("Your exam time has expired. Your attempt has been submitted.");
        }
        setSaveStatus("offline");
        return;
      }

      setSaveStatus("saved");
    } catch {
      setSaveStatus("offline");
    }
  };

  // Option selection handlers
  const handleSelectOption = (questionKey: string, optionId: string, isMultiple = false) => {
    setAnswers((prev) => {
      const current = prev[questionKey]?.selectedOptions || [];
      let nextSelected: string[] = [];

      if (isMultiple) {
        if (current.includes(optionId)) {
          nextSelected = current.filter((id) => id !== optionId);
        } else {
          nextSelected = [...current, optionId];
        }
      } else {
        nextSelected = [optionId];
      }

      const updated = {
        ...prev,
        [questionKey]: {
          ...prev[questionKey],
          selectedOptions: nextSelected,
        },
      };

      // Debounced save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        triggerSaveAnswer(questionKey, { selectedOptions: nextSelected });
      }, 300);

      return updated;
    });
  };

  const handleTrueFalseSelect = (questionKey: string, val: boolean) => {
    const opt = val ? ["true"] : ["false"];
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [questionKey]: {
          ...prev[questionKey],
          selectedOptions: opt,
        },
      };

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        triggerSaveAnswer(questionKey, { selectedOptions: opt });
      }, 300);

      return updated;
    });
  };

  const handleNumericalChange = (questionKey: string, value: string) => {
    const num = value.trim() === "" ? undefined : parseFloat(value);
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [questionKey]: {
          ...prev[questionKey],
          numericAnswer: num,
        },
      };

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        triggerSaveAnswer(questionKey, { numericAnswer: num });
      }, 500);

      return updated;
    });
  };

  const clearCurrentResponse = (questionKey: string) => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionKey];
      triggerSaveAnswer(questionKey, { selectedOptions: [], answerText: undefined, numericAnswer: undefined });
      return next;
    });
  };

  // Format remaining time MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-600">Connecting to secure exam room...</p>
      </div>
    );
  }

  if (loadError) {
    const isIneligible = loadError.toLowerCase().includes("not eligible");

    return (
      <div className="max-w-lg mx-auto my-12 p-6 sm:p-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-md text-center space-y-4 animate-in fade-in">
        {isIneligible ? (
          <div className="h-14 w-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="h-8 w-8" />
          </div>
        ) : (
          <div className="h-14 w-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="h-8 w-8" />
          </div>
        )}
        <div className="space-y-1">
          <h3 className="font-extrabold text-lg text-slate-900">
            {isIneligible ? "Not Eligible for Examination" : "Cannot Access Exam"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">{loadError}</p>
        </div>
        {isIneligible && (
          <p className="text-[11px] text-slate-400">
            If you believe this status is in error, please contact Saif Sir.
          </p>
        )}
        <div className="pt-2">
          <Link href="/student">
            <Button variant="outline" size="sm" className="h-10 px-4">
              Return to Student Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Submission Complete View
  if (submissionComplete) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white rounded-2xl border border-emerald-200 shadow-sm text-center space-y-5">
        <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Examination Submitted!</h2>
          <p className="text-xs text-slate-500 mt-1">
            Your answers have been securely submitted and recorded.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-600 space-y-1">
          <p>
            Exam: <strong>{attemptData?.examTitle}</strong>
          </p>
          <p>
            Subject: <strong>{attemptData?.subjectName}</strong>
          </p>
        </div>
        <div className="pt-2">
          <Link href="/student">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
              Return to Student Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!attemptData || attemptData.questions.length === 0) {
    return null;
  }

  const currentQ = attemptData.questions[currentIndex];
  const currentAnswer = answers[currentQ.questionKey];
  const answeredCount = Object.keys(answers).filter(
    (k) =>
      (answers[k]?.selectedOptions && answers[k].selectedOptions!.length > 0) ||
      answers[k]?.numericAnswer !== undefined
  ).length;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-24 sm:pb-8">
      {/* Multi-Tier Responsive Mobile Command Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-sm space-y-2.5">
        {/* Tier 1: Exam Title + Authoritative Timer */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {currentIndex + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate leading-tight">
                {attemptData.examTitle}
              </h3>
              <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider block sm:inline">
                {attemptData.subjectName} • Class {attemptData.className}
              </span>
            </div>
          </div>

          {/* Authoritative Countdown Timer */}
          <div
            className={`flex items-center font-mono font-bold text-xs sm:text-sm px-3 py-1.5 rounded-xl border shrink-0 tabular-nums ${
              remainingTime <= 60
                ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse"
                : remainingTime <= 300
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-slate-100 border-slate-200 text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            <span>{formatTime(remainingTime)}</span>
          </div>
        </div>

        {/* Tier 2: Progress Indicator + Autosave Status + Question Palette Button */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700 text-[11px] tabular-nums">
              Q{currentIndex + 1} of {attemptData.totalQuestions}
            </span>
            <div className="w-16 xs:w-24 sm:w-36 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{
                  width: `${((currentIndex + 1) / attemptData.totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Autosave Pill */}
            <div className="flex items-center text-[11px] font-medium">
              {saveStatus === "saving" && (
                <span className="text-amber-600 flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping mr-1.5" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-emerald-700 flex items-center font-bold">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Saved
                </span>
              )}
              {saveStatus === "offline" && (
                <span className="text-rose-600 flex items-center font-bold">
                  <WifiOff className="h-3.5 w-3.5 mr-1" />
                  Offline
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPaletteOpen(true)}
              className="space-x-1 text-[11px] h-8 px-2.5"
            >
              <Layers className="h-3 w-3" />
              <span>Palette</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900 text-sm">
              Question {currentIndex + 1}
            </span>
            <Badge variant="info">{currentQ.type.toUpperCase()}</Badge>
            {currentQ.topic && <Badge variant="outline">{currentQ.topic}</Badge>}
          </div>
          <span className="text-xs font-bold text-slate-700">
            {currentQ.marks} Mark{currentQ.marks === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Question Text (Sanitized) */}
          <div
            className="text-base sm:text-lg text-slate-900 font-medium leading-relaxed"
            dangerouslySetInnerHTML={{ __html: currentQ.question.text }}
          />

          {/* Image if present */}
          {currentQ.question.image && (
            <div className="my-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentQ.question.image.src}
                alt={currentQ.question.image.alt || "Question diagram"}
                className="max-h-64 rounded-xl border border-slate-200 object-contain mx-auto"
              />
            </div>
          )}

          {/* Interactive Option Selectors by Question Type */}
          {/* 1. MCQ & Multiple Correct */}
          {(currentQ.type === "mcq" || currentQ.type === "multiple_correct") && currentQ.options && (
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt) => {
                const isSelected = currentAnswer?.selectedOptions?.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      handleSelectOption(currentQ.questionKey, opt.id, currentQ.type === "multiple_correct")
                    }
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between min-h-[52px] ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-semibold shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {opt.id}
                      </div>
                      <span className="text-sm sm:text-base leading-snug">{opt.text}</span>
                    </div>

                    {isSelected && <Check className="h-5 w-5 text-indigo-600 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. True / False */}
          {currentQ.type === "true_false" && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleTrueFalseSelect(currentQ.questionKey, true)}
                className={`p-5 min-h-[56px] rounded-2xl border-2 text-center font-extrabold text-base sm:text-lg transition-all ${
                  currentAnswer?.selectedOptions?.includes("true")
                    ? "bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                TRUE
              </button>
              <button
                type="button"
                onClick={() => handleTrueFalseSelect(currentQ.questionKey, false)}
                className={`p-5 min-h-[56px] rounded-2xl border-2 text-center font-extrabold text-base sm:text-lg transition-all ${
                  currentAnswer?.selectedOptions?.includes("false")
                    ? "bg-rose-50 border-rose-600 text-rose-950 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                FALSE
              </button>
            </div>
          )}

          {/* 3. Numerical Answer */}
          {currentQ.type === "numerical" && (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Enter Numerical Answer Value:
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 50"
                value={currentAnswer?.numericAnswer !== undefined ? currentAnswer.numericAnswer : ""}
                onChange={(e) => handleNumericalChange(currentQ.questionKey, e.target.value)}
                className="h-13 min-h-[52px] w-full max-w-sm rounded-xl border border-slate-300 bg-white px-4 font-mono text-lg text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 tabular-nums"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation & Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 flex items-center justify-between gap-2 shadow-xs">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex <= 0}
          onClick={() => setCurrentIndex((prev) => prev - 1)}
          className="space-x-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>

        <button
          type="button"
          onClick={() => clearCurrentResponse(currentQ.questionKey)}
          className="text-xs text-slate-500 hover:text-rose-600 font-medium transition"
        >
          Clear Response
        </button>

        <div className="flex items-center space-x-2">
          {currentIndex < attemptData.totalQuestions - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="space-x-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsSubmitModalOpen(true)}
              className="space-x-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Submit Exam</span>
            </Button>
          )}
        </div>
      </div>

      {/* Question Palette Modal */}
      <Modal
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        title="Question Palette"
        description={`${answeredCount} of ${attemptData.totalQuestions} questions answered`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 pt-2">
            {attemptData.questions.map((q, idx) => {
              const hasAns =
                (answers[q.questionKey]?.selectedOptions &&
                  answers[q.questionKey].selectedOptions!.length > 0) ||
                answers[q.questionKey]?.numericAnswer !== undefined;
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsPaletteOpen(false);
                  }}
                  className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    isCurrent
                      ? "ring-2 ring-indigo-600 ring-offset-2 bg-indigo-600 text-white"
                      : hasAns
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-emerald-300 mr-1.5" /> Answered
            </span>
            <span className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-slate-200 mr-1.5" /> Unanswered
            </span>
            <span className="flex items-center">
              <span className="h-3 w-3 rounded-full bg-indigo-600 mr-1.5" /> Current
            </span>
          </div>

          <div className="pt-2">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setIsPaletteOpen(false);
                setIsSubmitModalOpen(true);
              }}
            >
              Finish & Submit Exam
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manual Submit Confirmation Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Examination"
        description="Are you sure you want to submit your final examination answers?"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Total Questions:</span>
              <strong className="text-slate-900">{attemptData.totalQuestions}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Answered Questions:</span>
              <strong className="text-emerald-700">{answeredCount}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unanswered Questions:</span>
              <strong className="text-amber-700">
                {attemptData.totalQuestions - answeredCount}
              </strong>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500">Time Remaining:</span>
              <strong className="font-mono text-indigo-700">{formatTime(remainingTime)}</strong>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSubmitModalOpen(false)}
              disabled={isSubmitting}
            >
              Continue Exam
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              onClick={() => handleSubmitExam(false)}
            >
              Confirm Final Submission
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
