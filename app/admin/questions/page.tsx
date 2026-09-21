"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  HelpCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestionOptionItem {
  id: string;
  optionKey: string;
  optionText: string;
  isCorrect: boolean;
}

interface QuestionItem {
  id: string;
  customId: string | null;
  questionType: string;
  difficulty: string;
  questionText: string;
  explanation: string | null;
  defaultMarks: number;
  class: { classNumber: number; name: string } | null;
  subject: { name: string; code: string } | null;
  chapter: { name: string } | null;
  topic: { name: string } | null;
  options: QuestionOptionItem[];
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search.trim()) params.append("search", search.trim());
      if (classFilter !== "all") params.append("classNumber", classFilter);
      if (typeFilter !== "all") params.append("questionType", typeFilter);
      if (difficultyFilter !== "all") params.append("difficulty", difficultyFilter);

      const res = await fetch(`/api/questions?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setQuestions(data.questions);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, classFilter, typeFilter, difficultyFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuestions(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchQuestions]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <HelpCircle className="h-6 w-6 mr-2 text-indigo-600" />
            Question Bank
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse and manage questions across subjects, chapters, topics, and difficulties
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by keyword, topic or Question ID (e.g. PHY8-WEP-001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-300 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Classes</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Question Types</option>
              <option value="MCQ">MCQ</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="MULTIPLE_CORRECT">Multiple Correct</option>
              <option value="NUMERICAL">Numerical</option>
            </select>

            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            Total Questions: {pagination.total}
          </CardTitle>
          {pagination.total > 0 && (
            <span className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {isLoading ? (
            <p className="text-center py-10 text-xs text-slate-400">Loading questions...</p>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm text-slate-700">No questions found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload an HTML exam paper to automatically populate the Question Bank.
              </p>
            </div>
          ) : (
            questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2.5 shadow-xs"
              >
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">
                      #{(pagination.page - 1) * pagination.limit + idx + 1}
                    </span>
                    <span className="font-mono text-xs font-semibold text-indigo-600">
                      {q.customId || "Q-" + q.id.slice(0, 8)}
                    </span>
                    {q.class && <Badge variant="info">Class {q.class.classNumber}</Badge>}
                    {q.subject && (
                      <span className="font-semibold text-slate-700">{q.subject.name}</span>
                    )}
                    <Badge variant="default">{q.questionType}</Badge>
                    <Badge variant="outline">{q.difficulty}</Badge>
                  </div>
                  <span className="font-bold text-slate-800">
                    {q.defaultMarks} mark{q.defaultMarks === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Question Text */}
                <div
                  className="text-slate-900 font-medium text-sm"
                  dangerouslySetInnerHTML={{ __html: q.questionText }}
                />

                {/* Options */}
                {q.options && q.options.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                          opt.isCorrect
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span>
                          <strong>{opt.optionKey}.</strong> {opt.optionText}
                        </span>
                        {opt.isCorrect && (
                          <span className="text-[10px] uppercase font-bold text-emerald-700">
                            ✓ Correct
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} questions
              </span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchQuestions(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchQuestions(pagination.page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
