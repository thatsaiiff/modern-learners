import prisma from "@/lib/prisma";
import { AttendanceStatus } from "@prisma/client";
import { logAudit } from "./audit.service";
import { determineGrade } from "./grading.service";

interface SnapshotTopicData {
  customId?: string;
  topic?: string;
}

export interface ReportCardData {
  academy: {
    name: string;
    brandSubtitle: string;
    reportTitle: string;
    generatedAt: string;
  };
  student: {
    id: string;
    name: string;
    studentCode: string;
    rollNumber: string;
    className: string;
    classNumber: number;
    sessionName: string;
    joinedAt: string;
    status: string;
  };
  performanceSummary: {
    overallAverage: number | null;
    passRate: number | null;
    testsAttempted: number;
    testsPassed: number;
    testsFailed: number;
    highestScore: number | null;
    lowestScore: number | null;
    grade: string;
    performanceLabel: string;
  };
  attendanceSummary: {
    totalSessions: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    attendancePercentage: number;
  };
  subjectBreakdown: Array<{
    code: string;
    name: string;
    testsCount: number;
    averagePercentage: number;
    passRate: number;
    highestScore: number;
    lowestScore: number;
    grade: string;
  }>;
  recentExams: Array<{
    date: string;
    title: string;
    subjectName: string;
    score: number;
    maxMarks: number;
    percentage: number;
    grade: string;
    passed: boolean;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  teacherRemark: {
    remark: string;
    authorName?: string;
    updatedAt?: string;
  } | null;
  academicHistory: Array<{
    sessionName: string;
    className: string;
    rollNumber: string;
    status: string;
  }>;
}

export async function getStudentReportCardData(
  studentId: string,
  sessionId?: string,
  actor?: { studentId?: string; isAdmin?: boolean }
): Promise<ReportCardData> {
  // Authorization check
  if (!actor?.isAdmin && actor?.studentId !== studentId) {
    throw new Error("Unauthorized access to report card.");
  }

  // Resolve target session
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const active = await prisma.academicSession.findFirst({ where: { isActive: true } });
    targetSessionId = active?.id;
  }

