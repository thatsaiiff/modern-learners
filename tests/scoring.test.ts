import { describe, it, expect } from "vitest";
import {
  evaluateQuestionAnswer,
  determineGrade,
} from "@/lib/services/grading.service";

describe("Scoring Engine: MCQ", () => {
  const mcqSnapshot = {
    customId: "PHY8-WEP-001",
    type: "mcq",
    marks: 2.0,
    options: [
      { id: "A", text: "Newton", correct: false },
      { id: "B", text: "Joule", correct: true },
      { id: "C", text: "Watt", correct: false },
    ],
    correctAnswer: "B",
  };

  it("should award full marks for correct MCQ option", () => {
    const res = evaluateQuestionAnswer(mcqSnapshot, { selectedOptions: ["B"] });
    expect(res.isCorrect).toBe(true);
    expect(res.marksAwarded).toBe(2.0);
    expect(res.status).toBe("CORRECT");
  });

  it("should award 0 marks for incorrect MCQ option (when negative marking disabled)", () => {
    const res = evaluateQuestionAnswer(mcqSnapshot, { selectedOptions: ["A"] });
    expect(res.isCorrect).toBe(false);
    expect(res.marksAwarded).toBe(0);
    expect(res.status).toBe("WRONG");
  });

  it("should deduct marks for incorrect MCQ when negative marking is enabled", () => {
    const res = evaluateQuestionAnswer(
      mcqSnapshot,
      { selectedOptions: ["C"] },
      true,
      0.5
    );
    expect(res.isCorrect).toBe(false);
    expect(res.marksAwarded).toBe(-0.5);
    expect(res.status).toBe("WRONG");
  });

  it("should award 0 marks for unanswered MCQ without negative penalty", () => {
    const res = evaluateQuestionAnswer(mcqSnapshot, undefined, true, 0.5);
    expect(res.isCorrect).toBe(false);
    expect(res.marksAwarded).toBe(0);
    expect(res.status).toBe("UNANSWERED");
  });
});

describe("Scoring Engine: True / False", () => {
  const tfSnapshot = {
    customId: "PHY8-WEP-002",
    type: "true_false",
    marks: 1.0,
    correctAnswer: true,
  };

  it("should award marks for correct True/False selection", () => {
    const res = evaluateQuestionAnswer(tfSnapshot, { selectedOptions: ["true"] });
    expect(res.isCorrect).toBe(true);
    expect(res.marksAwarded).toBe(1.0);
    expect(res.status).toBe("CORRECT");
  });

  it("should mark incorrect for wrong True/False selection", () => {
    const res = evaluateQuestionAnswer(tfSnapshot, { selectedOptions: ["false"] });
    expect(res.isCorrect).toBe(false);
    expect(res.marksAwarded).toBe(0);
    expect(res.status).toBe("WRONG");
  });
});

describe("Scoring Engine: Multiple Correct (All-or-Nothing)", () => {
  const multiSnapshot = {
    customId: "PHY8-WEP-003",
    type: "multiple_correct",
    marks: 3.0,
    options: [
      { id: "A", text: "Mass", correct: true },
      { id: "B", text: "Velocity", correct: false },
      { id: "C", text: "Energy", correct: true },
      { id: "D", text: "Displacement", correct: false },
    ],
    correctAnswer: ["A", "C"],
  };

  it("should award full marks for exact multiple correct set", () => {
    const res = evaluateQuestionAnswer(multiSnapshot, { selectedOptions: ["C", "A"] });
    expect(res.isCorrect).toBe(true);
    expect(res.marksAwarded).toBe(3.0);
    expect(res.status).toBe("CORRECT");
  });

  it("should award 0 marks for partial selection under all-or-nothing policy", () => {
    const res = evaluateQuestionAnswer(multiSnapshot, { selectedOptions: ["A"] });
    expect(res.isCorrect).toBe(false);
    expect(res.marksAwarded).toBe(0);
    expect(res.status).toBe("WRONG");
  });

  it("should award 0 marks if extraneous incorrect option is selected", () => {
    const res = evaluateQuestionAnswer(multiSnapshot, { selectedOptions: ["A", "B", "C"] });
    expect(res.isCorrect).toBe(false);
    expect(res.marksAwarded).toBe(0);
    expect(res.status).toBe("WRONG");
  });
});

describe("Scoring Engine: Numerical", () => {
  const numericalSnapshot = {
    customId: "PHY8-WEP-004",
    type: "numerical",
    marks: 2.0,
    correctAnswer: { value: 50.0, tolerance: 0.5 },
  };

  it("should award full marks for exact numerical answer", () => {
    const res = evaluateQuestionAnswer(numericalSnapshot, { numericAnswer: 50.0 });
    expect(res.isCorrect).toBe(true);
    expect(res.marksAwarded).toBe(2.0);
    expect(res.status).toBe("CORRECT");
  });

  it("should award full marks within configured tolerance (e.g. 50.3 for 50 ± 0.5)", () => {
    const res = evaluateQuestionAnswer(numericalSnapshot, { numericAnswer: 50.3 });
    expect(res.isCorrect).toBe(true);
    expect(res.marksAwarded).toBe(2.0);
    expect(res.status).toBe("CORRECT");
  });

  it("should mark wrong when answer exceeds tolerance (e.g. 50.8 for 50 ± 0.5)", () => {
    const res = evaluateQuestionAnswer(numericalSnapshot, { numericAnswer: 50.8 });
    expect(res.isCorrect).toBe(false);
    expect(res.marksAwarded).toBe(0);
    expect(res.status).toBe("WRONG");
  });

  it("should handle null or invalid numerical inputs safely", () => {
    const res = evaluateQuestionAnswer(numericalSnapshot, { numericAnswer: null });
    expect(res.status).toBe("UNANSWERED");
  });
});

describe("Grading Rules & Tier Mapping", () => {
  const defaultRules = [
    { minPercentage: 100, maxPercentage: 100, label: "OP — Outstandingly Perfect" },
    { minPercentage: 95, maxPercentage: 99.99, label: "Outstanding" },
    { minPercentage: 90, maxPercentage: 94.99, label: "Excellent" },
    { minPercentage: 80, maxPercentage: 89.99, label: "Pass" },
    { minPercentage: 0, maxPercentage: 79.99, label: "Fail — Needs Improvement" },
  ];

  it("should map 100% to OP", () => {
    const g = determineGrade(100, defaultRules);
    expect(g.grade).toBe("OP");
    expect(g.performanceLabel).toBe("OP — Outstandingly Perfect");
  });

  it("should map 96% to Outstanding", () => {
    const g = determineGrade(96, defaultRules);
    expect(g.grade).toBe("Outstanding");
  });

  it("should map 92% to Excellent", () => {
    const g = determineGrade(92, defaultRules);
    expect(g.grade).toBe("Excellent");
  });

  it("should map 80% to Pass (threshold)", () => {
    const g = determineGrade(80, defaultRules);
    expect(g.grade).toBe("Pass");
  });

  it("should map 79.9% to Fail — Needs Improvement", () => {
    const g = determineGrade(79.9, defaultRules);
    expect(g.grade).toBe("Fail");
    expect(g.performanceLabel).toBe("Fail — Needs Improvement");
  });
});
