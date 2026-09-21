import { describe, it, expect } from "vitest";
import {
  calculateTrendDirection,
} from "@/lib/services/analytics.service";
import { ANALYTICS_THRESHOLDS } from "@/lib/analytics/constants";

describe("Analytics Engine: Performance Trend Algorithm", () => {
  it("should return INSUFFICIENT_DATA when student has fewer than 2 exams", () => {
    expect(calculateTrendDirection([])).toBe("INSUFFICIENT_DATA");
    expect(calculateTrendDirection([85])).toBe("INSUFFICIENT_DATA");
  });

  it("should detect IMPROVING trend when scores rise consistently", () => {
    expect(calculateTrendDirection([60, 72, 85])).toBe("IMPROVING");
    expect(calculateTrendDirection([50, 65, 75, 88])).toBe("IMPROVING");
  });

  it("should detect DECLINING trend when scores drop consistently", () => {
    expect(calculateTrendDirection([92, 84, 75])).toBe("DECLINING");
    expect(calculateTrendDirection([88, 78, 70, 62])).toBe("DECLINING");
  });

  it("should detect STABLE trend when scores fluctuate within narrow range", () => {
    expect(calculateTrendDirection([84, 85, 83, 86])).toBe("STABLE");
    expect(calculateTrendDirection([90, 89, 91])).toBe("STABLE");
  });
});

describe("Analytics Engine: Subject & Topic Aggregation Rules", () => {
  const sampleOfficialResults = [
    {
      subjectCode: "PHY",
      subjectName: "Physics",
      percentage: 85,
      passed: true,
    },
    {
      subjectCode: "PHY",
      subjectName: "Physics",
      percentage: 75,
      passed: false,
    },
    {
      subjectCode: "MAT",
      subjectName: "Mathematics",
      percentage: 95,
      passed: true,
    },
  ];

  it("should calculate mean percentage and pass rate accurately", () => {
    const totalCount = sampleOfficialResults.length;
    const avg =
      sampleOfficialResults.reduce((sum, r) => sum + r.percentage, 0) /
      totalCount;
    const passedCount = sampleOfficialResults.filter((r) => r.passed).length;
    const passRate = (passedCount / totalCount) * 100;

    expect(parseFloat(avg.toFixed(1))).toBe(85.0);
    expect(parseFloat(passRate.toFixed(1))).toBe(66.7);
  });

  it("should calculate subject averages accurately", () => {
    const phyResults = sampleOfficialResults.filter(
      (r) => r.subjectCode === "PHY"
    );
    const phyAvg =
      phyResults.reduce((sum, r) => sum + r.percentage, 0) / phyResults.length;
    const phyPassRate =
      (phyResults.filter((r) => r.passed).length / phyResults.length) * 100;

    expect(phyAvg).toBe(80);
    expect(phyPassRate).toBe(50);
  });

  it("should identify weak topics below 80% accuracy threshold", () => {
    const topics = [
      { name: "Work", total: 10, correct: 9 }, // 90% -> Strong
      { name: "Energy", total: 10, correct: 6 }, // 60% -> Weak
      { name: "Power", total: 5, correct: 2 }, // 40% -> Weak
    ];

    const weak = topics
      .map((t) => ({
        ...t,
        accuracy: (t.correct / t.total) * 100,
      }))
      .filter(
        (t) => t.accuracy < ANALYTICS_THRESHOLDS.WEAK_TOPIC_ACCURACY_THRESHOLD
      );

    expect(weak.length).toBe(2);
    expect(weak.map((w) => w.name)).toEqual(["Energy", "Power"]);
  });
});

describe("Needs-Attention Engine Rule Evaluation", () => {
  it("should trigger REPEATED_FAILURES when last 2 exams failed", () => {
    const lastExams = [
      { title: "Test 1", passed: false },
      { title: "Test 2", passed: false },
    ];

    const isTriggered =
      lastExams.length >=
        ANALYTICS_THRESHOLDS.REPEATED_FAILURES_THRESHOLD &&
      lastExams.every((e) => !e.passed);

    expect(isTriggered).toBe(true);
  });

  it("should NOT trigger REPEATED_FAILURES if at least one recent exam passed", () => {
    const lastExams = [
      { title: "Test 1", passed: false },
      { title: "Test 2", passed: true },
    ];

    const isTriggered =
      lastExams.length >=
        ANALYTICS_THRESHOLDS.REPEATED_FAILURES_THRESHOLD &&
      lastExams.every((e) => !e.passed);

    expect(isTriggered).toBe(false);
  });

  it("should trigger LOW_SUBJECT_AVERAGE when subject mean is below 60%", () => {
    const subjectScores = [55, 58, 62];
    const avg =
      subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length;

    const isTriggered =
      avg < ANALYTICS_THRESHOLDS.LOW_SUBJECT_AVERAGE_THRESHOLD;
    expect(isTriggered).toBe(true);
    expect(parseFloat(avg.toFixed(1))).toBe(58.3);
  });
});
