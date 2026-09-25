import prisma from "@/lib/prisma";
import { Prisma, PaperSourceType, PaperStatus, MultiAttemptRule } from "@prisma/client";
import { generatePaperCode } from "./roll.service";
import { logAudit } from "./audit.service";
import { StudentEligibilityItem, assignExamToStudents } from "./exam-assignment.service";

export interface CreateQuestionPaperInput {
  title: string;
  description?: string | null;
  instructions?: string | null;
  classNumber: number;
  subjectCode: string;
  chapter?: string | null;
  topic?: string | null;
  durationMinutes?: number;
  totalMarks?: number;
  sourceType?: PaperSourceType;
  sourceMeta?: Record<string, unknown> | null;
  questions: Array<{
    customId?: string;
    type: string;
    topic?: string;
    difficulty?: string;
    marks: number;
    question: { text: string; image?: { src: string; alt?: string; width?: number } };
    options?: Array<{ id: string; text: string; correct?: boolean }>;
    answer?: unknown;
    explanation?: string | null;
  }>;
}

export interface GetQuestionPapersQuery {
  page?: number;
  limit?: number;
  search?: string;
  classNumber?: number;
  subjectCode?: string;
  status?: PaperStatus;
}

export interface CreateExamFromPaperInput {
  questionPaperId: string;
  title?: string;
  classNumber?: number;
  durationMinutes?: number;
  passingPercentage?: number;
  negativeMarkingEnabled?: boolean;
  negativeMarkValue?: number;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  allowedAttempts?: number;
  startAt?: string | Date;
  loginDeadline?: string | Date;
  multiAttemptRule?: MultiAttemptRule;
  studentEligibility?: StudentEligibilityItem[];
}

/**
 * Creates a reusable Question Paper with ordered questions
 */
export async function createQuestionPaper(
  input: CreateQuestionPaperInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Question Paper title is required.");
  }

  if (!input.questions || input.questions.length === 0) {
    throw new Error("A Question Paper must contain at least one question.");
  }

  // 1. Resolve Class
  const classRecord = await prisma.class.findUnique({
    where: { classNumber: input.classNumber },
  });
  if (!classRecord) {
    throw new Error(`Class ${input.classNumber} not found.`);
  }

  // 2. Resolve Subject
  let subjectRecord = await prisma.subject.findFirst({
    where: {
      OR: [
        { code: { equals: input.subjectCode.toUpperCase(), mode: "insensitive" } },
        { name: { contains: input.subjectCode, mode: "insensitive" } },
      ],
    },
  });

  if (!subjectRecord) {
    const generatedCode = input.subjectCode.slice(0, 4).toUpperCase();
    subjectRecord = await prisma.subject.create({
      data: {
        name: input.subjectCode,
        code: generatedCode,
        isActive: true,
      },
    });
  }

  const calculatedMarks = input.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  const totalMarks = input.totalMarks || calculatedMarks;

  return await prisma.$transaction(async (tx) => {
    const paperCode = await generatePaperCode(tx);

    const paper = await tx.questionPaper.create({
      data: {
        paperCode,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        instructions: input.instructions?.trim() || null,
        classId: classRecord.id,
        subjectId: subjectRecord.id,
        chapter: input.chapter?.trim() || null,
        topic: input.topic?.trim() || null,
        totalQuestions: input.questions.length,
        totalMarks,
        sourceType: input.sourceType || PaperSourceType.HTML_IMPORT,
        sourceMeta: input.sourceMeta ? (input.sourceMeta as Prisma.InputJsonValue) : undefined,
        status: PaperStatus.ACTIVE,
        createdBy: actor?.userId || null,
      },
      include: {
        class: true,
        subject: true,
      },
    });

    for (let i = 0; i < input.questions.length; i++) {
      const q = input.questions[i];

      const questionSnapshot = {
        customId: q.customId || `Q-${i + 1}`,
        type: q.type,
        topic: q.topic || input.topic || null,
        chapter: input.chapter || null,
        difficulty: q.difficulty || "medium",
        marks: q.marks || 1,
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

      await tx.questionPaperQuestion.create({
        data: {
          questionPaperId: paper.id,
          questionSnapshot: questionSnapshot as unknown as Prisma.InputJsonValue,
          marks: q.marks || 1,
          orderNumber: i + 1,
        },
      });
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role || "ADMIN",
        action: "QUESTION_PAPER_CREATED",
        entityType: "QuestionPaper",
        entityId: paper.id,
        newValue: {
          paperCode,
          title: paper.title,
          classNumber: classRecord.classNumber,
          subject: subjectRecord.name,
          totalQuestions: paper.totalQuestions,
          totalMarks: paper.totalMarks,
        },
        ipAddress,
      },
      tx
    );

    return paper;
  });
}

