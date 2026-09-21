import * as cheerio from "cheerio";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { sanitizeQuestionHtml } from "./sanitizer.service";
import { logAudit } from "./audit.service";
import { QuestionType, QuestionDifficulty } from "@prisma/client";

// Zod schemas for validation
export const importedOptionSchema = z.object({
  id: z.string().min(1, "Option ID is required"),
  text: z.string().min(1, "Option text is required"),
  correct: z.boolean(),
});

export const importedQuestionSchema = z.object({
  id: z.string().min(1, "Question ID is required"),
  type: z.enum([
    "mcq",
    "true_false",
    "multiple_correct",
    "numerical",
    "short_answer",
    "long_answer",
    "image_based",
  ]),
  topic: z.string().optional(),
  chapter: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  marks: z.number().positive("Marks must be greater than 0"),
  question: z.object({
    text: z.string().min(1, "Question text is required"),
    image: z
      .object({
        src: z.string(),
        alt: z.string().optional(),
        width: z.number().optional(),
      })
      .optional(),
  }),
  options: z.array(importedOptionSchema).optional(),
  answer: z
    .union([
      z.boolean(),
      z.number(),
      z.object({
        value: z.number(),
        unit: z.string().optional(),
        tolerance: z.number().min(0).optional(),
      }),
    ])
    .optional(),
  explanation: z.string().optional(),
  evaluation: z
    .object({
      mode: z.string().optional(),
      rubric: z.record(z.any()).optional(),
    })
    .optional(),
});

export const importedExamSchema = z.object({
  formatVersion: z.literal("1.0", {
    errorMap: () => ({ message: "Unsupported format version. Expected '1.0'" }),
  }),
  exam: z.object({
    title: z.string().min(1, "Exam title is required"),
    class: z.number().int().min(1).max(12, "Class must be between 1 and 12"),
    subject: z.string().min(1, "Subject is required"),
    chapter: z.string().optional(),
    description: z.string().optional(),
    instructions: z.string().optional(),
    totalMarks: z.number().positive().optional(),
    durationMinutes: z.number().int().positive().optional(),
    passingPercentage: z.number().min(0).max(100).optional(),
    negativeMarking: z
      .object({
        enabled: z.boolean().default(false),
        wrongAnswerMarks: z.number().min(0).default(0),
      })
      .optional(),
    randomization: z
      .object({
        questions: z.boolean().default(false),
        options: z.boolean().default(false),
      })
      .optional(),
  }),
  questions: z.array(importedQuestionSchema).min(1, "Exam must contain at least one question"),
});

export type ImportedExamPayload = z.infer<typeof importedExamSchema>;
export type ImportedQuestion = z.infer<typeof importedQuestionSchema>;

export interface ImportPreviewResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  examSummary: {
    title: string;
    classNumber: number;
    subject: string;
    chapter?: string;
    description?: string;
    durationMinutes: number;
    totalMarks: number;
    calculatedMarks: number;
    passingPercentage: number;
    totalQuestions: number;
  } | null;
  statistics: {
    typeCounts: Record<string, number>;
    difficultyCounts: Record<string, number>;
  };
  sanitizedPayload: ImportedExamPayload | null;
}

/**
 * Parses, validates, and sanitizes untrusted HTML examination papers
 */
