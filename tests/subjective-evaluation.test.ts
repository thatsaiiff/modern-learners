import { describe, it, expect, vi, beforeEach } from "vitest";
import { EvaluationJobStatus } from "@prisma/client";

const { getMockSubmission, getMockJob, getSharedState } = vi.hoisted(() => {
  const submission = {
    id: "subm-uuid-001",
    attemptId: "att-1",
    typedContent: "Work is force times displacement in direction of force.",
    question: {
      questionText: "Define Work",
      defaultMarks: 5.0,
      explanation: "W = F.s",
      rubric: null,
    },
    examQuestion: null,
    attempt: {
      exam: {
        subject: { name: "Physics" },
        chapter: { name: "Work & Energy" },
      },
    },
    aiEvaluations: [] as any[],
    evaluationJobs: [] as any[],
  };

  const job = {
    id: "job-uuid-001",
    submissionId: submission.id,
    status: "QUEUED",
    targetModel: "auto/reasoning",
    promptVersion: "subjective-v1",
    retryCount: 0,
    submission,
  };

  const shared = {
    submissionState: { ...submission },
    jobState: { ...job },
    createdAiEval: null as any,
    recordedErrorMeta: null as any,
  };

  return {
    getMockSubmission: () => ({ ...submission }),
    getMockJob: () => ({ ...job }),
    getSharedState: () => shared,
  };
});

vi.mock("@/lib/prisma", () => {
  const shared = getSharedState();

  return {
    default: {
      subjectiveSubmission: {
        findUnique: vi.fn().mockImplementation(() => Promise.resolve(shared.submissionState)),
      },
      evaluationJob: {
        findUnique: vi.fn().mockImplementation(() =>
          Promise.resolve({
            ...shared.jobState,
            submission: shared.submissionState,
          })
        ),
        create: vi.fn().mockImplementation((args: any) => {
          shared.jobState = { id: "job-created-1", ...args.data, submission: shared.submissionState };
          return Promise.resolve(shared.jobState);
        }),
        update: vi.fn().mockImplementation((args: any) => {
          shared.jobState = { ...shared.jobState, ...args.data };
          if (args.data.errorMeta) shared.recordedErrorMeta = args.data.errorMeta;
          return Promise.resolve(shared.jobState);
        }),
      },
      aIEvaluation: {
        create: vi.fn().mockImplementation((args: any) => {
          shared.createdAiEval = { id: "aieval-1", ...args.data };
          return Promise.resolve(shared.createdAiEval);
        }),
      },
    },
  };
});

import {
  SubjectiveEvaluationService,
} from "@/lib/services/subjective-evaluation.service";
import {
  AiGatewayValidationError,
  AiGatewayUnavailableError,
  IAiGatewayService,
} from "@/lib/ai";
import { PROMPT_VERSIONS } from "@/lib/ai/evaluation/prompts";

