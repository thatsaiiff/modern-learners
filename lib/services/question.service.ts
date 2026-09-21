import prisma from "@/lib/prisma";
import { Prisma, QuestionType, QuestionDifficulty } from "@prisma/client";
import { sanitizeQuestionHtml } from "./sanitizer.service";
import { logAudit } from "./audit.service";

export interface CreateQuestionInput {
  customId?: string;
  classNumber: number;
  subjectCode: string;
  chapterId?: string;
  topicId?: string;
  questionType: QuestionType;
  difficulty: QuestionDifficulty;
  questionText: string;
  explanation?: string | null;
  defaultMarks?: number;
  imageSrc?: string | null;
  imageAlt?: string | null;
  options?: Array<{
    optionKey: string;
    optionText: string;
    isCorrect: boolean;
  }>;
}

export interface UpdateQuestionInput {
  questionText?: string;
  explanation?: string | null;
  difficulty?: QuestionDifficulty;
  defaultMarks?: number;
  imageSrc?: string | null;
  imageAlt?: string | null;
  isActive?: boolean;
  options?: Array<{
    optionKey: string;
    optionText: string;
    isCorrect: boolean;
  }>;
}

export interface GetQuestionsQuery {
  page?: number;
  limit?: number;
  search?: string;
  classNumber?: number;
  subjectCode?: string;
  chapterId?: string;
  topicId?: string;
  questionType?: QuestionType;
  difficulty?: QuestionDifficulty;
}

export async function createQuestion(
  input: CreateQuestionInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  if (!input.questionText || input.questionText.trim().length === 0) {
    throw new Error("Question text is required.");
  }

  const classRecord = await prisma.class.findUnique({
    where: { classNumber: input.classNumber },
  });
  if (!classRecord) {
    throw new Error(`Class ${input.classNumber} not found.`);
  }

  const subjectRecord = await prisma.subject.findUnique({
    where: { code: input.subjectCode.toUpperCase() },
  });
  if (!subjectRecord) {
    throw new Error(`Subject with code ${input.subjectCode} not found.`);
  }

  const sanitizedText = sanitizeQuestionHtml(input.questionText);
  const sanitizedExplanation = input.explanation
    ? sanitizeQuestionHtml(input.explanation)
    : null;

  return await prisma.$transaction(async (tx) => {
    const question = await tx.question.create({
      data: {
        customId: input.customId?.trim() || null,
        classId: classRecord.id,
        subjectId: subjectRecord.id,
        chapterId: input.chapterId || null,
        topicId: input.topicId || null,
        questionType: input.questionType,
        difficulty: input.difficulty,
        questionText: sanitizedText,
        explanation: sanitizedExplanation,
        defaultMarks: input.defaultMarks || 1.0,
        imageSrc: input.imageSrc?.trim() || null,
        imageAlt: input.imageAlt?.trim() || null,
        isActive: true,
      },
    });

    if (input.options && input.options.length > 0) {
      for (let i = 0; i < input.options.length; i++) {
        const opt = input.options[i];
        await tx.questionOption.create({
          data: {
            questionId: question.id,
            optionKey: opt.optionKey,
            optionText: sanitizeQuestionHtml(opt.optionText),
            isCorrect: opt.isCorrect,
            orderNumber: i + 1,
          },
        });
      }
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role,
        action: "QUESTION_CREATED",
        entityType: "Question",
        entityId: question.id,
        newValue: {
          customId: question.customId,
          type: question.questionType,
          class: classRecord.classNumber,
          subject: subjectRecord.code,
        },
        ipAddress,
      },
      tx
    );

    return question;
  });
}

export async function getQuestions(query: GetQuestionsQuery) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const whereCondition: Prisma.QuestionWhereInput = {
    isActive: true,
  };

  if (query.classNumber) {
    whereCondition.class = { classNumber: query.classNumber };
  }

  if (query.subjectCode) {
    whereCondition.subject = { code: query.subjectCode.toUpperCase() };
  }

  if (query.chapterId) {
    whereCondition.chapterId = query.chapterId;
  }

  if (query.topicId) {
    whereCondition.topicId = query.topicId;
  }

  if (query.questionType) {
    whereCondition.questionType = query.questionType;
  }

  if (query.difficulty) {
    whereCondition.difficulty = query.difficulty;
  }

  if (query.search && query.search.trim().length > 0) {
    const s = query.search.trim();
    whereCondition.OR = [
      { questionText: { contains: s, mode: "insensitive" } },
      { customId: { contains: s, mode: "insensitive" } },
    ];
  }

  const [total, questions] = await Promise.all([
    prisma.question.count({ where: whereCondition }),
    prisma.question.findMany({
      where: whereCondition,
      include: {
        class: true,
        subject: true,
        chapter: true,
        topic: true,
        options: {
          orderBy: { orderNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    questions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getQuestionById(id: string) {
  return prisma.question.findUnique({
    where: { id },
    include: {
      class: true,
      subject: true,
      chapter: true,
      topic: true,
      options: {
        orderBy: { orderNumber: "asc" },
      },
    },
  });
}

export async function updateQuestion(
  id: string,
  input: UpdateQuestionInput,
  actor?: { userId: string; role: string } | null,
  ipAddress?: string | null
) {
  const existing = await prisma.question.findUnique({
    where: { id },
    include: { options: true },
  });

  if (!existing) {
    throw new Error("Question not found.");
  }

  return await prisma.$transaction(async (tx) => {
    const dataToUpdate: Prisma.QuestionUpdateInput = {};

    if (input.questionText !== undefined) {
      dataToUpdate.questionText = sanitizeQuestionHtml(input.questionText);
    }
    if (input.explanation !== undefined) {
      dataToUpdate.explanation = input.explanation
        ? sanitizeQuestionHtml(input.explanation)
        : null;
    }
    if (input.difficulty !== undefined) {
      dataToUpdate.difficulty = input.difficulty;
    }
    if (input.defaultMarks !== undefined) {
      dataToUpdate.defaultMarks = input.defaultMarks;
    }
    if (input.isActive !== undefined) {
      dataToUpdate.isActive = input.isActive;
    }

    const updated = await tx.question.update({
      where: { id },
      data: dataToUpdate,
    });

    if (input.options) {
      // Re-create options
      await tx.questionOption.deleteMany({
        where: { questionId: id },
      });

      for (let i = 0; i < input.options.length; i++) {
        const opt = input.options[i];
        await tx.questionOption.create({
          data: {
            questionId: id,
            optionKey: opt.optionKey,
            optionText: sanitizeQuestionHtml(opt.optionText),
            isCorrect: opt.isCorrect,
            orderNumber: i + 1,
          },
        });
      }
    }

    await logAudit(
      {
        actorId: actor?.userId,
        actorRole: actor?.role,
        action: "QUESTION_UPDATED",
        entityType: "Question",
        entityId: id,
        oldValue: { text: existing.questionText, marks: existing.defaultMarks },
        newValue: { text: updated.questionText, marks: updated.defaultMarks },
        ipAddress,
      },
      tx
    );

    return updated;
  });
}

export async function getChapters(classNumber?: number, subjectCode?: string) {
  const whereCondition: Prisma.ChapterWhereInput = {
    isActive: true,
  };

  if (classNumber) {
    whereCondition.class = { classNumber };
  }

  if (subjectCode) {
    whereCondition.subject = { code: subjectCode.toUpperCase() };
  }

  return prisma.chapter.findMany({
    where: whereCondition,
    include: {
      class: true,
      subject: true,
      topics: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { orderNumber: "asc" },
  });
}
