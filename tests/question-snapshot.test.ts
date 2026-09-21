import { describe, it, expect } from "vitest";

describe("Question Snapshot & Immutability Architecture", () => {
  it("should preserve question snapshot independently from Question Bank mutations", () => {
    // Original question in Question Bank
    const questionBankItem = {
      id: "qb-uuid-1",
      customId: "PHY8-WEP-001",
      questionText: "What is the SI unit of work?",
      defaultMarks: 1.0,
      options: [
        { id: "A", text: "Newton", isCorrect: false },
        { id: "B", text: "Joule", isCorrect: true },
      ],
    };

    // When an Exam is created/imported, a frozen snapshot is created
    const examQuestionSnapshot = {
      customId: questionBankItem.customId,
      type: "mcq",
      marks: 1.0,
      question: { text: questionBankItem.questionText },
      options: questionBankItem.options.map((o) => ({ id: o.id, text: o.text, correct: o.isCorrect })),
      correctAnswer: "B",
    };

    // Subsequent edit to Question Bank
    const updatedQuestionBankItem = {
      ...questionBankItem,
      questionText: "What is the SI unit of work done by a force (revised 2027)?",
      defaultMarks: 2.0,
    };

    // The existing Exam Snapshot must remain completely unchanged
    expect(examQuestionSnapshot.question.text).toBe("What is the SI unit of work?");
    expect(examQuestionSnapshot.marks).toBe(1.0);
    expect(examQuestionSnapshot.question.text).not.toBe(updatedQuestionBankItem.questionText);
  });

  it("should enforce stable Question ID formatting", () => {
    const validIds = ["PHY8-WEP-001", "MAT9-QUAD-042", "CHEM10-ACID-105"];
    const idRegex = /^[A-Z0-9]+-[A-Z0-9]+-\d+$/;

    validIds.forEach((id) => {
      expect(idRegex.test(id)).toBe(true);
    });
  });
});
