import prisma from "@/lib/prisma";
import { logAudit } from "./audit.service";
import { MultiAttemptRule, Prisma } from "@prisma/client";

export interface SystemConfig {
  system: {
    academyName: string;
    brandSubtitle: string;
    contactEmail: string;
    contactPhone: string;
  };
  grading: {
    defaultPassingPercentage: number;
    defaultGradingTiers: Array<{
      min: number;
      max: number;
      label: string;
    }>;
  };
  examRules: {
    defaultDurationMinutes: number;
    defaultMultiAttemptRule: MultiAttemptRule;
    negativeMarkingDefaultEnabled: boolean;
    negativeMarkValueDefault: number;
  };
  privacy: {
    leaderboardEnabled: boolean;
    showName: boolean;
    showRollNumber: boolean;
    showMarks: boolean;
    showPassRate: boolean;
    showClass: boolean;
  };
}

export async function getAllSystemSettings(): Promise<SystemConfig> {
  const [
    sysNameSetting,
    sysSubtitleSetting,
    passingSetting,
    tiersSetting,
    examRulesSetting,
    lbEnabledSetting,
    lbPrivacySetting,
  ] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "ACADEMY_NAME" } }),
    prisma.systemSetting.findUnique({ where: { key: "ACADEMY_SUBTITLE" } }),
    prisma.systemSetting.findUnique({ where: { key: "DEFAULT_PASSING_PERCENTAGE" } }),
    prisma.systemSetting.findUnique({ where: { key: "DEFAULT_GRADING_TIERS" } }),
    prisma.systemSetting.findUnique({ where: { key: "DEFAULT_EXAM_RULES" } }),
    prisma.systemSetting.findUnique({ where: { key: "LEADERBOARD_ENABLED" } }),
    prisma.systemSetting.findUnique({ where: { key: "LEADERBOARD_PRIVACY" } }),
  ]);

  const examRules = (examRulesSetting?.value as Record<string, unknown>) || {};
  const lbPrivacy = (lbPrivacySetting?.value as Record<string, boolean>) || {};

  return {
    system: {
      academyName: (sysNameSetting?.value as string) || "Modern Learners — Saif Classes",
      brandSubtitle: (sysSubtitleSetting?.value as string) || "Tuition Academic Management & Performance Platform",
      contactEmail: "saif@modernlearners.com",
      contactPhone: "+91 98765 43210",
    },
    grading: {
      defaultPassingPercentage: (passingSetting?.value as number) ?? 80.0,
      defaultGradingTiers: (tiersSetting?.value as Array<{ min: number; max: number; label: string }>) || [
        { min: 100, max: 100, label: "OP — Outstandingly Perfect" },
        { min: 95, max: 99.99, label: "Outstanding" },
        { min: 90, max: 94.99, label: "Excellent" },
        { min: 80, max: 89.99, label: "Pass" },
        { min: 0, max: 79.99, label: "Fail — Needs Improvement" },
      ],
    },
    examRules: {
      defaultDurationMinutes: (examRules.defaultDurationMinutes as number) ?? 60,
      defaultMultiAttemptRule: (examRules.defaultMultiAttemptRule as MultiAttemptRule) || MultiAttemptRule.BEST,
      negativeMarkingDefaultEnabled: (examRules.negativeMarkingDefaultEnabled as boolean) ?? false,
      negativeMarkValueDefault: (examRules.negativeMarkValueDefault as number) ?? 0.25,
    },
    privacy: {
      leaderboardEnabled: (lbEnabledSetting?.value as boolean) ?? true,
      showName: lbPrivacy.showName ?? true,
      showRollNumber: lbPrivacy.showRollNumber ?? true,
      showMarks: lbPrivacy.showMarks ?? true,
      showPassRate: lbPrivacy.showPassRate ?? true,
      showClass: lbPrivacy.showClass ?? true,
    },
  };
}

export async function updateSystemConfig(
  newConfig: Partial<SystemConfig>,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  return await prisma.$transaction(async (tx) => {
    if (newConfig.system) {
      if (newConfig.system.academyName) {
        await tx.systemSetting.upsert({
          where: { key: "ACADEMY_NAME" },
          update: { value: newConfig.system.academyName },
          create: { key: "ACADEMY_NAME", value: newConfig.system.academyName, description: "Official academy name" },
        });
      }
      if (newConfig.system.brandSubtitle) {
        await tx.systemSetting.upsert({
          where: { key: "ACADEMY_SUBTITLE" },
          update: { value: newConfig.system.brandSubtitle },
          create: { key: "ACADEMY_SUBTITLE", value: newConfig.system.brandSubtitle, description: "Official academy subtitle" },
        });
      }
    }

    if (newConfig.grading) {
      if (newConfig.grading.defaultPassingPercentage !== undefined) {
        await tx.systemSetting.upsert({
          where: { key: "DEFAULT_PASSING_PERCENTAGE" },
          update: { value: newConfig.grading.defaultPassingPercentage },
          create: { key: "DEFAULT_PASSING_PERCENTAGE", value: newConfig.grading.defaultPassingPercentage, description: "Default passing score" },
        });
      }
      if (newConfig.grading.defaultGradingTiers) {
        await tx.systemSetting.upsert({
          where: { key: "DEFAULT_GRADING_TIERS" },
          update: { value: newConfig.grading.defaultGradingTiers as unknown as Prisma.InputJsonValue },
          create: { key: "DEFAULT_GRADING_TIERS", value: newConfig.grading.defaultGradingTiers as unknown as Prisma.InputJsonValue, description: "Default grade tiers" },
        });
      }
    }

    if (newConfig.examRules) {
      await tx.systemSetting.upsert({
        where: { key: "DEFAULT_EXAM_RULES" },
        update: { value: newConfig.examRules as unknown as Prisma.InputJsonValue },
        create: { key: "DEFAULT_EXAM_RULES", value: newConfig.examRules as unknown as Prisma.InputJsonValue, description: "Default exam parameters" },
      });
    }

    if (newConfig.privacy) {
      await tx.systemSetting.upsert({
        where: { key: "LEADERBOARD_ENABLED" },
        update: { value: newConfig.privacy.leaderboardEnabled },
        create: { key: "LEADERBOARD_ENABLED", value: newConfig.privacy.leaderboardEnabled, description: "Leaderboard status" },
      });

      await tx.systemSetting.upsert({
        where: { key: "LEADERBOARD_PRIVACY" },
        update: { value: newConfig.privacy as unknown as Prisma.InputJsonValue },
        create: { key: "LEADERBOARD_PRIVACY", value: newConfig.privacy as unknown as Prisma.InputJsonValue, description: "Leaderboard display settings" },
      });
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: "ADMIN",
        action: "SYSTEM_SETTINGS_UPDATED",
        entityType: "SystemSetting",
        entityId: "SYSTEM_CONFIG",
        newValue: newConfig as Record<string, unknown>,
        ipAddress,
      },
      tx
    );

    return { success: true };
  });
}