export function parseAndValidateExamHtml(htmlContent: string): ImportPreviewResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!htmlContent || typeof htmlContent !== "string" || htmlContent.trim().length === 0) {
    return {
      isValid: false,
      errors: ["Uploaded file is empty."],
      warnings: [],
      examSummary: null,
      statistics: { typeCounts: {}, difficultyCounts: {} },
      sanitizedPayload: null,
    };
  }

  // 1. Parse HTML DOM using Cheerio
  const $ = cheerio.load(htmlContent);

  // 2. Check Modern Learners Format meta tag
  const formatMeta = $('meta[name="modern-learners-format"]').attr("content");
  if (!formatMeta) {
    warnings.push("Missing <meta name='modern-learners-format' content='1.0'> tag in HTML header.");
  } else if (formatMeta !== "1.0") {
    errors.push(`Unsupported modern-learners-format version "${formatMeta}". Expected "1.0".`);
  }

  // 3. Locate and extract JSON payload
  const scriptTag = $("script#modern-learners-exam");
  if (!scriptTag || scriptTag.length === 0) {
    return {
      isValid: false,
      errors: [
        "Missing exam JSON payload script tag. Expected <script type='application/json' id='modern-learners-exam'>",
      ],
      warnings,
      examSummary: null,
      statistics: { typeCounts: {}, difficultyCounts: {} },
      sanitizedPayload: null,
    };
  }

  let rawJson: unknown;
  try {
    const rawScriptContent = scriptTag.html() || "";
    rawJson = JSON.parse(rawScriptContent.trim());
  } catch (err: unknown) {
    const jsonErr = err as Error;
    return {
      isValid: false,
      errors: [`Invalid JSON in #modern-learners-exam script tag: ${jsonErr.message}`],
      warnings,
      examSummary: null,
      statistics: { typeCounts: {}, difficultyCounts: {} },
      sanitizedPayload: null,
    };
  }

  // 4. Validate schema structure with Zod
  const parsed = importedExamSchema.safeParse(rawJson);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      errors.push(`${path ? `[${path}] ` : ""}${issue.message}`);
    }
    return {
      isValid: false,
      errors,
      warnings,
      examSummary: null,
      statistics: { typeCounts: {}, difficultyCounts: {} },
      sanitizedPayload: null,
    };
  }

  const payload = parsed.data;

  // 5. Deep semantic validation on questions & IDs
  const seenIds = new Set<string>();
  let calculatedMarks = 0;
  const typeCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };

  const sanitizedQuestions: ImportedQuestion[] = [];

  for (let i = 0; i < payload.questions.length; i++) {
    const q = payload.questions[i];
    const qNum = i + 1;

    // Check Question ID uniqueness
    if (seenIds.has(q.id)) {
      errors.push(`Duplicate Question ID "${q.id}" found at Question #${qNum}.`);
    }
    seenIds.add(q.id);

    calculatedMarks += q.marks;
    typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
    difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;

    // Sanitize question text & explanation
    const sanitizedText = sanitizeQuestionHtml(q.question.text);
    const sanitizedExplanation = q.explanation ? sanitizeQuestionHtml(q.explanation) : undefined;

    // Type-specific answer validation
    if (q.type === "mcq") {
      if (!q.options || q.options.length < 2) {
        errors.push(`Question #${qNum} (${q.id}): MCQ must provide at least 2 options.`);
      } else {
        const correctOptions = q.options.filter((o) => o.correct === true);
        if (correctOptions.length === 0) {
          errors.push(`Question #${qNum} (${q.id}): Missing correct answer for MCQ.`);
        } else if (correctOptions.length > 1) {
          errors.push(
            `Question #${qNum} (${q.id}): Multiple correct answers found for MCQ. Single MCQ must have exactly 1 correct option.`
          );
        }
      }
    } else if (q.type === "true_false") {
      if (typeof q.answer !== "boolean") {
        errors.push(`Question #${qNum} (${q.id}): True/False question must provide a boolean answer (true/false).`);
      }
    } else if (q.type === "multiple_correct") {
      if (!q.options || q.options.length < 2) {
        errors.push(`Question #${qNum} (${q.id}): Multiple Correct question must provide at least 2 options.`);
      } else {
        const correctCount = q.options.filter((o) => o.correct === true).length;
        if (correctCount === 0) {
          errors.push(`Question #${qNum} (${q.id}): Multiple Correct question must have at least 1 correct option marked.`);
        }
      }
    } else if (q.type === "numerical") {
      if (q.answer === undefined || q.answer === null) {
        errors.push(`Question #${qNum} (${q.id}): Numerical question must specify an answer value.`);
      }
    }

    // Sanitize options text if present
    const sanitizedOptions = q.options?.map((opt) => ({
      ...opt,
      text: sanitizeQuestionHtml(opt.text),
    }));

    sanitizedQuestions.push({
      ...q,
      question: {
        ...q.question,
        text: sanitizedText,
      },
      options: sanitizedOptions,
      explanation: sanitizedExplanation,
    });
  }

  // 6. Total Marks Validation
  const declaredMarks = payload.exam.totalMarks || calculatedMarks;
  if (payload.exam.totalMarks && Math.abs(payload.exam.totalMarks - calculatedMarks) > 0.001) {
    errors.push(
      `Total marks mismatch: Declared totalMarks is ${payload.exam.totalMarks}, but sum of question marks is ${calculatedMarks}.`
    );
  }

  const isValid = errors.length === 0;

  const sanitizedPayload: ImportedExamPayload = {
    ...payload,
    exam: {
      ...payload.exam,
      totalMarks: declaredMarks,
    },
    questions: sanitizedQuestions,
  };

  return {
    isValid,
    errors,
    warnings,
    examSummary: {
      title: payload.exam.title,
      classNumber: payload.exam.class,
      subject: payload.exam.subject,
      chapter: payload.exam.chapter,
      description: payload.exam.description,
      durationMinutes: payload.exam.durationMinutes || 60,
      totalMarks: declaredMarks,
      calculatedMarks,
      passingPercentage: payload.exam.passingPercentage || 80,
      totalQuestions: payload.questions.length,
    },
    statistics: {
      typeCounts,
      difficultyCounts,
    },
    sanitizedPayload: isValid ? sanitizedPayload : null,
  };
}

