"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Upload,
  ArrowLeft,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Eye,
  ListChecks,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImportPreviewResult } from "@/lib/services/exam-importer.service";

export default function ExamImportPage() {
  const [htmlContent, setHtmlContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{ paperId: string; paperCode: string; message: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setHtmlContent(content);
      handleValidate(content);
    };
    reader.readAsText(file);
  };

  const handleValidate = async (contentToValidate = htmlContent) => {
    setValidationError(null);
    setPreview(null);
    setImportSuccess(null);
    setImportError(null);

    if (!contentToValidate.trim()) {
      setValidationError("Please paste or upload HTML content.");
      return;
    }

    try {
      setIsValidating(true);
      const res = await fetch("/api/exams/import-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: contentToValidate }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setValidationError(data.error || "Failed to parse HTML.");
        setIsValidating(false);
        return;
      }

      setPreview(data.preview);
    } catch {
      setValidationError("Network error during validation.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview || !preview.isValid) return;

    try {
      setIsImporting(true);
      setImportError(null);

      const res = await fetch("/api/exams/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent,
          addToQuestionBank: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setImportError(data.error || "Failed to persist Question Paper.");
        setIsImporting(false);
        return;
      }

      setImportSuccess({
        paperId: data.paperId || data.examId,
        paperCode: data.paperCode || "QP-000001",
        message: data.message,
      });
    } catch {
      setImportError("Network error during paper import.");
    } finally {
      setIsImporting(false);
    }
  };

  const loadSampleExam = () => {
    const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="modern-learners-format" content="1.0">
  <title>Work, Energy & Power Test 1</title>
  <script type="application/json" id="modern-learners-exam">
  {
    "formatVersion": "1.0",
    "exam": {
      "title": "Work, Energy & Power Assessment 1",
      "class": 8,
      "subject": "Physics",
      "chapter": "Work, Energy & Power",
      "description": "ICSE Class 8 Physics conceptual assessment with numericals",
      "instructions": "Attempt all questions. Each correct MCQ awards 1 mark. Numericals award 2 marks.",
      "totalMarks": 5,
      "durationMinutes": 30,
      "passingPercentage": 80
    },
    "questions": [
      {
        "id": "PHY8-WEP-001",
        "type": "mcq",
        "topic": "Work",
        "difficulty": "easy",
        "marks": 1,
        "question": {
          "text": "What is the SI unit of work done?"
        },
        "options": [
          { "id": "A", "text": "Newton", "correct": false },
          { "id": "B", "text": "Joule", "correct": true },
          { "id": "C", "text": "Watt", "correct": false },
          { "id": "D", "text": "Pascal", "correct": false }
        ],
        "explanation": "Work is energy transferred, measured in Joules (J) in the SI system."
      },
      {
        "id": "PHY8-WEP-002",
        "type": "true_false",
        "topic": "Work",
        "difficulty": "easy",
        "marks": 1,
        "question": {
          "text": "Work done can be negative when force and displacement are in opposite directions."
        },
        "answer": true,
        "explanation": "Work = F * s * cos(180°) = -Fs, which is negative (e.g. friction)."
      },
      {
        "id": "PHY8-WEP-003",
        "type": "numerical",
        "topic": "Work",
        "difficulty": "medium",
        "marks": 2,
        "question": {
          "text": "A force of <strong>10 N</strong> moves an object through <strong>5 m</strong> in the direction of the force. Calculate the work done in Joules."
        },
        "answer": {
          "value": 50,
          "unit": "J",
          "tolerance": 0
        },
        "explanation": "W = Force × Displacement = 10 N × 5 m = 50 J."
      },
      {
        "id": "PHY8-WEP-004",
        "type": "multiple_correct",
        "topic": "Energy",
        "difficulty": "medium",
        "marks": 1,
        "question": {
          "text": "Which of the following are scalar quantities?"
        },
        "options": [
          { "id": "A", "text": "Work", "correct": true },
          { "id": "B", "text": "Kinetic Energy", "correct": true },
          { "id": "C", "text": "Force", "correct": false },
          { "id": "D", "text": "Velocity", "correct": false }
        ],
        "explanation": "Work and Energy have magnitude but no direction, hence they are scalar quantities."
      }
    ]
  }
  </script>
</head>
<body>
  <h1>Work, Energy & Power Assessment 1</h1>
</body>
</html>`;

    setFileName("sample-class8-physics.html");
    setHtmlContent(sampleHtml);
    handleValidate(sampleHtml);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/exams"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Exams
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
              <Upload className="h-6 w-6 mr-2 text-indigo-600" />
              HTML Exam Importer
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Import Modern Learners HTML Exam Format v1.0 papers with automatic question parsing and validation
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadSampleExam}
            className="space-x-1.5 self-start sm:self-auto text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>Load Sample Class 8 Paper</span>
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {importSuccess && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 shadow-sm animate-in fade-in">
          <div className="flex items-start space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  {importSuccess.paperCode}
                </span>
                <h3 className="text-base font-bold text-emerald-950 mt-1">Question Paper Successfully Created!</h3>
              </div>
              <p className="text-xs sm:text-sm text-emerald-800">{importSuccess.message}</p>
              <div className="pt-2 flex flex-wrap gap-2.5">
                <Link href={`/admin/papers/${importSuccess.paperId}`}>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Eye className="h-4 w-4 mr-1.5" />
                    Preview Question Paper
                  </Button>
                </Link>
                <Link href={`/admin/papers/${importSuccess.paperId}/create-exam`}>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create Exam from Paper
                  </Button>
                </Link>
                <Link href="/admin/papers">
                  <Button size="sm" variant="outline">
                    Question Papers Library
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Input Card */}
      {!importSuccess && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Upload / Paste */}
          <div className="lg:col-span-6 space-y-4">
            <Card>
              <CardHeader className="p-5 border-b border-slate-100">
                <CardTitle className="text-base font-bold flex items-center">
                  <FileCode className="h-4 w-4 mr-2 text-indigo-600" />
                  Upload or Paste HTML Exam
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* File Dropzone */}
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-6 text-center transition bg-slate-50/50">
                  <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    {fileName ? `Selected: ${fileName}` : "Upload .html question paper"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Modern Learners HTML Format v1.0
                  </p>
                  <label className="mt-3 inline-block">
                    <span className="cursor-pointer inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs">
                      Browse File
                    </span>
                    <input
                      type="file"
                      accept=".html,.htm"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Raw HTML Paste Area */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Or paste raw HTML markup:
                  </label>
                  <textarea
                    rows={10}
                    placeholder="<!DOCTYPE html>..."
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    onClick={() => handleValidate()}
                    isLoading={isValidating}
                    disabled={isValidating || !htmlContent.trim()}
                  >
                    Validate & Generate Preview
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Format Info Note */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900 flex items-start space-x-2.5">
              <HelpCircle className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-bold">Modern Learners Format Standard</p>
                <p className="text-indigo-700 mt-0.5">
                  The HTML file must declare format version 1.0 and contain the structured JSON payload in <code className="bg-indigo-100 px-1 py-0.5 rounded font-mono text-[11px]">&lt;script id=&quot;modern-learners-exam&quot;&gt;</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Validation & Preview */}
          <div className="lg:col-span-6 space-y-4">
            {validationError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start space-x-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {importError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start space-x-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {preview && (
              <Card>
                <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center">
                    <ListChecks className="h-4 w-4 mr-2 text-indigo-600" />
                    Exam Import Preview
                  </CardTitle>
                  {preview.isValid ? (
                    <Badge variant="success">✓ Validation Passed</Badge>
                  ) : (
                    <Badge variant="danger">Validation Errors Found</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  {/* Validation Error List */}
                  {preview.errors.length > 0 && (
                    <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 space-y-1">
                      <p className="font-bold flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1 text-rose-600" />
                        Please fix the following validation errors:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {preview.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Summary Card */}
                  {preview.examSummary && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900 text-sm">
                            {preview.examSummary.title}
                          </span>
                          <Badge variant="info">Class {preview.examSummary.classNumber}</Badge>
                        </div>
                        <p className="text-slate-600">
                          Subject: <strong>{preview.examSummary.subject}</strong>
                          {preview.examSummary.chapter && ` • Chapter: ${preview.examSummary.chapter}`}
                        </p>
                        <div className="flex flex-wrap gap-4 pt-1 text-slate-500 font-medium">
                          <span>Questions: <strong>{preview.examSummary.totalQuestions}</strong></span>
                          <span>Total Marks: <strong>{preview.examSummary.totalMarks}</strong></span>
                          <span>Duration: <strong>{preview.examSummary.durationMinutes} mins</strong></span>
                          <span>Passing: <strong>{preview.examSummary.passingPercentage}%</strong></span>
                        </div>
                      </div>

                      {/* Question Breakdown Chips */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {Object.entries(preview.statistics.typeCounts).map(([type, cnt]) => (
                          <span
                            key={type}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium text-[11px]"
                          >
                            {type.toUpperCase()}: {cnt}
                          </span>
                        ))}
                        {Object.entries(preview.statistics.difficultyCounts).map(
                          ([diff, cnt]) =>
                            cnt > 0 && (
                              <span
                                key={diff}
                                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-medium text-[11px]"
                              >
                                {diff.toUpperCase()}: {cnt}
                              </span>
                            )
                        )}
                      </div>

                      {/* Questions Preview Accordion / List */}
                      {preview.sanitizedPayload && (
                        <div className="space-y-2 pt-2">
                          <p className="text-xs font-bold text-slate-800">
                            Parsed Questions ({preview.sanitizedPayload.questions.length}):
                          </p>
                          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                            {preview.sanitizedPayload.questions.map((q, idx) => (
                              <div
                                key={q.id}
                                className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1.5"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-mono font-bold text-indigo-600">
                                    #{idx + 1} {q.id}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {q.type.toUpperCase()} • {q.marks} mark{q.marks === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <div
                                  className="text-slate-800 font-medium"
                                  dangerouslySetInnerHTML={{ __html: q.question.text }}
                                />
                                {q.options && q.options.length > 0 && (
                                  <div className="space-y-0.5 pl-2 text-[11px] text-slate-600">
                                    {q.options.map((opt) => (
                                      <p
                                        key={opt.id}
                                        className={opt.correct ? "font-bold text-emerald-700" : ""}
                                      >
                                        {opt.id}. {opt.text} {opt.correct && "✓ (Correct)"}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      {preview.isValid && (
                        <div className="pt-3">
                          <Button
                            type="button"
                            className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
                            isLoading={isImporting}
                            disabled={isImporting}
                            onClick={handleConfirmImport}
                          >
                            Confirm & Import Exam to Database
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
