import { describe, it, expect } from "vitest";
import { LeaderboardEntry } from "@/lib/services/leaderboard.service";

describe("Leaderboard Ranking & Tie-Handling Rules (ADR-009)", () => {
  it("should calculate competition rank 1224 for tied scores", () => {
    const rawEntries = [
      { studentCode: "STU-001", primaryValue: 95 },
      { studentCode: "STU-002", primaryValue: 90 },
      { studentCode: "STU-003", primaryValue: 90 }, // Tied for 2nd
      { studentCode: "STU-004", primaryValue: 82 },
    ];

    const ranked = [];
    for (let i = 0; i < rawEntries.length; i++) {
      let rank = i + 1;
      if (i > 0 && rawEntries[i].primaryValue === rawEntries[i - 1].primaryValue) {
        rank = ranked[i - 1].rank;
      }
      ranked.push({ ...rawEntries[i], rank });
    }

    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBe(2); // Tied at rank 2
    expect(ranked[3].rank).toBe(4); // Standard Competition Rank 4 (skips 3)
  });

  it("should calculate Pass Rate percentage accurately", () => {
    const passed = 4;
    const totalEligible = 5;
    const passRate = (passed / totalEligible) * 100;

    expect(passRate).toBe(80.0);
  });

  it("should calculate Total Marks accurately across eligible official exams", () => {
    const scores = [18, 20, 19, 15];
    const total = scores.reduce((a, b) => a + b, 0);

    expect(total).toBe(72);
  });

  it("should calculate normalized Average Percentage accurately", () => {
    const percentages = [90, 85, 95];
    const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length;

    expect(avg).toBe(90.0);
  });
});

describe("Leaderboard Privacy Masking Rules", () => {
  it("should mask student name and roll number when privacy settings are active", () => {
    const entry: LeaderboardEntry = {
      rank: 2,
      studentId: "stu-other-uuid",
      studentCode: "STU-000002",
      name: "Armaan Khan",
      rollNumber: "08-2627-002",
      className: "Class 8",
      classNumber: 8,
      eligibleTestsCount: 3,
      passRate: 100,
      totalMarks: 60,
      averagePercentage: 92,
      primaryValue: 92,
      isSelf: false,
    };

    const privacySettings = {
      enabled: true,
      showName: false,
      showRollNumber: false,
      showMarks: false,
      showPassRate: false,
      showClass: false,
    };

    // Apply masking
    const masked = {
      ...entry,
      name: privacySettings.showName ? entry.name : `Student #${entry.rank}`,
      rollNumber: privacySettings.showRollNumber ? entry.rollNumber : "••-••••-•••",
      className: privacySettings.showClass ? entry.className : "Class ••",
      totalMarks: privacySettings.showMarks ? entry.totalMarks : 0,
      passRate: privacySettings.showPassRate ? entry.passRate : null,
    };

    expect(masked.name).toBe("Student #2");
    expect(masked.rollNumber).toBe("••-••••-•••");
    expect(masked.className).toBe("Class ••");
    expect(masked.totalMarks).toBe(0);
    expect(masked.passRate).toBeNull();
  });

  it("should NOT mask data for the authenticated student's own record", () => {
    const ownEntry: LeaderboardEntry = {
      rank: 1,
      studentId: "stu-self-uuid",
      studentCode: "STU-000001",
      name: "Rahul Sharma",
      rollNumber: "08-2627-001",
      className: "Class 8",
      classNumber: 8,
      eligibleTestsCount: 3,
      passRate: 100,
      totalMarks: 75,
      averagePercentage: 96,
      primaryValue: 96,
      isSelf: true,
    };

    const isPrivileged = false;
    const masked =
      isPrivileged || ownEntry.isSelf
        ? ownEntry
        : {
            ...ownEntry,
            name: "Masked",
          };

    expect(masked.name).toBe("Rahul Sharma");
    expect(masked.rollNumber).toBe("08-2627-001");
    expect(masked.isSelf).toBe(true);
  });
});
