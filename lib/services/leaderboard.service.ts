import prisma from "@/lib/prisma";
import { Prisma, StudentStatus } from "@prisma/client";

export type LeaderboardType = "PASS_RATE" | "TOTAL_MARKS" | "AVERAGE_PERCENTAGE";

export interface LeaderboardFilterQuery {
  type?: LeaderboardType;
  classNumber?: number;
  subjectCode?: string;
  academicSessionId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  minTests?: number;
}

export interface LeaderboardPrivacySettings {
  enabled: boolean;
  showName: boolean;
  showRollNumber: boolean;
  showMarks: boolean;
  showPassRate: boolean;
  showClass: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentCode: string;
  name: string;
  rollNumber: string;
  className: string;
  classNumber: number;
  eligibleTestsCount: number;
  passRate: number | null;
  totalMarks: number;
  averagePercentage: number | null;
  primaryValue: number;
  isSelf: boolean;
}

export async function getLeaderboardPrivacySettings(): Promise<LeaderboardPrivacySettings> {
  const [enabledSetting, privacySetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "LEADERBOARD_ENABLED" } }),
    prisma.systemSetting.findUnique({ where: { key: "LEADERBOARD_PRIVACY" } }),
  ]);

  const enabled = enabledSetting ? (enabledSetting.value as boolean) : true;
  const privacy = (privacySetting?.value as Record<string, boolean>) || {
    showName: true,
    showRollNumber: true,
    showMarks: true,
    showPassRate: true,
    showClass: true,
  };

  return {
    enabled,
    showName: privacy.showName ?? true,
    showRollNumber: privacy.showRollNumber ?? true,
    showMarks: privacy.showMarks ?? true,
    showPassRate: privacy.showPassRate ?? true,
    showClass: privacy.showClass ?? true,
  };
}

export async function updateLeaderboardSettings(settings: Partial<LeaderboardPrivacySettings>) {
  const current = await getLeaderboardPrivacySettings();
  const updated = { ...current, ...settings };

  await Promise.all([
    prisma.systemSetting.upsert({
      where: { key: "LEADERBOARD_ENABLED" },
      update: { value: updated.enabled },
      create: { key: "LEADERBOARD_ENABLED", value: updated.enabled, description: "Leaderboard active status" },
    }),
    prisma.systemSetting.upsert({
      where: { key: "LEADERBOARD_PRIVACY" },
      update: {
        value: {
          showName: updated.showName,
          showRollNumber: updated.showRollNumber,
          showMarks: updated.showMarks,
          showPassRate: updated.showPassRate,
          showClass: updated.showClass,
        },
      },
      create: {
        key: "LEADERBOARD_PRIVACY",
        value: {
          showName: updated.showName,
          showRollNumber: updated.showRollNumber,
          showMarks: updated.showMarks,
          showPassRate: updated.showPassRate,
          showClass: updated.showClass,
        },
        description: "Leaderboard display settings",
      },
    }),
  ]);

  return updated;
}

/**
 * Computes deterministic leaderboards with competition ranking (1224) and privacy masking
 */