export interface ConfirmExamImportInput {
  htmlContent: string;
  classNumberOverride?: number;
  subjectCodeOverride?: string;
  chapterIdOverride?: string;
  durationMinutesOverride?: number;
  passingPercentageOverride?: number;
  addToQuestionBank?: boolean;
  startAt?: string | Date;
  loginDeadline?: string | Date;
}

/**
 * Confirms import and persists the exam and immutable question snapshots to the database
 */
export async function confirmAndPersistExam(
  input: ConfirmExamImportInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const preview = parseAndValidateExamHtml(input.htmlContent);
  if (!preview.isValid || !preview.sanitizedPayload) {
    throw new Error(`Cannot import invalid exam: ${preview.errors.join("; ")}`);
  }

  const { exam: examMeta, questions } = preview.sanitizedPayload;

  const targetClassNumber = input.classNumberOverride || examMeta.class;
  const targetDuration = input.durationMinutesOverride || examMeta.durationMinutes || 60;
  const targetPassingPercentage = input.passingPercentageOverride || examMeta.passingPercentage || 80.0;

  // 1. Resolve Class
  const classRecord = await prisma.class.findUnique({
    where: { classNumber: targetClassNumber },
  });
  if (!classRecord) {
    throw new Error(`Class ${targetClassNumber} not found in database.`);
  }

  // 2. Resolve Subject (by code or name)
  let subjectRecord = null;
  if (input.subjectCodeOverride) {
    subjectRecord = await prisma.subject.findUnique({
      where: { code: input.subjectCodeOverride },
    });
  } else {
    subjectRecord = await prisma.subject.findFirst({
      where: {
        OR: [
          { code: { equals: examMeta.subject.toUpperCase(), mode: "insensitive" } },
          { name: { contains: examMeta.subject, mode: "insensitive" } },
        ],
      },
    });
  }

  if (!subjectRecord) {
    // Create new subject if not existing
    const generatedCode = examMeta.subject.slice(0, 4).toUpperCase();
    subjectRecord = await prisma.subject.create({
      data: {
        name: examMeta.subject,
        code: generatedCode,
        isActive: true,
      },
    });
  }

  // 3. Resolve Chapter (if specified)
  let chapterId = input.chapterIdOverride || null;
  if (!chapterId && examMeta.chapter) {
    const existingChapter = await prisma.chapter.findFirst({
      where: {
        classId: classRecord.id,
        subjectId: subjectRecord.id,
        name: { equals: examMeta.chapter, mode: "insensitive" },
      },
    });

    if (existingChapter) {
      chapterId = existingChapter.id;
    } else {
      const newChapter = await prisma.chapter.create({
        data: {
          classId: classRecord.id,
          subjectId: subjectRecord.id,
          name: examMeta.chapter,
          description: `Imported with exam ${examMeta.title}`,
        },
      });
      chapterId = newChapter.id;
    }
  }

  const startAt = input.startAt ? new Date(input.startAt) : new Date();
  const loginDeadline = input.loginDeadline
    ? new Date(input.loginDeadline)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days window by default

  // 4. Execute atomic database persistence
  return await prisma.$transaction(async (tx) => {
    // Create Exam Record
    const exam = await tx.exam.create({
      data: {
        title: examMeta.title,
        classId: classRecord.id,
        subjectId: subjectRecord.id,
        chapterId,
        description: examMeta.description || null,
        instructions: examMeta.instructions || null,
        startAt,
        loginDeadline,
        durationMinutes: targetDuration,
        totalMarks: examMeta.totalMarks || preview.examSummary!.totalMarks,
        passingPercentage: targetPassingPercentage,
        negativeMarkingEnabled: examMeta.negativeMarking?.enabled || false,
        negativeMarkValue: examMeta.negativeMarking?.wrongAnswerMarks || 0,
        randomizeQuestions: examMeta.randomization?.questions || false,
        randomizeOptions: examMeta.randomization?.options || false,
        status: "DRAFT",
        formatVersion: "1.0",
        createdBy: actor?.userId || null,
      },
    });

    // Create default grading rules snapshot
    const defaultGradingRules = [
      { minPercentage: 100, maxPercentage: 100, label: "OP — Outstandingly Perfect", displayOrder: 1 },
      { minPercentage: 95, maxPercentage: 99.99, label: "Outstanding", displayOrder: 2 },
      { minPercentage: 90, maxPercentage: 94.99, label: "Excellent", displayOrder: 3 },
      { minPercentage: 80, maxPercentage: 89.99, label: "Pass", displayOrder: 4 },
      { minPercentage: 0, maxPercentage: 79.99, label: "Fail — Needs Improvement", displayOrder: 5 },
    ];

    for (const rule of defaultGradingRules) {
      await tx.examGradingRule.create({
        data: {
          examId: exam.id,
          ...rule,
        },
      });
    }

    // Process and snapshot each question
    const examQuestions = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let questionBankId: string | null = null;

      // Question type map
      const mappedType = q.type.toUpperCase() as QuestionType;
      const mappedDifficulty = q.difficulty.toUpperCase() as QuestionDifficulty;

      // Question Bank persistence (optional / default true)
      if (input.addToQuestionBank !== false) {
        // Upsert question in Question Bank
        const existingQ = await tx.question.findUnique({
          where: { customId: q.id },
        });

        if (existingQ) {
          questionBankId = existingQ.id;
        } else {
          const newQ = await tx.question.create({
            data: {
              customId: q.id,
              classId: classRecord.id,
              subjectId: subjectRecord.id,
              chapterId,
              questionType: mappedType,
              difficulty: mappedDifficulty,
              questionText: q.question.text,
              explanation: q.explanation || null,
              defaultMarks: q.marks,
              imageSrc: q.question.image?.src || null,
              imageAlt: q.question.image?.alt || null,
              isActive: true,
            },
          });
          questionBankId = newQ.id;

          // Create Options if applicable
          if (q.options && q.options.length > 0) {
            for (let optIdx = 0; optIdx < q.options.length; optIdx++) {
              const opt = q.options[optIdx];
              await tx.questionOption.create({
                data: {
                  questionId: newQ.id,
                  optionKey: opt.id,
                  optionText: opt.text,
                  isCorrect: opt.correct,
                  orderNumber: optIdx + 1,
                },
              });
            }
          }
        }
      }

      // Create Immutable Question Snapshot for this Exam
      const questionSnapshot = {
        customId: q.id,
        type: q.type,
        topic: q.topic || null,
        chapter: q.chapter || examMeta.chapter || null,
        difficulty: q.difficulty,
        marks: q.marks,
        question: q.question,
        options: q.options || [],
        correctAnswer:
          q.type === "mcq"
            ? q.options?.find((o) => o.correct)?.id
            : q.type === "multiple_correct"
            ? q.options?.filter((o) => o.correct).map((o) => o.id)
            : q.answer,
        explanation: q.explanation || null,
      };

      const examQ = await tx.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: questionBankId,
          questionSnapshot,
          marks: q.marks,
          orderNumber: i + 1,
        },
      });

      examQuestions.push(examQ);
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role,
        action: "EXAM_IMPORTED",
        entityType: "Exam",
        entityId: exam.id,
        newValue: {
          title: exam.title,
          classNumber: classRecord.classNumber,
          subject: subjectRecord.name,
          questionsCount: examQuestions.length,
          totalMarks: exam.totalMarks,
        },
        ipAddress,
      },
      tx
    );

    return {
      exam,
      questionsCount: examQuestions.length,
    };
  });
}
