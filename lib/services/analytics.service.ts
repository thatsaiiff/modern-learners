import prisma from "@/lib/prisma";
import { Prisma, StudentStatus } from "@prisma/client";
import { ANALYTICS_THRESHOLDS, TrendDirection, AttentionSeverity } from "@/lib/analytics/constants";
import { determineGrade } from "./grading.service";

interface SnapshotData {
  customId?: string;
  type?: string;
  topic?: string;
  difficulty?: string;
}

export interface NeedsAttentionTrigger {
  code: string;
  title: string;
  detail: string;
  severity: AttentionSeverity;
}

export interface StudentAttentionProfile {
  studentId: string;
  name: string;
  studentCode: string;
  rollNumber: string;
  className: string;
  classNumber: number;
  averagePercentage: number;
  passRate: number;
  testsCount: number;
  triggers: NeedsAttentionTrigger[];
}

/**
 * Calculates trend direction from chronological percentage values
 */
export function calculateTrendDirection(percentages: number[]): TrendDirection {
  if (!percentages || percentages.length < ANALYTICS_THRESHOLDS.MINIMUM_EXAMS_FOR_TREND) {
    return "INSUFFICIENT_DATA";
  }

  // Look at last 3-5 exams
  const recent = percentages.slice(-4);
  let isStrictlyDeclining = true;
  let isStrictlyImproving = true;

  for (let i = 1; i < recent.length; i++) {
    if (recent[i] >= recent[i - 1]) isStrictlyDeclining = false;
    if (recent[i] <= recent[i - 1]) isStrictlyImproving = false;
  }

  if (isStrictlyImproving && recent[recent.length - 1] - recent[0] >= 5) {
    return "IMPROVING";
  }

  if (isStrictlyDeclining && recent[0] - recent[recent.length - 1] >= 5) {
    return "DECLINING";
  }

  const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
  const secondHalf = recent.slice(Math.floor(recent.length / 2));
  const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  if (avg2 - avg1 >= 5) return "IMPROVING";
  if (avg1 - avg2 >= 5) return "DECLINING";

  return "STABLE";
}

/**
 * Admin Overview Analytics
 */