export async function getLeaderboard(
  filters: LeaderboardFilterQuery,
  actor?: { studentId?: string; isAdmin?: boolean }
) {
  const leaderboardType = filters.type || "AVERAGE_PERCENTAGE";
  const minTests = filters.minTests ?? 1;

  // Resolve active session if none provided
  let sessionId = filters.academicSessionId;
  if (!sessionId) {
    const active = await prisma.academicSession.findFirst({ where: { isActive: true } });
    sessionId = active?.id;
  }

  const privacySettings = await getLeaderboardPrivacySettings();

  if (!privacySettings.enabled && !actor?.isAdmin) {
    return {
      enabled: false,
      message: "Leaderboards are currently disabled by the administrator.",
      entries: [],
      myPosition: null,
      privacySettings,
    };
  }

  // Find enrolled active students matching filters
  const studentWhere: Prisma.StudentWhereInput = {
    status: StudentStatus.ACTIVE,
  };

  if (filters.classNumber || sessionId) {
    studentWhere.enrollments = {
      some: {
        status: "ACTIVE",
        ...(filters.classNumber ? { class: { classNumber: filters.classNumber } } : {}),
        ...(sessionId ? { academicSessionId: sessionId } : {}),
      },
    };
  }

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
  if (filters.endDate) dateFilter.lte = new Date(filters.endDate);

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      enrollments: {
        where: {
          status: "ACTIVE",
          ...(sessionId ? { academicSessionId: sessionId } : {}),
        },
        include: { class: true },
      },
      results: {
        where: {
          isOfficial: true,
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          ...(filters.subjectCode ? { exam: { subject: { code: filters.subjectCode.toUpperCase() } } } : {}),
          ...(filters.classNumber ? { exam: { class: { classNumber: filters.classNumber } } } : {}),
        },
        include: {
          exam: true,
          attempt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      examAssignments: {
        where: {
          ...(filters.subjectCode ? { exam: { subject: { code: filters.subjectCode.toUpperCase() } } } : {}),
          ...(filters.classNumber ? { exam: { class: { classNumber: filters.classNumber } } } : {}),
        },
      },
    },
  });

  const rawEntries = [];

  for (const stu of students) {
    const officialResults = stu.results;
    const eligibleTestsCount = officialResults.length;

    if (eligibleTestsCount < minTests) {
      continue;
    }

    let totalMarks = 0;
    let totalPercentage = 0;
    let passedCount = 0;
    let latestSubmissionDate = new Date(0);

    for (const r of officialResults) {
      totalMarks += r.rawMarks;
      totalPercentage += r.percentage;
      if (r.passed) passedCount++;
      if (r.createdAt > latestSubmissionDate) {
        latestSubmissionDate = r.createdAt;
      }
    }

    const passRate = eligibleTestsCount > 0 ? parseFloat(((passedCount / eligibleTestsCount) * 100).toFixed(1)) : 0;
    const avgPct = eligibleTestsCount > 0 ? parseFloat((totalPercentage / eligibleTestsCount).toFixed(1)) : 0;

    let primaryValue = 0;
    if (leaderboardType === "PASS_RATE") {
      primaryValue = passRate;
    } else if (leaderboardType === "TOTAL_MARKS") {
      primaryValue = parseFloat(totalMarks.toFixed(1));
    } else {
      primaryValue = avgPct;
    }

    const activeEnr = stu.enrollments[0];

    rawEntries.push({
      studentId: stu.id,
      studentCode: stu.studentCode,
      name: stu.name,
      rollNumber: activeEnr?.rollNumber || "N/A",
      className: activeEnr?.class?.name || "Class 8",
      classNumber: activeEnr?.class?.classNumber || 8,
      eligibleTestsCount,
      passRate,
      totalMarks: parseFloat(totalMarks.toFixed(1)),
      averagePercentage: avgPct,
      primaryValue,
      latestSubmissionDate,
      isSelf: actor?.studentId === stu.id,
    });
  }

  // Deterministic Sorting: Primary Value desc -> Eligible Tests desc -> Latest Date desc -> Student Code asc
  rawEntries.sort((a, b) => {
    if (b.primaryValue !== a.primaryValue) {
      return b.primaryValue - a.primaryValue;
    }
    if (b.eligibleTestsCount !== a.eligibleTestsCount) {
      return b.eligibleTestsCount - a.eligibleTestsCount;
    }
    if (b.latestSubmissionDate.getTime() !== a.latestSubmissionDate.getTime()) {
      return b.latestSubmissionDate.getTime() - a.latestSubmissionDate.getTime();
    }
    return a.studentCode.localeCompare(b.studentCode);
  });

  // Calculate Competition Ranks (1224)
  const rankedEntries: LeaderboardEntry[] = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const entry = rawEntries[i];
    let rank = i + 1;

    if (i > 0 && entry.primaryValue === rawEntries[i - 1].primaryValue) {
      rank = rankedEntries[i - 1].rank;
    }

    rankedEntries.push({
      rank,
      studentId: entry.studentId,
      studentCode: entry.studentCode,
      name: entry.name,
      rollNumber: entry.rollNumber,
      className: entry.className,
      classNumber: entry.classNumber,
      eligibleTestsCount: entry.eligibleTestsCount,
      passRate: entry.passRate,
      totalMarks: entry.totalMarks,
      averagePercentage: entry.averagePercentage,
      primaryValue: entry.primaryValue,
      isSelf: entry.isSelf,
    });
  }

  // Apply Privacy Masking for Students
  const isPrivileged = !!actor?.isAdmin;
  const maskedEntries = rankedEntries.map((entry) => {
    if (isPrivileged || entry.isSelf) {
      return entry;
    }

    return {
      ...entry,
      name: privacySettings.showName ? entry.name : `Student #${entry.rank}`,
      rollNumber: privacySettings.showRollNumber ? entry.rollNumber : "••-••••-•••",
      className: privacySettings.showClass ? entry.className : "Class ••",
      totalMarks: privacySettings.showMarks ? entry.totalMarks : 0,
      passRate: privacySettings.showPassRate ? entry.passRate : null,
      averagePercentage: entry.averagePercentage, // Normalized % always transparent if enabled
    };
  });

  const myPosition = rankedEntries.find((e) => e.isSelf) || null;

  return {
    enabled: true,
    type: leaderboardType,
    totalParticipants: rankedEntries.length,
    entries: maskedEntries,
    myPosition,
    privacySettings,
  };
}