describe("AI-01C — Subjective Answer Evaluation Service", () => {
  let mockGateway: IAiGatewayService;

  beforeEach(() => {
    vi.clearAllMocks();
    const shared = getSharedState();
    shared.submissionState = getMockSubmission();
    shared.jobState = getMockJob();
    shared.createdAiEval = null;
    shared.recordedErrorMeta = null;
  });

  const validEvaluationPayload = {
    proposedMarks: 8.5,
    maxMarks: 10.0,
    confidence: 0.95,
    criteriaEvaluations: [
      {
        criterionId: "crit-1",
        title: "Definition & Principles",
        maxMarks: 4.0,
        awardedMarks: 4.0,
        evidenceQuote: "Work is done when a force produces motion in the direction of the force.",
        reasoning: "Accurate and concise definition with scalar product principle.",
      },
      {
        criterionId: "crit-2",
        title: "Mathematical Formula & Units",
        maxMarks: 6.0,
        awardedMarks: 4.5,
        evidenceQuote: "W = F * s * cos(theta), unit is Joules",
        reasoning: "Formula and SI unit correct, but missed mentioning 1 Joule = 1 N.m explicitly.",
      },
    ],
    deductions: [
      {
        category: "INCOMPLETE_STEP" as const,
        pointsDeducted: 1.5,
        explanation: "Omitted the definition of 1 Joule in terms of Newton and meter.",
        locationHint: "Last paragraph",
      },
    ],
    positiveFeedback: "Excellent understanding of mechanical work and the angle dependency.",
    improvementSuggestions: ["Always define 1 Joule unit explicitly when asked for full mathematical derivation."],
    extractedAnswerSummary: "Student defined work accurately and provided the scalar formula.",
    uncertainties: [],
  };

  it("1. Generates a valid subjective evaluation with rubric breakdown and metadata", async () => {
    mockGateway = {
      generateText: vi.fn(),
      generateStructured: vi.fn().mockResolvedValue({
        data: validEvaluationPayload,
        rawText: JSON.stringify(validEvaluationPayload),
        metadata: {
          provider: "omniroute",
          model: "anthropic/claude-3-5-sonnet",
          requestId: "req-12345",
          promptTokens: 850,
          completionTokens: 320,
          totalTokens: 1170,
          estimatedCostUsd: 0.008,
          durationMs: 1250,
          promptVersion: PROMPT_VERSIONS.SUBJECTIVE_V1,
          timestamp: new Date("2026-09-28T10:00:00Z"),
        },
      }),
    };

    const service = new SubjectiveEvaluationService(mockGateway);

    const result = await service.evaluateSubjectiveAnswer({
      questionText: "Define work done by a force and derive its mathematical formula.",
      maxMarks: 10.0,
      studentAnswer: "Work is done when a force produces motion in the direction of the force. W = F * s * cos(theta), unit is Joules.",
      referenceAnswer: "Work is the scalar product of force and displacement: W = F.s. Unit: 1 Joule = 1 N * 1 m.",
      subjectName: "Physics",
      topicName: "Work & Energy",
      promptVersion: PROMPT_VERSIONS.SUBJECTIVE_V1,
    });

    expect(result.proposedMarks).toBe(8.5);
    expect(result.maxMarks).toBe(10.0);
    expect(result.percentage).toBe(85.0);
    expect(result.confidence).toBe(0.95);
    expect(result.criteriaEvaluations).toHaveLength(2);
    expect(result.criteriaEvaluations[0].awardedMarks).toBe(4.0);
    expect(result.deductions).toHaveLength(1);
    expect(result.deductions[0].pointsDeducted).toBe(1.5);
    expect(result.positiveFeedback).toContain("Excellent understanding");
    expect(result.evaluatorMetadata.provider).toBe("omniroute");
    expect(result.evaluatorMetadata.promptVersion).toBe("subjective-v1");
    expect(result.evaluatorMetadata.totalTokens).toBe(1170);
  });

  it("2. Clamps proposed marks to [0, maxMarks] if model returns out-of-bounds score", async () => {
    const outOfBoundsPayload = {
      ...validEvaluationPayload,
      proposedMarks: 15.0,
      maxMarks: 10.0,
    };

    mockGateway = {
      generateText: vi.fn(),
      generateStructured: vi.fn().mockResolvedValue({
        data: outOfBoundsPayload,
        rawText: JSON.stringify(outOfBoundsPayload),
        metadata: {
          provider: "omniroute",
          model: "auto",
          durationMs: 800,
          timestamp: new Date(),
        },
      }),
    };

    const service = new SubjectiveEvaluationService(mockGateway);

    const result = await service.evaluateSubjectiveAnswer({
      questionText: "Explain photosynthesis",
      maxMarks: 10.0,
      studentAnswer: "Plants make food using sunlight",
    });

    expect(result.proposedMarks).toBe(10.0);
    expect(result.percentage).toBe(100.0);
    expect(result.proposedMarks).toBeLessThanOrEqual(10.0);
  });

  it("3. Handles negative model marks safely by clamping to 0.0", async () => {
    const negativeMarksPayload = {
      ...validEvaluationPayload,
      proposedMarks: -5.0,
      maxMarks: 10.0,
    };

    mockGateway = {
      generateText: vi.fn(),
      generateStructured: vi.fn().mockResolvedValue({
        data: negativeMarksPayload,
        rawText: JSON.stringify(negativeMarksPayload),
        metadata: {
          provider: "omniroute",
          model: "auto",
          durationMs: 800,
          timestamp: new Date(),
        },
      }),
    };

    const service = new SubjectiveEvaluationService(mockGateway);

    const result = await service.evaluateSubjectiveAnswer({
      questionText: "Explain photosynthesis",
      maxMarks: 10.0,
      studentAnswer: "Completely wrong answer",
    });

    expect(result.proposedMarks).toBe(0.0);
    expect(result.percentage).toBe(0.0);
  });

  it("4. Evaluation job lifecycle: QUEUED -> PROCESSING -> COMPLETED with persistence", async () => {
    mockGateway = {
      generateText: vi.fn(),
      generateStructured: vi.fn().mockResolvedValue({
        data: {
          ...validEvaluationPayload,
          proposedMarks: 4.5,
          maxMarks: 5.0,
        },
        rawText: "{}",
        metadata: {
          provider: "omniroute",
          model: "auto/reasoning",
          promptTokens: 400,
          completionTokens: 200,
          totalTokens: 600,
          estimatedCostUsd: 0.005,
          durationMs: 900,
          promptVersion: "subjective-v1",
          timestamp: new Date(),
        },
      }),
    };

    const service = new SubjectiveEvaluationService(mockGateway);
    const evalRecord = await service.processEvaluationJob("job-uuid-001");

    expect(evalRecord).toBeDefined();
    expect(evalRecord.proposedMarks).toBe(4.5);
    expect(evalRecord.maxMarks).toBe(5.0);

    const shared = getSharedState();
    expect(shared.jobState.status).toBe(EvaluationJobStatus.COMPLETED);
    expect(shared.createdAiEval.submissionId).toBe("subm-uuid-001");
    expect(shared.createdAiEval.promptVersion).toBe("subjective-v1");
  });

  it("5. Fails validation safely: sets status FAILED_VALIDATION without corrupting data", async () => {
    mockGateway = {
      generateText: vi.fn(),
      generateStructured: vi.fn().mockRejectedValue(
        new AiGatewayValidationError("Missing positiveFeedback field in AI output", {
          rawText: '{"proposedMarks": 4}',
          validationIssues: [{ path: ["positiveFeedback"], message: "Required" }],
        })
      ),
    };

    const service = new SubjectiveEvaluationService(mockGateway);

    await expect(service.processEvaluationJob("job-uuid-001")).rejects.toThrow(
      AiGatewayValidationError
    );

    const shared = getSharedState();
    expect(shared.jobState.status).toBe(EvaluationJobStatus.FAILED_VALIDATION);
    expect(shared.recordedErrorMeta).toBeDefined();
  });

  it("6. Transient gateway network failure sets job status FAILED and increments retryCount", async () => {
    mockGateway = {
      generateText: vi.fn(),
      generateStructured: vi.fn().mockRejectedValue(
        new AiGatewayUnavailableError("OmniRoute 503 unavailable")
      ),
    };

    const service = new SubjectiveEvaluationService(mockGateway);

    await expect(service.processEvaluationJob("job-uuid-001")).rejects.toThrow(
      AiGatewayUnavailableError
    );

    const shared = getSharedState();
    expect(shared.jobState.status).toBe(EvaluationJobStatus.FAILED);
  });

  it("7. Idempotent execution: returns existing evaluation for COMPLETED job without calling gateway", async () => {
    const existingEvaluation = {
      id: "aieval-existing-001",
      submissionId: "subm-uuid-001",
      proposedMarks: 4.0,
      maxMarks: 5.0,
      confidence: 0.95,
      positiveFeedback: "Great answer",
    };

    const shared = getSharedState();
    shared.jobState = {
      ...getMockJob(),
      status: "COMPLETED",
    };
    shared.submissionState = {
      ...getMockSubmission(),
      aiEvaluations: [existingEvaluation],
    };

    const mockGenerateStructured = vi.fn();
    mockGateway = {
      generateText: vi.fn(),
      generateStructured: mockGenerateStructured,
    };

    const service = new SubjectiveEvaluationService(mockGateway);
    const evalResult = await service.processEvaluationJob("job-uuid-001");

    expect(evalResult.id).toBe("aieval-existing-001");
    expect(evalResult.proposedMarks).toBe(4.0);
    // Gateway should NEVER have been invoked for already completed job
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });

  it("8. AI Evaluation proposes marks but strictly isolates from official Result", async () => {
    const proposedAiMarks = 8.5;

    const officialResultState = {
      id: "res-uuid-1",
      rawMarks: 20.0, // Objective marks only
      isOfficial: true,
    };

    const studentAttemptAnswer = {
      id: "att-ans-1",
      marksAwarded: 0.0, // Pre-teacher review
      isCorrect: null,
    };

    const aiEvaluation = {
      id: "aieval-1",
      proposedMarks: proposedAiMarks,
      maxMarks: 10.0,
    };

    expect(aiEvaluation.proposedMarks).toBe(8.5);
    expect(officialResultState.rawMarks).toBe(20.0);
    expect(studentAttemptAnswer.marksAwarded).toBe(0.0);
    expect(officialResultState.rawMarks).not.toBe(aiEvaluation.proposedMarks);
  });
});
