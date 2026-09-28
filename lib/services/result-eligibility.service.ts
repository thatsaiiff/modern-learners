import { Prisma, ResultStatus } from "@prisma/client";

/**
 * Standard Prisma WHERE clause matching only active, official results eligible for aggregate metrics.
 * Excludes practice results (isOfficial = false) and voided/excluded results (status = VOIDED).
 */
export const ELIGIBLE_METRIC_RESULT_WHERE: Prisma.ResultWhereInput = {
  isOfficial: true,
  status: ResultStatus.ACTIVE,
};

/**
 * Returns a composite Prisma WHERE clause ensuring all aggregate queries enforce standard metric eligibility.
 */
export function getEligibleResultWhereClause(
  additionalWhere?: Prisma.ResultWhereInput
): Prisma.ResultWhereInput {
  return {
    ...additionalWhere,
    isOfficial: true,
    status: ResultStatus.ACTIVE,
  };
}

/**
 * In-memory predicate to check whether a result object is eligible for performance metrics.
 */
export function isResultEligibleForMetrics(result: {
  isOfficial: boolean;
  status?: ResultStatus | string | null;
}): boolean {
  return result.isOfficial === true && (result.status === ResultStatus.ACTIVE || !result.status);
}
