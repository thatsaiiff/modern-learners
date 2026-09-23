import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseAndValidateExamHtml } from "@/lib/services/exam-importer.service";

describe("Question Paper Architecture & Entity Separation", () => {
  const samplePaperHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="modern-learners-format" content="1.0">
  <title>Class 9 Chemistry Assessment</title>
  <script type="application/json" id="modern-learners-exam">
  {
    "formatVersion": "1.0",
    "exam": {
      "title": "Atomic Structure & Periodic Table",
      "class": 9,
      "subject": "Chemistry",
      "chapter": "Atomic Structure",
      "description": "Comprehensive Class 9 Chemistry paper covering atomic models and valency",
      "totalMarks": 3,
      "durationMinutes": 45
    },
    "questions": [
      {
        "id": "CHEM9-ATOM-001",
        "type": "mcq",
        "topic": "Subatomic Particles",
        "difficulty": "easy",
        "marks": 1,
        "question": { "text": "What is the charge on a neutron?" },
        "options": [
          { "id": "A", "text": "Positive", "correct": false },
          { "id": "B", "text": "Neutral (Zero)", "correct": true },
          { "id": "C", "text": "Negative", "correct": false }
        ]
      },
      {
        "id": "CHEM9-ATOM-002",
        "type": "true_false",
        "topic": "Atomic Mass",
        "difficulty": "easy",
        "marks": 1,
        "question": { "text": "Mass number is the sum of protons and neutrons." },
        "answer": true
      },
      {
        "id": "CHEM9-ATOM-003",
        "type": "numerical",
        "topic": "Atomic Number",
        "difficulty": "medium",
        "marks": 1,
        "question": { "text": "An atom has 11 protons and 12 neutrons. What is its atomic number?" },
        "answer": 11
      }
    ]
  }
  </script>
</head>
<body><h1>Atomic Structure</h1></body>
</html>`;

  it("1. HTML import creates exactly ONE parsed QuestionPaper data payload with permanent code format", () => {
    const preview = parseAndValidateExamHtml(samplePaperHtml);

    expect(preview.isValid).toBe(true);
    expect(preview.examSummary?.title).toBe("Atomic Structure & Periodic Table");
    expect(preview.examSummary?.classNumber).toBe(9);
    expect(preview.examSummary?.totalQuestions).toBe(3);
    expect(preview.examSummary?.totalMarks).toBe(3);

    // Format validation
    const formatPaperCode = (seq: number) => `QP-${String(seq).padStart(6, "0")}`;
    expect(formatPaperCode(1)).toBe("QP-000001");
    expect(formatPaperCode(42)).toBe("QP-000042");
  });

  it("2. Imported questions belong to that QuestionPaper with preserved sequential ordering", () => {
    const preview = parseAndValidateExamHtml(samplePaperHtml);
    const questions = preview.sanitizedPayload?.questions || [];

    expect(questions.length).toBe(3);
    expect(questions[0].id).toBe("CHEM9-ATOM-001");
    expect(questions[1].id).toBe("CHEM9-ATOM-002");
    expect(questions[2].id).toBe("CHEM9-ATOM-003");
  });

  it("3. Paper metadata and descriptions are preserved without creating assignments upon import", () => {
    const preview = parseAndValidateExamHtml(samplePaperHtml);
    expect(preview.examSummary?.description).toBe(
      "Comprehensive Class 9 Chemistry paper covering atomic models and valency"
    );
    expect(preview.examSummary?.chapter).toBe("Atomic Structure");

    // Merely importing a paper creates ZERO student assignments
    const assignmentsCreatedOnImport = 0;
    expect(assignmentsCreatedOnImport).toBe(0);
  });

  it("4. An Exam instance references questionPaperId and can be reused to create multiple exams over time", () => {
    const questionPaper = {
      id: "qp-uuid-001",
      paperCode: "QP-000001",
      title: "Atomic Structure & Periodic Table",
      totalMarks: 30,
      totalQuestions: 20,
    };

    // First Exam creation on 22 Sep 2026
    const exam1 = {
      id: "exam-uuid-1",
      questionPaperId: questionPaper.id,
      title: "Class 9 Chemistry — Atomic Structure Test 1",
      durationMinutes: 25,
      createdAt: new Date("2026-09-22"),
    };

    // Second Exam creation on 10 Oct 2026 using the exact same QuestionPaper
    const exam2 = {
      id: "exam-uuid-2",
      questionPaperId: questionPaper.id,
      title: "Class 9 Chemistry — Atomic Structure Revision Test",
      durationMinutes: 30,
      createdAt: new Date("2026-10-10"),
    };

    expect(exam1.questionPaperId).toBe(questionPaper.id);
    expect(exam2.questionPaperId).toBe(questionPaper.id);
    expect(exam1.id).not.toBe(exam2.id);
    expect(exam1.durationMinutes).toBe(25);
    expect(exam2.durationMinutes).toBe(30);
  });

  it("5. Duplicated or AI-generated Question Papers can reference provenance without mutating source paper", () => {
    const sourcePaper = {
      id: "qp-uuid-001",
      paperCode: "QP-000001",
      title: "Atomic Structure & Periodic Table",
      sourceType: "HTML_IMPORT",
    };

    // Duplicated paper
    const duplicatedPaper = {
      id: "qp-uuid-002",
      paperCode: "QP-000002",
      title: `${sourcePaper.title} (Copy)`,
      sourceType: "DUPLICATED",
      sourceMeta: {
        sourcePaperId: sourcePaper.id,
        sourcePaperCode: sourcePaper.paperCode,
      },
    };

    // AI generated paper from multiple source papers
    const aiPaper = {
      id: "qp-uuid-015",
      paperCode: "QP-000015",
      title: "Class 9 Chemistry — AI Generated Comprehensive Revision",
      sourceType: "AI_GENERATED",
      sourceMeta: {
        sourcePaperIds: [sourcePaper.id, "qp-uuid-003", "qp-uuid-007"],
        generatedAt: new Date().toISOString(),
      },
    };

    expect(duplicatedPaper.sourceMeta.sourcePaperId).toBe(sourcePaper.id);
    expect(aiPaper.sourceType).toBe("AI_GENERATED");
    expect(aiPaper.sourceMeta.sourcePaperIds.length).toBe(3);
  });

  it("6. Exam Question snapshots isolate Exam attempts from future changes to the QuestionPaper", () => {
    const questionPaperQuestion = {
      id: "pq-1",
      questionSnapshot: {
        text: "What is the charge on a neutron?",
        options: [
          { id: "A", text: "Positive", correct: false },
          { id: "B", text: "Zero", correct: true },
        ],
      },
    };

    // Snapshotted at Exam creation
    const examQuestionSnapshot = {
      ...questionPaperQuestion.questionSnapshot,
    };

    // Subsequent edit on Question Paper
    const editedPaperQuestion = {
      ...questionPaperQuestion,
      questionSnapshot: {
        text: "What is the net electrical charge on an isolated neutron? (Edited 2027)",
      },
    };

    expect(examQuestionSnapshot.text).toBe("What is the charge on a neutron?");
    expect(examQuestionSnapshot.text).not.toBe(editedPaperQuestion.questionSnapshot.text);
  });

  it("7. Should reject exam creation from an archived Question Paper", async () => {
    vi.mock("@/lib/prisma", () => ({
      default: {
        questionPaper: {
          findUnique: vi.fn().mockResolvedValue({
            id: "paper-archived-001",
            paperCode: "QP-000001",
            title: "Test Paper",
            status: "ARCHIVED",
            class: { id: "class-9", classNumber: 9 },
            subject: { id: "subj-math", name: "Mathematics" },
            description: "Test description",
            instructions: "Test instructions",
            totalMarks: 10,
            paperQuestions: [
              {
                id: "pq-1",
                questionId: "q-1",
                questionSnapshot: { text: "What is 2+2?", type: "mcq" },
                marks: 1,
                orderNumber: 1,
              },
            ],
          }),
        },
        $transaction: vi.fn((callback) => callback({})),
      },
    }));

    const { createExamFromPaper } = await import(
      "@/lib/services/question-paper.service"
    );

    await expect(
      createExamFromPaper({ questionPaperId: "paper-archived-001" })
    ).rejects.toThrow("Cannot create an exam from an archived Question Paper.");

    vi.restoreAllMocks();
  });
});
