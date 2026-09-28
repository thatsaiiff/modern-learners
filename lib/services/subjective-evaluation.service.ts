import prisma from "@/lib/prisma";
import {
  EvaluationJobStatus,
  Prisma,
} from "@prisma/client";
import { aiGateway, IAiGatewayService } from "@/lib/ai";
import { MODEL_ROUTES } from "@/lib/ai/config";
import { AiGatewayValidationError } from "@/lib/ai/errors";
import {
  SubjectiveEvaluationInput,
  SubjectiveEvaluationResult,
  subjectiveEvaluationResponseSchema,
  RubricInput,
} from "@/lib/ai/evaluation/types";
import {
  PROMPT_VERSIONS,
  buildSubjectiveEvaluationSystemPrompt,
  buildSubjectiveEvaluationUserPrompt,
} from "@/lib/ai/evaluation/prompts";

export class SubjectiveEvaluationService {
  private readonly gateway: IAiGatewayService;

  constructor(gateway?: IAiGatewayService) {
    this.gateway = gateway || aiGateway;
  }

  /**
   * Evaluates a subjective student answer directly via the AI Gateway.
   * Returns a strongly-typed, validated evaluation with bounded proposed marks.
   */
  async evaluateSubjectiveAnswer(
    input: SubjectiveEvaluationInput,
    options?: { signal?: AbortSignal }
  ): Promise<SubjectiveEvaluationResult> {
    const maxMarks = Math.max(0.5, input.maxMarks);
    const systemPrompt = buildSubjectiveEvaluationSystemPrompt();
    const userPrompt = buildSubjectiveEvaluationUserPrompt({
      ...input,
      maxMarks,
    });
    const promptVersion = input.promptVersion || PROMPT_VERSIONS.SUBJECTIVE_V1;
    const model = input.model || MODEL_ROUTES.REASONING;

    const response = await this.gateway.generateStructured({
      messages: [{ role: "user", content: userPrompt }],
      systemPrompt,
      schema: subjectiveEvaluationResponseSchema,
      model,
      promptVersion,
      signal: options?.signal,
    });

    const data = response.data;

    // Strict Invariant: proposedMarks must be within [0, maxMarks]
    const rawProposed = typeof data.proposedMarks === "number" ? data.proposedMarks : 0;
    const proposedMarks = Math.min(Math.max(0, parseFloat(rawProposed.toFixed(2))), maxMarks);
    const percentage = parseFloat(((proposedMarks / maxMarks) * 100).toFixed(2));

    // Ensure criteria awarded marks are also clamped within criterion maxMarks
    const sanitizedCriteria = (data.criteriaEvaluations || []).map((crit) => {
      const cMax = Math.max(0, crit.maxMarks);
      const cAwarded = Math.min(Math.max(0, crit.awardedMarks), cMax);
      return {
        ...crit,
        maxMarks: cMax,
        awardedMarks: parseFloat(cAwarded.toFixed(2)),
      };
    });

    return {
      proposedMarks,
      maxMarks,
      percentage,
      confidence: data.confidence ?? 0.9,
      criteriaEvaluations: sanitizedCriteria,
      deductions: (data.deductions || []).map((d) => ({
        ...d,
        category: d.category ?? "OTHER",
      })),
      positiveFeedback: data.positiveFeedback,
      improvementSuggestions: data.improvementSuggestions || [],
      extractedAnswerSummary: data.extractedAnswerSummary || null,
      uncertainties: data.uncertainties || [],
      evaluatorMetadata: {
        provider: response.metadata.provider,
        model: response.metadata.model,
        promptVersion,
        promptTokens: response.metadata.promptTokens ?? null,
        completionTokens: response.metadata.completionTokens ?? null,
        totalTokens: response.metadata.totalTokens ?? null,
        estimatedCostUsd: response.metadata.estimatedCostUsd ?? null,
        durationMs: response.metadata.durationMs,
        timestamp: response.metadata.timestamp,
      },
    };
  }

  /**
   * Creates an asynchronous EvaluationJob record for a subjective submission.
   */
  async createEvaluationJob(
    submissionId: string,
    options?: { targetModel?: string; promptVersion?: string }
  ) {
    const submission = await prisma.subjectiveSubmission.findUnique({
      where: { id: submissionId },
      include: {
        evaluationJobs: {
          orderBy: { queuedAt: "desc" },
        },
      },
    });

    if (!submission) {
      throw new Error(`Subjective submission "${submissionId}" not found.`);
    }

    // Idempotency: If an active job is already queued or processing, return it
    const activeJob = submission.evaluationJobs.find(
      (j) => j.status === EvaluationJobStatus.QUEUED || j.status === EvaluationJobStatus.PROCESSING
    );
    if (activeJob) {
      return activeJob;
    }

    const targetModel = options?.targetModel || MODEL_ROUTES.REASONING;
    const promptVersion = options?.promptVersion || PROMPT_VERSIONS.SUBJECTIVE_V1;

    return await prisma.evaluationJob.create({
      data: {
        submissionId,
        status: EvaluationJobStatus.QUEUED,
        targetModel,
        promptVersion,
      },
    });
  }

