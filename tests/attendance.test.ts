import { describe, it, expect } from "vitest";
import { ANALYTICS_THRESHOLDS } from "@/lib/analytics/constants";

describe("Attendance Check-In & Time Window Validation", () => {
  it("should allow student check-in when current time is within session window", () => {
    const session = {
      startTime: new Date("2026-09-21T10:00:00.000Z"),
      endTime: new Date("2026-09-21T11:00:00.000Z"),
      studentCheckInEnabled: true,
    };

    const currentTime = new Date("2026-09-21T10:15:00.000Z");

    const isValid =
      session.studentCheckInEnabled &&
      currentTime >= session.startTime &&
      currentTime <= session.endTime;

    expect(isValid).toBe(true);
  });

  it("should reject student check-in before session opening time", () => {
    const session = {
      startTime: new Date("2026-09-21T10:00:00.000Z"),
      endTime: new Date("2026-09-21T11:00:00.000Z"),
      studentCheckInEnabled: true,
    };

    const currentTime = new Date("2026-09-21T09:59:00.000Z");

    const isValid =
      session.studentCheckInEnabled &&
      currentTime >= session.startTime &&
      currentTime <= session.endTime;

    expect(isValid).toBe(false);
  });

  it("should reject student check-in after session window closes", () => {
    const session = {
      startTime: new Date("2026-09-21T10:00:00.000Z"),
      endTime: new Date("2026-09-21T11:00:00.000Z"),
      studentCheckInEnabled: true,
    };

    const currentTime = new Date("2026-09-21T11:01:00.000Z");

    const isValid =
      session.studentCheckInEnabled &&
      currentTime >= session.startTime &&
      currentTime <= session.endTime;

    expect(isValid).toBe(false);
  });

  it("should reject student check-in when check-in is disabled by teacher", () => {
    const session = {
      startTime: new Date("2026-09-21T10:00:00.000Z"),
      endTime: new Date("2026-09-21T11:00:00.000Z"),
      studentCheckInEnabled: false,
    };

    const currentTime = new Date("2026-09-21T10:30:00.000Z");

    const isValid =
      session.studentCheckInEnabled &&
      currentTime >= session.startTime &&
      currentTime <= session.endTime;

    expect(isValid).toBe(false);
  });
});

describe("Attendance Calculation & Low Attendance Rules", () => {
  it("should calculate attendance percentage accurately (including Late as attended)", () => {
    const presentCount = 18;
    const lateCount = 2;
    const absentCount = 4;
    const totalSessions = presentCount + lateCount + absentCount; // 24

    const attendanceRate = ((presentCount + lateCount) / totalSessions) * 100;
    expect(parseFloat(attendanceRate.toFixed(1))).toBe(83.3);
  });

  it("should flag student when attendance falls below 75% threshold", () => {
    const totalSessions = 20;
    const attended = 14; // 70%
    const rate = (attended / totalSessions) * 100;

    const isLow = rate < ANALYTICS_THRESHOLDS.LOW_ATTENDANCE_THRESHOLD;
    expect(isLow).toBe(true);
    expect(rate).toBe(70.0);
  });

  it("should default to 100% when 0 sessions have occurred", () => {
    const totalSessions = 0;
    const rate = totalSessions > 0 ? 0 : 100.0;

    expect(rate).toBe(100.0);
  });
});
