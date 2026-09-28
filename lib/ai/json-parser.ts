import { z } from "zod";
import { AiGatewayValidationError } from "./errors";

/**
 * Extracts a candidate JSON substring from raw model output.
 * Handles markdown fences (```json ... ``` or ``` ... ```) as well as
 * bare JSON objects or arrays surrounded by explanatory text.
 */
export function extractJsonString(raw: string): string {
  const trimmed = raw.trim();

  // 1. Direct match with markdown code blocks (e.g. ```json ... ``` or ``` ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const codeBlockMatch = trimmed.match(codeBlockRegex);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const insideFence = codeBlockMatch[1].trim();
    if (insideFence.startsWith("{") || insideFence.startsWith("[")) {
      return insideFence;
    }
  }

  // 2. Bare JSON object or array starting and ending cleanly
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed;
  }

  // 3. Search for outermost balanced { ... } or [ ... ]
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }

  return trimmed;
}

/**
 * Parses and validates raw model output against a given Zod schema.
 * Throws AiGatewayValidationError with structured diagnostics if validation fails.
 */
export function parseAndValidateJson<T>(
  raw: string,
  schema: z.ZodType<T>,
  context?: { provider?: string; model?: string }
): T {
  const extracted = extractJsonString(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch (err) {
    throw new AiGatewayValidationError(
      `AI response could not be parsed as valid JSON: ${(err as Error).message}`,
      {
        provider: context?.provider,
        model: context?.model,
        rawText: raw,
        validationIssues: [{ message: (err as Error).message }],
      }
    );
  }

  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    throw new AiGatewayValidationError(
      `AI response failed structured schema validation`,
      {
        provider: context?.provider,
        model: context?.model,
        rawText: raw,
        validationIssues: validation.error.issues,
      }
    );
  }

  return validation.data;
}