  const [student, targetSession, remarkRecord] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: { class: true, academicSession: true },
          orderBy: { createdAt: "desc" },
        },
        results: {
          where: {
            isOfficial: true,
            ...(targetSessionId
              ? {
                  exam: {
                    // Match exam class or session if applicable
                  },
                }
              : {}),
          },
          include: {
            exam: { include: { subject: true, class: true } },
            attempt: {
              include: {
                attemptQuestions: true,
                attemptAnswers: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        attendanceRecords: {
          include: {
            session: { include: { class: true } },
          },
        },
      },
    }),
    prisma.academicSession.findUnique({
      where: { id: targetSessionId },
    }),
    targetSessionId
      ? prisma.teacherRemark.findUnique({
          where: {
            studentId_academicSessionId: {
              studentId,
              academicSessionId: targetSessionId,
            },
          },
          include: { author: { select: { name: true } } },
        })
      : null,
  ]);

  if (!student) {
    throw new Error("Student record not found.");
  }

  const activeEnrollment =
    student.enrollments.find(
      (e) => e.status === "ACTIVE" || (targetSessionId && e.academicSessionId === targetSessionId)
    ) || student.enrollments[0];

  const results = student.results;
  const testsCount = results.length;

  let totalPctSum = 0;
  let passedCount = 0;
  let highest = -1;
  let lowest = 999;

  for (const r of results) {
    totalPctSum += r.percentage;
    if (r.passed) passedCount++;
    if (r.percentage > highest) highest = r.percentage;
    if (r.percentage < lowest) lowest = r.percentage;
  }

  const overallAverage = testsCount > 0 ? parseFloat((totalPctSum / testsCount).toFixed(1)) : null;
  const passRate = testsCount > 0 ? parseFloat(((passedCount / testsCount) * 100).toFixed(1)) : null;
  const { grade, performanceLabel } = determineGrade(overallAverage || 0, []);

  // Subject Breakdown
  const subjectMap: Record<
    string,
    { name: string; code: string; scores: number[]; passed: number }
  > = {};

  for (const r of results) {
    const sCode = r.exam.subject.code;
    if (!subjectMap[sCode]) {
      subjectMap[sCode] = { name: r.exam.subject.name, code: sCode, scores: [], passed: 0 };
    }
    subjectMap[sCode].scores.push(r.percentage);
    if (r.passed) subjectMap[sCode].passed++;
  }

  const subjectBreakdown = Object.values(subjectMap).map((sub) => {
    const count = sub.scores.length;
    const avg = parseFloat((sub.scores.reduce((a, b) => a + b, 0) / count).toFixed(1));
    const sPass = parseFloat(((sub.passed / count) * 100).toFixed(1));
    const { grade: sGrade } = determineGrade(avg, []);
    return {
      code: sub.code,
      name: sub.name,
      testsCount: count,
      averagePercentage: avg,
      passRate: sPass,
      highestScore: Math.max(...sub.scores),
      lowestScore: Math.min(...sub.scores),
      grade: sGrade,
    };
  });

  // Attendance Summary
  const attendanceRecords = student.attendanceRecords;
  const totalAttSessions = attendanceRecords.length;
  let presentAtt = 0;
  let lateAtt = 0;
  let absentAtt = 0;

  for (const ar of attendanceRecords) {
    if (ar.status === AttendanceStatus.PRESENT) presentAtt++;
    else if (ar.status === AttendanceStatus.LATE) lateAtt++;
    else if (ar.status === AttendanceStatus.ABSENT) absentAtt++;
  }

  const attendancePercentage =
    totalAttSessions > 0
      ? parseFloat((((presentAtt + lateAtt) / totalAttSessions) * 100).toFixed(1))
      : 100.0;

  // Strengths & Improvement Areas Analysis
  const topicStats: Record<string, { total: number; correct: number }> = {};
  for (const r of results) {
    const ansMap = new Map(r.attempt.attemptAnswers.map((a) => [a.questionId, a]));
    for (const aq of r.attempt.attemptQuestions) {
      const snap = aq.questionSnapshot as unknown as SnapshotTopicData;
      if (snap?.topic) {
        const t = snap.topic.trim();
        if (!topicStats[t]) topicStats[t] = { total: 0, correct: 0 };
        topicStats[t].total++;
        const ans = ansMap.get(aq.questionId || snap?.customId || aq.id);
        if (ans?.isCorrect) topicStats[t].correct++;
      }
    }
  }

  const strengths: string[] = [];
  const areasForImprovement: string[] = [];

  // Subject level
  for (const sub of subjectBreakdown) {
    if (sub.averagePercentage >= 85) {
      strengths.push(`Strong conceptual grasp and performance in ${sub.name} (${sub.averagePercentage}% average).`);
    } else if (sub.averagePercentage < 75) {
      areasForImprovement.push(`Needs dedicated revision in ${sub.name} (current average: ${sub.averagePercentage}%).`);
    }
  }

  // Topic level
  for (const [tName, tData] of Object.entries(topicStats)) {
    if (tData.total >= 3) {
      const acc = (tData.correct / tData.total) * 100;
      if (acc >= 85) {
        strengths.push(`High accuracy in topic '${tName}' (${acc.toFixed(0)}%).`);
      } else if (acc < 70) {
        areasForImprovement.push(`Focus practice on topic '${tName}' (accuracy: ${acc.toFixed(0)}%).`);
      }
    }
  }

  if (strengths.length === 0 && testsCount > 0) {
    strengths.push("Consistent effort in scheduled academic assessments.");
  }
  if (areasForImprovement.length === 0 && testsCount > 0) {
    areasForImprovement.push("Maintain current standard of preparation and problem-solving.");
  }

  // Recent 5 Exams
  const recentExams = results.slice(0, 5).map((r) => ({
    date: r.createdAt.toISOString().slice(0, 10),
    title: r.exam.title,
    subjectName: r.exam.subject.name,
    score: r.rawMarks,
    maxMarks: r.maximumMarks,
    percentage: r.percentage,
    grade: r.grade,
    passed: r.passed,
  }));

  // Academic History
  const academicHistory = student.enrollments.map((enr) => ({
    sessionName: enr.academicSession.name,
    className: enr.class.name,
    rollNumber: enr.rollNumber,
    status: enr.status,
  }));

  return {
    academy: {
      name: "Modern Learners — Saif Classes",
      brandSubtitle: "Tuition Academic Management & Performance Evaluation",
      reportTitle: "Official Academic Student Report Card",
      generatedAt: new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
    student: {
      id: student.id,
      name: student.name,
      studentCode: student.studentCode,
      rollNumber: activeEnrollment?.rollNumber || "N/A",
      className: activeEnrollment?.class?.name || "N/A",
      classNumber: activeEnrollment?.class?.classNumber || 8,
      sessionName: targetSession?.name || activeEnrollment?.academicSession?.name || "2026-27",
      joinedAt: student.joinedAt.toLocaleDateString("en-IN"),
      status: student.status,
    },
    performanceSummary: {
      overallAverage,
      passRate,
      testsAttempted: testsCount,
      testsPassed: passedCount,
      testsFailed: testsCount - passedCount,
      highestScore: highest >= 0 ? highest : null,
      lowestScore: lowest <= 100 ? lowest : null,
      grade,
      performanceLabel,
    },
    attendanceSummary: {
      totalSessions: totalAttSessions,
      presentCount: presentAtt,
      lateCount: lateAtt,
      absentCount: absentAtt,
      attendancePercentage,
    },
    subjectBreakdown,
    recentExams,
    strengths,
    areasForImprovement,
    teacherRemark: remarkRecord
      ? {
          remark: remarkRecord.remark,
          authorName: remarkRecord.author?.name,
          updatedAt: remarkRecord.updatedAt.toLocaleDateString("en-IN"),
        }
      : null,
    academicHistory,
  };
}

