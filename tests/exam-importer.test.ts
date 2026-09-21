import { describe, it, expect } from "vitest";
import { parseAndValidateExamHtml } from "@/lib/services/exam-importer.service";

describe("HTML Exam Importer — Valid Documents", () => {
  it("should successfully parse and validate a compliant Modern Learners v1.0 exam", () => {
    const validHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="modern-learners-format" content="1.0">
  <script type="application/json" id="modern-learners-exam">
  {
    "formatVersion": "1.0",
    "exam": {
      "title": "Class 8 Physics Test",
      "class": 8,
      "subject": "Physics",
      "chapter": "Work, Energy & Power",
      "totalMarks": 4,
      "durationMinutes": 30
    },
    "questions": [
      {
        "id": "PHY8-WEP-001",
        "type": "mcq",
        "topic": "Work",
        "difficulty": "easy",
        "marks": 1,
        "question": { "text": "What is the SI unit of work?" },
        "options": [
          { "id": "A", "text": "Newton", "correct": false },
          { "id": "B", "text": "Joule", "correct": true },
          { "id": "C", "text": "Watt", "correct": false }
        ]
      },
      {
        "id": "PHY8-WEP-002",
        "type": "true_false",
        "topic": "Work",
        "difficulty": "easy",
        "marks": 1,
        "question": { "text": "Work can be negative." },
        "answer": true
      },
      {
        "id": "PHY8-WEP-003",
        "type": "numerical",
        "topic": "Work",
        "difficulty": "medium",
        "marks": 2,
        "question": { "text": "Calculate work for 10 N and 5 m." },
        "answer": { "value": 50, "unit": "J" }
      }
    ]
  }
  </script>
</head>
<body><h1>Physics Test</h1></body>
</html>`;

    const result = parseAndValidateExamHtml(validHtml);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.examSummary?.title).toBe("Class 8 Physics Test");
    expect(result.examSummary?.classNumber).toBe(8);
    expect(result.examSummary?.totalQuestions).toBe(3);
    expect(result.examSummary?.totalMarks).toBe(4);
    expect(result.statistics.typeCounts["mcq"]).toBe(1);
    expect(result.statistics.typeCounts["true_false"]).toBe(1);
    expect(result.statistics.typeCounts["numerical"]).toBe(1);
  });
});

describe("HTML Exam Importer — Validation Failures", () => {
  it("should reject document missing format script tag", () => {
    const invalidHtml = "<html><body><h1>Empty Exam</h1></body></html>";
    const result = parseAndValidateExamHtml(invalidHtml);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing exam JSON payload"))).toBe(true);
  });

  it("should reject invalid JSON content", () => {
    const invalidJsonHtml = `<html><head>
      <script type="application/json" id="modern-learners-exam">
        { "formatVersion": "1.0", "exam": { title: unquoted } }
      </script>
    </head></html>`;

    const result = parseAndValidateExamHtml(invalidJsonHtml);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid JSON"))).toBe(true);
  });

  it("should reject unsupported format version", () => {
    const invalidVersionHtml = `<html><head>
      <script type="application/json" id="modern-learners-exam">
      {
        "formatVersion": "2.0",
        "exam": { "title": "Test", "class": 8, "subject": "Physics" },
        "questions": [
          {
            "id": "Q1",
            "type": "true_false",
            "marks": 1,
            "question": { "text": "Sample" },
            "answer": true
          }
        ]
      }
      </script>
    </head></html>`;

    const result = parseAndValidateExamHtml(invalidVersionHtml);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unsupported format version"))).toBe(true);
  });

  it("should reject duplicate question IDs", () => {
    const duplicateIdsHtml = `<html><head>
      <script type="application/json" id="modern-learners-exam">
      {
        "formatVersion": "1.0",
        "exam": { "title": "Test", "class": 8, "subject": "Physics" },
        "questions": [
          { "id": "PHY8-001", "type": "true_false", "marks": 1, "question": { "text": "Q1" }, "answer": true },
          { "id": "PHY8-001", "type": "true_false", "marks": 1, "question": { "text": "Q2" }, "answer": false }
        ]
      }
      </script>
    </head></html>`;

    const result = parseAndValidateExamHtml(duplicateIdsHtml);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate Question ID "PHY8-001"'))).toBe(true);
  });

  it("should reject MCQ with multiple correct options", () => {
    const multiCorrectMcqHtml = `<html><head>
      <script type="application/json" id="modern-learners-exam">
      {
        "formatVersion": "1.0",
        "exam": { "title": "Test", "class": 8, "subject": "Physics" },
        "questions": [
          {
            "id": "PHY8-001",
            "type": "mcq",
            "marks": 1,
            "question": { "text": "Question text" },
            "options": [
              { "id": "A", "text": "Opt A", "correct": true },
              { "id": "B", "text": "Opt B", "correct": true }
            ]
          }
        ]
      }
      </script>
    </head></html>`;

    const result = parseAndValidateExamHtml(multiCorrectMcqHtml);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Multiple correct answers found for MCQ"))).toBe(true);
  });

  it("should reject MCQ with missing correct option", () => {
    const noCorrectMcqHtml = `<html><head>
      <script type="application/json" id="modern-learners-exam">
      {
        "formatVersion": "1.0",
        "exam": { "title": "Test", "class": 8, "subject": "Physics" },
        "questions": [
          {
            "id": "PHY8-001",
            "type": "mcq",
            "marks": 1,
            "question": { "text": "Question text" },
            "options": [
              { "id": "A", "text": "Opt A", "correct": false },
              { "id": "B", "text": "Opt B", "correct": false }
            ]
          }
        ]
      }
      </script>
    </head></html>`;

    const result = parseAndValidateExamHtml(noCorrectMcqHtml);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Missing correct answer for MCQ"))).toBe(true);
  });

  it("should detect total marks mismatch", () => {
    const mismatchMarksHtml = `<html><head>
      <script type="application/json" id="modern-learners-exam">
      {
        "formatVersion": "1.0",
        "exam": { "title": "Test", "class": 8, "subject": "Physics", "totalMarks": 10 },
        "questions": [
          { "id": "Q1", "type": "true_false", "marks": 2, "question": { "text": "Q1" }, "answer": true }
        ]
      }
      </script>
    </head></html>`;

    const result = parseAndValidateExamHtml(mismatchMarksHtml);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Total marks mismatch"))).toBe(true);
  });

  it("should sanitize script and event handler tags in question texts during parsing", () => {
    const xssHtml = `<html><head>
      <script type="application/json" id="modern-learners-exam">
      {
        "formatVersion": "1.0",
        "exam": { "title": "Security Test", "class": 8, "subject": "Physics" },
        "questions": [
          {
            "id": "SEC-001",
            "type": "true_false",
            "marks": 1,
            "question": { "text": "What is force? <img src=x onerror=hackApp() />" },
            "answer": true,
            "explanation": "Force is push or pull. <iframe src=evil.com></iframe>"
          }
        ]
      }
      </script>
    </head></html>`;

    const result = parseAndValidateExamHtml(xssHtml);
    expect(result.isValid).toBe(true);
    const parsedQ = result.sanitizedPayload?.questions[0];
    expect(parsedQ?.question.text).not.toContain("onerror");
    expect(parsedQ?.question.text).not.toContain("hackApp");
    expect(parsedQ?.explanation).not.toContain("<iframe");
    expect(parsedQ?.explanation).not.toContain("evil.com");
  });
});