/**
 * Lists question papers with filters and pagination
 */
export async function getQuestionPapers(query: GetQuestionPapersQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.QuestionPaperWhereInput = {
    status: query.status || PaperStatus.ACTIVE,
  };

  if (query.classNumber) {
    where.class = { classNumber: query.classNumber };
  }

  if (query.subjectCode) {
    where.subject = { code: query.subjectCode.toUpperCase() };
  }

  if (query.search && query.search.trim().length > 0) {
    const s = query.search.trim();
    where.OR = [
      { title: { contains: s, mode: "insensitive" } },
      { paperCode: { contains: s, mode: "insensitive" } },
      { chapter: { contains: s, mode: "insensitive" } },
      { topic: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, papers] = await Promise.all([
    prisma.questionPaper.count({ where }),
    prisma.questionPaper.findMany({
      where,
      include: {
        class: true,
        subject: true,
        creator: { select: { name: true } },
        _count: {
          select: {
            paperQuestions: true,
            exams: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    papers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Returns Question Paper details and all its questions in order
 */
export async function getQuestionPaperById(id: string) {
  return prisma.questionPaper.findUnique({
    where: { id },
    include: {
      class: true,
      subject: true,
      creator: { select: { name: true, role: true } },
      paperQuestions: {
        orderBy: { orderNumber: "asc" },
      },
      exams: {
        include: {
          class: true,
          _count: {
            select: { assignments: true, attempts: true, results: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { paperQuestions: true, exams: true },
      },
    },
  });
}

/**
 * Clones/duplicates a Question Paper with a new permanent ID (QP-XXXXXX)
 */
export async function duplicateQuestionPaper(
  paperId: string,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const sourcePaper = await prisma.questionPaper.findUnique({
    where: { id: paperId },
    include: {
      paperQuestions: { orderBy: { orderNumber: "asc" } },
    },
  });

  if (!sourcePaper) {
    throw new Error("Source Question Paper not found.");
  }

  return await prisma.$transaction(async (tx) => {
    const paperCode = await generatePaperCode(tx);

    const newPaper = await tx.questionPaper.create({
      data: {
        paperCode,
        title: `${sourcePaper.title} (Copy)`,
        description: sourcePaper.description,
        instructions: sourcePaper.instructions,
        classId: sourcePaper.classId,
        subjectId: sourcePaper.subjectId,
        chapter: sourcePaper.chapter,
        topic: sourcePaper.topic,
        totalQuestions: sourcePaper.totalQuestions,
        totalMarks: sourcePaper.totalMarks,
        sourceType: PaperSourceType.DUPLICATED,
        sourceMeta: {
          sourcePaperId: sourcePaper.id,
          sourcePaperCode: sourcePaper.paperCode,
          duplicatedAt: new Date().toISOString(),
        },
        status: PaperStatus.ACTIVE,
        createdBy: actor?.userId || null,
      },
      include: {
        class: true,
        subject: true,
      },
    });

    for (const pq of sourcePaper.paperQuestions) {
      await tx.questionPaperQuestion.create({
        data: {
          questionPaperId: newPaper.id,
          questionId: pq.questionId,
          questionSnapshot: pq.questionSnapshot as Prisma.InputJsonValue,
          marks: pq.marks,
          orderNumber: pq.orderNumber,
        },
      });
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role || "ADMIN",
        action: "QUESTION_PAPER_DUPLICATED",
        entityType: "QuestionPaper",
        entityId: newPaper.id,
        newValue: {
          newPaperCode: paperCode,
          sourcePaperCode: sourcePaper.paperCode,
        },
        ipAddress,
      },
      tx
    );

    return newPaper;
  });
}

/**
 * Creates an actual Exam execution instance from a Question Paper
 */
export async function createExamFromPaper(
  input: CreateExamFromPaperInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const paper = await prisma.questionPaper.findUnique({
    where: { id: input.questionPaperId },
    include: {
      class: true,
      subject: true,
      paperQuestions: { orderBy: { orderNumber: "asc" } },
    },
  });

  if (!paper) {
    throw new Error("Question Paper not found.");
  }

  if (paper.status === "ARCHIVED") {
    throw new Error("Cannot create an exam from an archived Question Paper. Duplicate or restore the paper before creating an exam.");
  }

  if (paper.paperQuestions.length === 0) {
    throw new Error("Cannot create an exam from an empty Question Paper.");
  }

  // Resolve target class
  let targetClassId = paper.classId;
  if (input.classNumber && input.classNumber !== paper.class.classNumber) {
    const targetClass = await prisma.class.findUnique({
      where: { classNumber: input.classNumber },
    });
    if (!targetClass) {
      throw new Error(`Target Class ${input.classNumber} not found.`);
    }
    targetClassId = targetClass.id;
  }

  const durationMinutes = input.durationMinutes || 60;
  const passingPercentage = input.passingPercentage || 80.0;
  const startAt = input.startAt ? new Date(input.startAt) : new Date();
  const loginDeadline = input.loginDeadline
    ? new Date(input.loginDeadline)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return await prisma.$transaction(async (tx) => {
    // 1. Create Exam Record
    const exam = await tx.exam.create({
      data: {
        title: input.title?.trim() || paper.title,
        questionPaperId: paper.id,
        classId: targetClassId,
        subjectId: paper.subjectId,
        description: paper.description,
        instructions: paper.instructions,
        startAt,
        loginDeadline,
        durationMinutes,
        totalMarks: paper.totalMarks,
        passingPercentage,
        negativeMarkingEnabled: input.negativeMarkingEnabled ?? false,
        negativeMarkValue: input.negativeMarkValue ?? 0.0,
        randomizeQuestions: input.randomizeQuestions ?? false,
        randomizeOptions: input.randomizeOptions ?? false,
        maxAttempts: input.allowedAttempts ?? 1,
        multiAttemptRule: input.multiAttemptRule ?? MultiAttemptRule.BEST,
        status: "ACTIVE",
        createdBy: actor?.userId || null,
      },
      include: {
        class: true,
        subject: true,
      },
    });

    // 2. Create Default Grading Rules
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

    // 3. Snapshot Question Paper Questions into ExamQuestions (Guarantees 100% Historical Immutability)
    for (let i = 0; i < paper.paperQuestions.length; i++) {
      const pq = paper.paperQuestions[i];
      await tx.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: pq.questionId,
          questionSnapshot: pq.questionSnapshot as Prisma.InputJsonValue,
          marks: pq.marks,
          orderNumber: i + 1,
        },
      });
    }

    // 4. If student eligibility roster was supplied, assign to students immediately
    if (input.studentEligibility && input.studentEligibility.length > 0) {
      await assignExamToStudents(
        {
          examId: exam.id,
          classNumber: input.classNumber || paper.class.classNumber,
          studentEligibility: input.studentEligibility,
          allowedAttempts: input.allowedAttempts || 1,
          startAt,
          loginDeadline,
          durationMinutes,
        },
        actor,
        ipAddress,
        tx
      );
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role || "ADMIN",
        action: "EXAM_CREATED_FROM_PAPER",
        entityType: "Exam",
        entityId: exam.id,
        newValue: {
          examTitle: exam.title,
          paperCode: paper.paperCode,
          classId: targetClassId,
          totalQuestions: paper.paperQuestions.length,
          totalMarks: exam.totalMarks,
        },
        ipAddress,
      },
      tx
    );

    return exam;
  });
}