export async function getAdminAnalyticsOverview(sessionId?: string) {
  // Resolve active session
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const active = await prisma.academicSession.findFirst({ where: { isActive: true } });
    targetSessionId = active?.id;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalStudents,
    activeStudents,
    totalExams,
    upcomingExamsCount,
    testsThisMonthCount,
    officialResults,
    classes,
    subjects,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { status: StudentStatus.ACTIVE } }),
    prisma.exam.count(),
    prisma.exam.count({
      where: {
        startAt: { gt: now },
        status: { in: ["ACTIVE", "PUBLISHED"] },
      },
    }),
    prisma.result.count({
      where: {
        isOfficial: true,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.result.findMany({
      where: {
        isOfficial: true,
        ...(targetSessionId
          ? {
              student: {
                enrollments: {
                  some: { academicSessionId: targetSessionId, status: "ACTIVE" },
                },
              },
            }
          : {}),
      },
      include: {
        exam: { include: { class: true, subject: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.class.findMany({
      where: { isActive: true },
      orderBy: { classNumber: "asc" },
      include: {
        enrollments: {
          where: {
            status: "ACTIVE",
            ...(targetSessionId ? { academicSessionId: targetSessionId } : {}),
          },
        },
      },
    }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  // Aggregate mean percentage and pass rate
  let totalPctSum = 0;
  let passedCount = 0;
  let outstandingStudentsCount = 0;

  for (const r of officialResults) {
    totalPctSum += r.percentage;
    if (r.passed) passedCount++;
    if (r.percentage >= ANALYTICS_THRESHOLDS.OUTSTANDING_PERCENTAGE_THRESHOLD) {
      outstandingStudentsCount++;
    }
  }

  const totalResultsCount = officialResults.length;
  const averagePercentage =
    totalResultsCount > 0 ? parseFloat((totalPctSum / totalResultsCount).toFixed(1)) : 0;
  const overallPassRate =
    totalResultsCount > 0 ? parseFloat(((passedCount / totalResultsCount) * 100).toFixed(1)) : 0;

  // Class Breakdown
  const classBreakdown = classes.map((cls) => {
    const classResults = officialResults.filter((r) => r.exam.class.classNumber === cls.classNumber);
    const clsCount = classResults.length;
    const clsPctSum = classResults.reduce((sum, r) => sum + r.percentage, 0);
    const clsPassed = classResults.filter((r) => r.passed).length;

    return {
      classNumber: cls.classNumber,
      className: cls.name,
      studentsCount: cls.enrollments.length,
      testsCount: clsCount,
      averagePercentage: clsCount > 0 ? parseFloat((clsPctSum / clsCount).toFixed(1)) : null,
      passRate: clsCount > 0 ? parseFloat(((clsPassed / clsCount) * 100).toFixed(1)) : null,
    };
  });

  // Subject Breakdown
  const subjectBreakdown = subjects.map((sub) => {
    const subResults = officialResults.filter((r) => r.exam.subject.code === sub.code);
    const subCount = subResults.length;
    const subPctSum = subResults.reduce((sum, r) => sum + r.percentage, 0);
    const subPassed = subResults.filter((r) => r.passed).length;

    return {
      code: sub.code,
      name: sub.name,
      testsCount: subCount,
      averagePercentage: subCount > 0 ? parseFloat((subPctSum / subCount).toFixed(1)) : null,
      passRate: subCount > 0 ? parseFloat(((subPassed / subCount) * 100).toFixed(1)) : null,
    };
  });

  // Needs Attention List Count
  const attentionStudents = await getNeedsAttentionStudents({ sessionId: targetSessionId });

  return {
    kpis: {
      totalStudents,
      activeStudents,
      examsConducted: totalExams,
      upcomingExams: upcomingExamsCount,
      testsThisMonth: testsThisMonthCount,
      averagePercentage,
      overallPassRate,
      outstandingStudentsCount,
      needsAttentionCount: attentionStudents.length,
    },
    classBreakdown,
    subjectBreakdown,
    recentOfficialResultsCount: totalResultsCount,
  };
}

/**
 * Student Personal Analytics
 */
export async function getStudentAnalytics(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { class: true, academicSession: true },
      },
      results: {
        where: { isOfficial: true },
        include: {
          exam: {
            include: { subject: true, class: true, chapter: true },
          },
          attempt: {
            include: {
              attemptQuestions: true,
              attemptAnswers: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  const results = student.results;
  const testsCount = results.length;

  if (testsCount === 0) {
    const activeEnr = student.enrollments[0];
    return {
      studentInfo: {
        id: student.id,
        name: student.name,
        studentCode: student.studentCode,
        rollNumber: activeEnr?.rollNumber || "N/A",
        className: activeEnr?.class?.name || "N/A",
        classNumber: activeEnr?.class?.classNumber || 8,
      },
      summary: {
        overallAverage: null,
        passRate: null,
        testsAttempted: 0,
        testsPassed: 0,
        testsFailed: 0,
        highestScore: null,
        lowestScore: null,
        currentGrade: "N/A",
        trendDirection: "INSUFFICIENT_DATA" as TrendDirection,
      },
      performanceTrend: [],
      subjectPerformance: [],
      topicPerformance: [],
      difficultyPerformance: [],
      weakTopics: [],
      needsAttentionAlerts: [],
    };
  }

  // Summary Metrics
  let totalPctSum = 0;
  let passedCount = 0;
  let highest = -1;
  let lowest = 999;
  const percentages = results.map((r) => r.percentage);

  for (const r of results) {
    totalPctSum += r.percentage;
    if (r.passed) passedCount++;
    if (r.percentage > highest) highest = r.percentage;
    if (r.percentage < lowest) lowest = r.percentage;
  }

  const overallAverage = parseFloat((totalPctSum / testsCount).toFixed(1));
  const passRate = parseFloat(((passedCount / testsCount) * 100).toFixed(1));
  const trendDirection = calculateTrendDirection(percentages);
  const { grade: currentGrade } = determineGrade(overallAverage, []);

  // Performance Trend Data Points
  const performanceTrend = results.map((r) => ({
    resultId: r.id,
    date: r.createdAt.toISOString(),
    examTitle: r.exam.title,
    subjectName: r.exam.subject.name,
    percentage: r.percentage,
    rawMarks: r.rawMarks,
    maximumMarks: r.maximumMarks,
    grade: r.grade,
    passed: r.passed,
  }));

  // Subject Performance Breakdown
  const subjectMap: Record<
    string,
    { name: string; code: string; scores: number[]; passed: number }
  > = {};

  for (const r of results) {
    const sCode = r.exam.subject.code;
    if (!subjectMap[sCode]) {
      subjectMap[sCode] = {
        name: r.exam.subject.name,
        code: sCode,
        scores: [],
        passed: 0,
      };
    }
    subjectMap[sCode].scores.push(r.percentage);
    if (r.passed) subjectMap[sCode].passed++;
  }

  const subjectPerformance = Object.values(subjectMap).map((sub) => {
    const count = sub.scores.length;
    const avg = parseFloat((sub.scores.reduce((a, b) => a + b, 0) / count).toFixed(1));
    const sPassRate = parseFloat(((sub.passed / count) * 100).toFixed(1));
    return {
      code: sub.code,
      name: sub.name,
      testCount: count,
      average: avg,
      passRate: sPassRate,
      highest: Math.max(...sub.scores),
      lowest: Math.min(...sub.scores),
    };
  });

  // Topic & Difficulty Aggregations from Snapshots
  const topicMap: Record<
    string,
    { topic: string; subjectName: string; total: number; correct: number }
  > = {};
  const diffMap: Record<string, { total: number; correct: number }> = {
    EASY: { total: 0, correct: 0 },
    MEDIUM: { total: 0, correct: 0 },
    HARD: { total: 0, correct: 0 },
  };

  for (const r of results) {
    const answerMap = new Map(r.attempt.attemptAnswers.map((a) => [a.questionId, a]));

    for (const aq of r.attempt.attemptQuestions) {
      const snap = aq.questionSnapshot as unknown as SnapshotData;
      const qKey = aq.questionId || snap?.customId || aq.id;
      const ans = answerMap.get(qKey) || answerMap.get(aq.id);
      const isCorrect = !!ans?.isCorrect;

      // Topic stats
      if (snap?.topic && typeof snap.topic === "string" && snap.topic.trim()) {
        const t = snap.topic.trim();
        if (!topicMap[t]) {
          topicMap[t] = { topic: t, subjectName: r.exam.subject.name, total: 0, correct: 0 };
        }
        topicMap[t].total++;
        if (isCorrect) topicMap[t].correct++;
      }

      // Difficulty stats
      const diff = (snap?.difficulty?.toUpperCase() || "MEDIUM") as "EASY" | "MEDIUM" | "HARD";
      if (diffMap[diff]) {
        diffMap[diff].total++;
        if (isCorrect) diffMap[diff].correct++;
      }
    }
  }

  const topicPerformance = Object.values(topicMap).map((t) => {
    const acc = parseFloat(((t.correct / Math.max(1, t.total)) * 100).toFixed(1));
    return {
      topic: t.topic,
      subjectName: t.subjectName,
      totalQuestions: t.total,
      correct: t.correct,
      incorrect: t.total - t.correct,
      accuracy: acc,
      status:
        acc >= ANALYTICS_THRESHOLDS.WEAK_TOPIC_ACCURACY_THRESHOLD ? "STRONG" : "NEEDS_IMPROVEMENT",
    };
  });

  const weakTopics = topicPerformance.filter(
    (t) => t.accuracy < ANALYTICS_THRESHOLDS.WEAK_TOPIC_ACCURACY_THRESHOLD
  );

  const difficultyPerformance = Object.entries(diffMap).map(([diff, stats]) => ({
    difficulty: diff,
    totalQuestions: stats.total,
    correct: stats.correct,
    accuracy: stats.total > 0 ? parseFloat(((stats.correct / stats.total) * 100).toFixed(1)) : null,
  }));

  // Needs-Attention Alerts specifically for this student
  const needsAttentionAlerts: NeedsAttentionTrigger[] = [];

  // Check Rule 1: Repeated Failures
  const lastExams = results.slice(-ANALYTICS_THRESHOLDS.REPEATED_FAILURES_THRESHOLD);
  if (
    lastExams.length >= ANALYTICS_THRESHOLDS.REPEATED_FAILURES_THRESHOLD &&
    lastExams.every((r) => !r.passed)
  ) {
    needsAttentionAlerts.push({
      code: "REPEATED_FAILURES",
      title: "Repeated Test Failures",
      detail: `Failed the last ${lastExams.length} consecutive examinations (${lastExams.map((e) => e.exam.title).join(", ")}).`,
      severity: "HIGH",
    });
  }

  // Check Rule 2: Declining Trend
  if (trendDirection === "DECLINING") {
    needsAttentionAlerts.push({
      code: "DECLINING_TREND",
      title: "Declining Performance Trend",
      detail: `Scores have shown a sustained downward trend across the last ${Math.min(4, testsCount)} exams.`,
      severity: "MEDIUM",
    });
  }

  // Check Rule 3: Low Subject Averages
  for (const sub of subjectPerformance) {
    if (sub.average < ANALYTICS_THRESHOLDS.LOW_SUBJECT_AVERAGE_THRESHOLD) {
      needsAttentionAlerts.push({
        code: "LOW_SUBJECT_AVERAGE",
        title: `Low ${sub.name} Average`,
        detail: `${sub.name} average is ${sub.average}% across ${sub.testCount} tests (below ${ANALYTICS_THRESHOLDS.LOW_SUBJECT_AVERAGE_THRESHOLD}% threshold).`,
        severity: "HIGH",
      });
    }
  }

  // Check Rule 4: Critical Weak Topics
  for (const wt of weakTopics) {
    if (wt.totalQuestions >= 3 && wt.accuracy < ANALYTICS_THRESHOLDS.CRITICAL_WEAK_TOPIC_THRESHOLD) {
      needsAttentionAlerts.push({
        code: "CRITICAL_WEAK_TOPIC",
        title: `Low Topic Accuracy: ${wt.topic}`,
        detail: `Accuracy in topic '${wt.topic}' (${wt.subjectName}) is ${wt.accuracy}% across ${wt.totalQuestions} questions.`,
        severity: "MEDIUM",
      });
    }
  }

  const activeEnr = student.enrollments[0];

  return {
    studentInfo: {
      id: student.id,
      name: student.name,
      studentCode: student.studentCode,
      rollNumber: activeEnr?.rollNumber || "N/A",
      className: activeEnr?.class?.name || "N/A",
      classNumber: activeEnr?.class?.classNumber || 8,
    },
    summary: {
      overallAverage,
      passRate,
      testsAttempted: testsCount,
      testsPassed: passedCount,
      testsFailed: testsCount - passedCount,
      highestScore: highest,
      lowestScore: lowest,
      currentGrade,
      trendDirection,
    },
    performanceTrend,
    subjectPerformance,
    topicPerformance,
    difficultyPerformance,
    weakTopics,
    needsAttentionAlerts,
  };
}

/**
 * Transparent Rule-Based Needs-Attention Engine for Admin
 */
export async function getNeedsAttentionStudents(filters?: {
  classNumber?: number;
  sessionId?: string;
}): Promise<StudentAttentionProfile[]> {
  const whereStudent: Prisma.StudentWhereInput = {
    status: StudentStatus.ACTIVE,
  };

  if (filters?.classNumber || filters?.sessionId) {
    whereStudent.enrollments = {
      some: {
        status: "ACTIVE",
        ...(filters.classNumber ? { class: { classNumber: filters.classNumber } } : {}),
        ...(filters.sessionId ? { academicSessionId: filters.sessionId } : {}),
      },
    };
  }

  const activeStudents = await prisma.student.findMany({
    where: whereStudent,
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { class: true, academicSession: true },
      },
      results: {
        where: { isOfficial: true },
        include: {
          exam: { include: { subject: true, class: true } },
          attempt: {
            include: {
              attemptQuestions: true,
              attemptAnswers: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      examAssignments: {
        where: { status: "EXPIRED" },
      },
    },
  });

  const flaggedStudents: StudentAttentionProfile[] = [];

  for (const stu of activeStudents) {
    const results = stu.results;
    const testsCount = results.length;
    const triggers: NeedsAttentionTrigger[] = [];

    const activeEnr = stu.enrollments[0];
    const className = activeEnr?.class?.name || "Class 8";
    const classNumber = activeEnr?.class?.classNumber || 8;
    const rollNumber = activeEnr?.rollNumber || "N/A";

    // 1. Check Missed Assignments
    if (stu.examAssignments.length >= ANALYTICS_THRESHOLDS.MISSED_ASSIGNMENTS_THRESHOLD) {
      triggers.push({
        code: "MISSED_EXAMS",
        title: "Multiple Missed Exams",
        detail: `Missed ${stu.examAssignments.length} assigned examinations without starting.`,
        severity: "MEDIUM",
      });
    }

    if (testsCount > 0) {
      const percentages = results.map((r) => r.percentage);
      const avg = parseFloat(
        (percentages.reduce((a, b) => a + b, 0) / testsCount).toFixed(1)
      );
      const passedCount = results.filter((r) => r.passed).length;
      const passRate = parseFloat(((passedCount / testsCount) * 100).toFixed(1));
      const trend = calculateTrendDirection(percentages);

      // 2. Check Repeated Failures (last 2 exams)
      const lastExams = results.slice(-ANALYTICS_THRESHOLDS.REPEATED_FAILURES_THRESHOLD);
      if (
        lastExams.length >= ANALYTICS_THRESHOLDS.REPEATED_FAILURES_THRESHOLD &&
        lastExams.every((r) => !r.passed)
      ) {
        triggers.push({
          code: "REPEATED_FAILURES",
          title: "Repeated Test Failures",
          detail: `Failed last ${lastExams.length} consecutive exams (${lastExams.map((e) => e.exam.title).join(", ")}).`,
          severity: "HIGH",
        });
      }

      // 3. Check Declining Trend
      if (trend === "DECLINING") {
        triggers.push({
          code: "DECLINING_TREND",
          title: "Declining Performance Trend",
          detail: `Performance has consistently dropped over the last ${Math.min(4, testsCount)} tests.`,
          severity: "MEDIUM",
        });
      }

      // 4. Check Low Overall Average
      if (avg < ANALYTICS_THRESHOLDS.LOW_OVERALL_AVERAGE_THRESHOLD) {
        triggers.push({
          code: "LOW_OVERALL_AVERAGE",
          title: "Low Overall Average",
          detail: `Overall average is ${avg}% across ${testsCount} tests (below ${ANALYTICS_THRESHOLDS.LOW_OVERALL_AVERAGE_THRESHOLD}%).`,
          severity: "HIGH",
        });
      }

      // 5. Check Subject-wise averages
      const subScores: Record<string, { name: string; scores: number[] }> = {};
      for (const r of results) {
        const c = r.exam.subject.code;
        if (!subScores[c]) subScores[c] = { name: r.exam.subject.name, scores: [] };
        subScores[c].scores.push(r.percentage);
      }

      for (const sub of Object.values(subScores)) {
        if (sub.scores.length >= 2) {
          const sAvg = sub.scores.reduce((a, b) => a + b, 0) / sub.scores.length;
          if (sAvg < ANALYTICS_THRESHOLDS.LOW_SUBJECT_AVERAGE_THRESHOLD) {
            triggers.push({
              code: "LOW_SUBJECT_AVERAGE",
              title: `Low ${sub.name} Average`,
              detail: `${sub.name} average is ${sAvg.toFixed(1)}% over ${sub.scores.length} exams.`,
              severity: "HIGH",
            });
          }
        }
      }

      // 6. Check Topic Accuracy
      const topicStats: Record<string, { name: string; total: number; correct: number }> = {};
      for (const r of results) {
        const answerMap = new Map(r.attempt.attemptAnswers.map((a) => [a.questionId, a]));
        for (const aq of r.attempt.attemptQuestions) {
          const snap = aq.questionSnapshot as unknown as SnapshotData;
          if (snap?.topic) {
            const t = snap.topic.trim();
            if (!topicStats[t]) topicStats[t] = { name: t, total: 0, correct: 0 };
            topicStats[t].total++;
            const qKey = aq.questionId || snap?.customId || aq.id;
            const ans = answerMap.get(qKey) || answerMap.get(aq.id);
            if (ans?.isCorrect) topicStats[t].correct++;
          }
        }
      }

      for (const t of Object.values(topicStats)) {
        if (t.total >= 3) {
          const acc = (t.correct / t.total) * 100;
          if (acc < ANALYTICS_THRESHOLDS.CRITICAL_WEAK_TOPIC_THRESHOLD) {
            triggers.push({
              code: "CRITICAL_TOPIC",
              title: `Critical Weak Topic: ${t.name}`,
              detail: `Accuracy in '${t.name}' is ${acc.toFixed(1)}% (${t.correct}/${t.total} correct).`,
              severity: "MEDIUM",
            });
          }
        }
      }

      if (triggers.length > 0) {
        flaggedStudents.push({
          studentId: stu.id,
          name: stu.name,
          studentCode: stu.studentCode,
          rollNumber,
          className,
          classNumber,
          averagePercentage: avg,
          passRate,
          testsCount,
          triggers,
        });
      }
    } else if (triggers.length > 0) {
      flaggedStudents.push({
        studentId: stu.id,
        name: stu.name,
        studentCode: stu.studentCode,
        rollNumber,
        className,
        classNumber,
        averagePercentage: 0,
        passRate: 0,
        testsCount: 0,
        triggers,
      });
    }
  }

  return flaggedStudents;
}