  /**
   * Executes an EvaluationJob: updates lifecycle, requests evaluation from AiGateway,
   * validates result, and persists immutable AIEvaluation record.
   */
  async processEvaluationJob(
    jobId: string,
    options?: { forceRetry?: boolean; signal?: AbortSignal }
  ) {
    const job = await prisma.evaluationJob.findUnique({
      where: { id: jobId },
      include: {
        submission: {
          include: {
            question: true,
            examQuestion: true,
            attempt: {
              include: {
                exam: {
                  include: { subject: true, class: true, chapter: true },
                },
              },
            },
            aiEvaluations: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!job) {
      throw new Error(`Evaluation job "${jobId}" not found.`);
    }

    // Idempotency check: Return existing evaluation if already completed and not force-retrying
    if (job.status === EvaluationJobStatus.COMPLETED && !options?.forceRetry) {
      const latestEvaluation = job.submission.aiEvaluations[0];
      if (latestEvaluation) {
        return latestEvaluation;
      }
    }

    // Transition lifecycle: PROCESSING
    await prisma.evaluationJob.update({
      where: { id: jobId },
      data: {
        status: EvaluationJobStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    const submission = job.submission;

    // Resolve question details from ExamQuestion snapshot or original Question
    const examQ = submission.examQuestion;
    const rawSnap = (examQ?.questionSnapshot as Record<string, unknown>) || {};
    const questionText =
      (typeof rawSnap.question === "object" && rawSnap.question && "text" in rawSnap.question
        ? String((rawSnap.question as { text?: string }).text)
        : null) ||
      submission.question?.questionText ||
      "Evaluate the student's submission.";

    const maxMarks = examQ?.marks || submission.question?.defaultMarks || 5.0;
    const studentAnswer = submission.typedContent || "";
    const referenceAnswer =
      (rawSnap.explanation as string | undefined) ||
      submission.question?.explanation ||
      null;

    const rawRubric = (submission.question?.rubric || rawSnap.rubric) as RubricInput | undefined;

    const subjectName = submission.attempt?.exam?.subject?.name || null;
    const chapterName = submission.attempt?.exam?.chapter?.name || null;

    try {
      const evaluationResult = await this.evaluateSubjectiveAnswer(
        {
          submissionId: submission.id,
          questionText,
          maxMarks,
          studentAnswer,
          referenceAnswer,
          rubric: rawRubric || null,
          subjectName,
          chapterName,
          promptVersion: job.promptVersion,
          model: job.targetModel,
        },
        { signal: options?.signal }
      );

      // Persist AIEvaluation record
      const aiEvaluation = await prisma.aIEvaluation.create({
        data: {
          submissionId: submission.id,
          jobId: job.id,
          proposedMarks: evaluationResult.proposedMarks,
          maxMarks: evaluationResult.maxMarks,
          confidence: evaluationResult.confidence,
          criteriaEvaluations: evaluationResult.criteriaEvaluations as unknown as Prisma.InputJsonValue,
          deductions: evaluationResult.deductions as unknown as Prisma.InputJsonValue,
          positiveFeedback: evaluationResult.positiveFeedback,
          improvementSuggestions: evaluationResult.improvementSuggestions as unknown as Prisma.InputJsonValue,
          extractedAnswerSummary: evaluationResult.extractedAnswerSummary,
          uncertainties: evaluationResult.uncertainties as unknown as Prisma.InputJsonValue,
          modelProvider: evaluationResult.evaluatorMetadata.provider,
          modelName: evaluationResult.evaluatorMetadata.model,
          promptVersion: evaluationResult.evaluatorMetadata.promptVersion,
          tokenUsage: {
            promptTokens: evaluationResult.evaluatorMetadata.promptTokens,
            completionTokens: evaluationResult.evaluatorMetadata.completionTokens,
            totalTokens: evaluationResult.evaluatorMetadata.totalTokens,
          } as Prisma.InputJsonValue,
          estimatedCostUsd: evaluationResult.evaluatorMetadata.estimatedCostUsd,
          rawResponse: {
            durationMs: evaluationResult.evaluatorMetadata.durationMs,
            timestamp: evaluationResult.evaluatorMetadata.timestamp,
          } as Prisma.InputJsonValue,
        },
      });

      // Transition lifecycle: COMPLETED
      await prisma.evaluationJob.update({
        where: { id: jobId },
        data: {
          status: EvaluationJobStatus.COMPLETED,
          completedAt: new Date(),
          errorMessage: null,
          errorMeta: Prisma.JsonNull,
        },
      });

      return aiEvaluation;
    } catch (err: unknown) {
      const isValidationError = err instanceof AiGatewayValidationError;
      const status = isValidationError
        ? EvaluationJobStatus.FAILED_VALIDATION
        : EvaluationJobStatus.FAILED;

      const errorMessage = (err as Error)?.message || "Evaluation job failed";
      const errorMeta = isValidationError
        ? ({
            validationIssues: (err as AiGatewayValidationError).validationIssues,
            rawText: (err as AiGatewayValidationError).rawText,
          } as Prisma.InputJsonValue)
        : ({ error: errorMessage } as Prisma.InputJsonValue);

      await prisma.evaluationJob.update({
        where: { id: jobId },
        data: {
          status,
          errorMessage,
          errorMeta,
          retryCount: { increment: 1 },
        },
      });

      throw err;
    }
  }

  /**
   * High-level convenience: creates and executes an evaluation job in one step.
   */
  async evaluateSubmissionDirect(
    submissionId: string,
    options?: { targetModel?: string; promptVersion?: string; signal?: AbortSignal }
  ) {
    const job = await this.createEvaluationJob(submissionId, options);
    return await this.processEvaluationJob(job.id, options);
  }
}

export const subjectiveEvaluationService = new SubjectiveEvaluationService();
export default subjectiveEvaluationService;
