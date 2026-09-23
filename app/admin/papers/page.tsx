"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Upload,
  Copy,
  Archive,
  Eye,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuestionPaperItem {
  id: string;
  paperCode: string;
  title: string;
  description: string | null;
  class: { classNumber: number; name: string };
  subject: { name: string; code: string };
  chapter: string | null;
  topic: string | null;
  totalQuestions: number;
  totalMarks: number;
  sourceType: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  creator: { name: string } | null;
  _count: {
    paperQuestions: number;
    exams: number;
  };
}

export default function QuestionPapersLibraryPage() {
  const [papers, setPapers] = useState<QuestionPaperItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPapers = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search.trim()) params.append("search", search.trim());
      if (classFilter !== "all") params.append("classNumber", classFilter);
      if (subjectFilter !== "all") params.append("subjectCode", subjectFilter);

      const res = await fetch(`/api/papers?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setPapers(data.papers);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to load question papers:", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, classFilter, subjectFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPapers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPapers]);

  const handleDuplicate = async (paperId: string, paperCode: string) => {
    if (!confirm(`Duplicate Question Paper ${paperCode}?`)) return;

    try {
      const res = await fetch(`/api/papers/${paperId}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        fetchPapers(pagination.page);
      } else {
        alert(data.error || "Failed to duplicate paper.");
      }
    } catch {
      alert("Network error.");
    }
  };

  const handleArchive = async (paperId: string, paperCode: string) => {
    if (!confirm(`Are you sure you want to archive Question Paper ${paperCode}?`)) return;

    try {
      const res = await fetch(`/api/papers/${paperId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchPapers(pagination.page);
      } else {
        alert(data.error || "Failed to archive paper.");
      }
    } catch {
      alert("Network error.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center">
            <FileText className="h-6 w-6 mr-2 text-indigo-600" />
            Question Papers Library
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Curated, reusable question papers with permanent IDs (QP-XXXXXX)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/admin/exams/import">
            <Button size="sm" className="space-x-1.5 bg-indigo-600 hover:bg-indigo-700">
              <Upload className="h-4 w-4" />
              <span>Import HTML Paper</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, topic, or paper code (e.g. QP-000001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-sm focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Classes</option>
              <option value="6">Class 6</option>
              <option value="7">Class 7</option>
              <option value="8">Class 8</option>
              <option value="9">Class 9</option>
              <option value="10">Class 10</option>
            </select>

            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-indigo-600 focus:outline-none"
            >
              <option value="all">All Subjects</option>
              <option value="PHY">Physics</option>
              <option value="MAT">Mathematics</option>
              <option value="CHEM">Chemistry</option>
              <option value="BIO">Biology</option>
              <option value="COMP">Computer Applications</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Papers List */}
      <Card>
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800">
            Total Question Papers: <span className="tabular-nums">{pagination.total}</span>
          </CardTitle>
          {pagination.total > 0 && (
            <span className="text-xs text-slate-400 font-medium tabular-nums">
              Page {pagination.page} of {pagination.totalPages}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <div className="h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading question papers...
            </div>
          ) : papers.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-700">No question papers found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Import an HTML paper to create your first reusable question paper.
              </p>
              <Link href="/admin/exams/import" className="inline-block mt-3">
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4 mr-1.5" />
                  Import HTML Paper
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Card List (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {papers.map((p) => (
                  <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/70 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-indigo-700 tabular-nums">
                            {p.paperCode}
                          </span>
                          <Badge variant="info">Class {p.class.classNumber}</Badge>
                          <span className="text-xs text-slate-700 font-semibold">{p.subject.name}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">{p.title}</h4>
                        {p.chapter && (
                          <p className="text-[11px] text-slate-500">Chapter: {p.chapter}</p>
                        )}
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1 font-medium tabular-nums">
                          <span>{p.totalQuestions} Questions</span>
                          <span>•</span>
                          <span>{p.totalMarks} Marks</span>
                          <span>•</span>
                          <span>{p._count.exams} Exam(s) Created</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-1.5 pt-2 border-t border-slate-100">
                      <Link href={`/admin/papers/${p.id}`}>
                        <Button size="sm" variant="outline" className="h-9 px-3 text-xs space-x-1">
                          <Eye className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Preview</span>
                        </Button>
                      </Link>
                      <Link href={`/admin/papers/${p.id}/create-exam`}>
                        <Button size="sm" className="h-9 px-3 text-xs space-x-1 bg-indigo-600 hover:bg-indigo-700">
                          <Plus className="h-3.5 w-3.5" />
                          <span>Create Exam</span>
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(p.id, p.paperCode)}
                        className="h-9 px-2.5 text-xs text-slate-600"
                        title="Duplicate Paper"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArchive(p.id, p.paperCode)}
                        className="h-9 px-2.5 text-xs text-rose-600 hover:bg-rose-50"
                        title="Archive Paper"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3.5">Paper Code</th>
                      <th className="px-4 py-3.5">Title</th>
                      <th className="px-4 py-3.5">Class & Subject</th>
                      <th className="px-4 py-3.5">Questions</th>
                      <th className="px-4 py-3.5">Marks</th>
                      <th className="px-4 py-3.5">Exams Created</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {papers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-indigo-700 tabular-nums">
                          {p.paperCode}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 block">{p.title}</span>
                          {p.chapter && <span className="text-[11px] text-slate-400">{p.chapter}</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="info">Class {p.class.classNumber}</Badge>
                          <span className="text-xs text-slate-700 ml-2 font-medium">{p.subject.name}</span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-800 tabular-nums">
                          {p.totalQuestions} Qs
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-800 tabular-nums">{p.totalMarks}</td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium tabular-nums">
                          {p._count.exams} instance(s)
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5">
                          <Link href={`/admin/papers/${p.id}`}>
                            <button
                              title="Preview Paper"
                              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition min-h-[36px] min-w-[36px]"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link href={`/admin/papers/${p.id}/create-exam`}>
                            <button
                              title="Create Exam from Paper"
                              className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition min-h-[36px] min-w-[36px] font-bold text-xs"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDuplicate(p.id, p.paperCode)}
                            title="Duplicate Paper"
                            className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition min-h-[36px] min-w-[36px]"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleArchive(p.id, p.paperCode)}
                            title="Archive Paper"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition min-h-[36px] min-w-[36px]"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} papers
              </span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchPapers(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchPapers(pagination.page + 1)}
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