export async function saveTeacherRemark(
  studentId: string,
  sessionId: string,
  remark: string,
  authorId: string,
  ipAddress?: string | null
) {
  if (!remark || remark.trim().length === 0) {
    throw new Error("Remark cannot be empty.");
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error("Student not found.");

  const record = await prisma.teacherRemark.upsert({
    where: {
      studentId_academicSessionId: {
        studentId,
        academicSessionId: sessionId,
      },
    },
    update: {
      remark: remark.trim(),
      authorId,
      updatedAt: new Date(),
    },
    create: {
      studentId,
      academicSessionId: sessionId,
      remark: remark.trim(),
      authorId,
    },
  });

  await logAudit({
    actorId: authorId,
    actorRole: "ADMIN",
    action: "TEACHER_REMARK_UPDATED",
    entityType: "TeacherRemark",
    entityId: record.id,
    newValue: {
      studentCode: student.studentCode,
      remark,
    },
    ipAddress,
  });

  return record;
}

/**
 * Escapes CSV values conforming strictly to RFC-4180
 */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates formatted CSV string for various report datasets
 */
export async function generateCsvExport(
  type: "results" | "attendance" | "class_summary" | "leaderboard",
  filters: { classNumber?: number; subjectCode?: string; studentId?: string }
): Promise<string> {
  if (type === "results") {
    const results = await prisma.result.findMany({
      where: {
        isOfficial: true,
        ...(filters.classNumber ? { exam: { class: { classNumber: filters.classNumber } } } : {}),
        ...(filters.subjectCode ? { exam: { subject: { code: filters.subjectCode.toUpperCase() } } } : {}),
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
      },
      include: {
        student: {
          include: {
            enrollments: { where: { status: "ACTIVE" }, include: { class: true } },
          },
        },
        exam: { include: { subject: true, class: true } },
        attempt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Submission Date",
      "Student ID",
      "Student Name",
      "Roll Number",
      "Class",
      "Subject",
      "Exam Title",
      "Attempt No",
      "Raw Score",
      "Max Marks",
      "Percentage",
      "Grade",
      "Pass/Fail",
      "Official",
    ];

    const rows = results.map((r) => [
      r.attempt.submittedAt ? new Date(r.attempt.submittedAt).toISOString().slice(0, 10) : "",
      r.student.studentCode,
      r.student.name,
      r.student.enrollments[0]?.rollNumber || "N/A",
      r.exam.class.name,
      r.exam.subject.name,
      r.exam.title,
      r.attempt.attemptNumber,
      r.rawMarks,
      r.maximumMarks,
      `${r.percentage}%`,
      r.grade,
      r.passed ? "PASSED" : "FAILED",
      r.isOfficial ? "YES" : "NO",
    ]);

    return [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
  }

  if (type === "attendance") {
    const records = await prisma.attendanceRecord.findMany({
      include: {
        student: {
          include: {
            enrollments: { where: { status: "ACTIVE" }, include: { class: true } },
          },
        },
        session: { include: { class: true } },
      },
      orderBy: { markedAt: "desc" },
    });

    const headers = [
      "Session Date",
      "Session Title",
      "Class",
      "Student ID",
      "Student Name",
      "Roll Number",
      "Status",
      "Method",
      "Marked Time",
      "Remarks",
    ];

    const rows = records.map((r) => [
      new Date(r.session.date).toISOString().slice(0, 10),
      r.session.title,
      r.session.class.name,
      r.student.studentCode,
      r.student.name,
      r.student.enrollments[0]?.rollNumber || "N/A",
      r.status,
      r.method,
      new Date(r.markedAt).toLocaleString(),
      r.remarks || "",
    ]);

    return [headers.map(escapeCsv).join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
  }

  return "";
}
