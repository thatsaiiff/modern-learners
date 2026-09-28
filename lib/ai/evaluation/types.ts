import { z } from "zod";

export const deductionCategoryEnum = z.enum([
  "CONCEPTUAL_ERROR",
  "INCOMPLETE_STEP",
  "CALCULATION_ERROR",
  "MISSING_UNITS",
  "POOR_STRUCTURE",
  "FACTUAL_ERROR",
  "OTHER",
]);

export type DeductionCategory = z.infer<typeof deductionCategoryEnum>;

export const rubricCriterionEvaluationSchema = z.object({
  criterionId: z.string().min(1, "Criterion ID is required"),
  title: z.string().min(1, "Criterion title is required"),
  maxMarks: z.number().nonnegative(),
  awardedMarks: z.number().nonnegative(),
  evidenceQuote: z.string().nullable().optional(),
  reasoning: z.string().min(1, "Reasoning is required"),
});

export type RubricCriterionEvaluation = z.infer<typeof rubricCriterionEvaluationSchema>;

export const deductionItemSchema = z.object({
  category: deductionCategoryEnum.default("OTHER"),
  pointsDeducted: z.number().nonnegative(),
  explanation: z.string().min(1, "Deduction explanation is required"),
  locationHint: z.string().nullable().optional(),
});

export type DeductionItem = z.infer<typeof deductionItemSchema>;

export const subjectiveEvaluationResponseSchema = z.object({
  proposedMarks: z.number().nonnegative(),
  maxMarks: z.number().positive(),
  confidence: z.number().min(0.0).max(1.0).default(0.9),
  criteriaEvaluations: z.array(rubricCriterionEvaluationSchema).default([]),
  deductions: z.array(deductionItemSchema).default([]),
  positiveFeedback: z.string().min(1, "Positive feedback is required"),
  improvementSuggestions: z.array(z.string()).default([]),
  extractedAnswerSummary: z.string().nullable().optional(),
  uncertainties: z.array(z.string()).default([]),
});

export type SubjectiveEvaluationResponse = z.infer<typeof subjectiveEvaluationResponseSchema>;

export interface RubricCriterionInput {
  id: string;
  title: string;
  description?: string | null;
  maxMarks: number;
  keywords?: string[];
}

export interface RubricInput {
  totalMarks?: number;
  criteria: RubricCriterionInput[];
}

export interface SubjectiveEvaluationInput {
  submissionId?: string;
  questionText: string;
  maxMarks: number;
  studentAnswer: string;
  referenceAnswer?: string | null;
  rubric?: RubricInput | null;
  subjectName?: string | null;
  topicName?: string | null;
  chapterName?: string | null;
  promptVersion?: string;
  model?: string;
}

export interface SubjectiveEvaluationResult {
  proposedMarks: number;
  maxMarks: number;
  percentage: number;
  confidence: number;
  criteriaEvaluations: RubricCriterionEvaluation[];
  deductions: DeductionItem[];
  positiveFeedback: string;
  improvementSuggestions: string[];
  extractedAnswerSummary: string | null;
  uncertainties: string[];
  evaluatorMetadata: {
    provider: string;
    model: string;
    promptVersion: string;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    estimatedCostUsd: number | null;
    durationMs: number;
    timestamp: Date;
  };
}
