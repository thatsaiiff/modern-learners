export type AiGatewayErrorCode =
  | "AUTHENTICATION_ERROR"
  | "RATE_LIMIT_ERROR"
  | "TIMEOUT_ERROR"
  | "UNAVAILABLE_ERROR"
  | "INVALID_REQUEST_ERROR"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

export interface AiGatewayErrorDetails {
  statusCode?: number;
  provider?: string;
  model?: string;
  requestId?: string | null;
  rawResponse?: unknown;
  validationIssues?: unknown;
  originalError?: unknown;
}

export class AiGatewayError extends Error {
  readonly code: AiGatewayErrorCode;
  readonly statusCode?: number;
  readonly provider: string;
  readonly model?: string;
  readonly requestId?: string | null;
  readonly details?: unknown;
  readonly isTransient: boolean;

  constructor(
    message: string,
    options: {
      code?: AiGatewayErrorCode;
      statusCode?: number;
      provider?: string;
      model?: string;
      requestId?: string | null;
      details?: unknown;
      isTransient?: boolean;
      cause?: unknown;
    } = {}
  ) {
    // Sanitize message to strip any inadvertent authorization tokens
    const sanitizedMessage = sanitizeSecretString(message);
    super(sanitizedMessage);
    this.name = "AiGatewayError";
    this.code = options.code ?? "UNKNOWN_ERROR";
    this.statusCode = options.statusCode;
    this.provider = options.provider ?? "omniroute";
    this.model = options.model;
    this.requestId = options.requestId;
    this.details = options.details;
    this.isTransient = options.isTransient ?? false;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

export class AiGatewayAuthenticationError extends AiGatewayError {
  constructor(message = "Authentication failed with AI provider", options?: Partial<AiGatewayErrorDetails>) {
    super(message, {
      code: "AUTHENTICATION_ERROR",
      statusCode: options?.statusCode ?? 401,
      provider: options?.provider,
      model: options?.model,
      requestId: options?.requestId,
      details: options?.rawResponse,
      isTransient: false,
    });
    this.name = "AiGatewayAuthenticationError";
  }
}

export class AiGatewayRateLimitError extends AiGatewayError {
  readonly retryAfterMs?: number;

  constructor(
    message = "AI provider rate limit exceeded",
    options?: Partial<AiGatewayErrorDetails> & { retryAfterMs?: number }
  ) {
    super(message, {
      code: "RATE_LIMIT_ERROR",
      statusCode: options?.statusCode ?? 429,
      provider: options?.provider,
      model: options?.model,
      requestId: options?.requestId,
      details: options?.rawResponse,
      isTransient: true,
    });
    this.name = "AiGatewayRateLimitError";
    this.retryAfterMs = options?.retryAfterMs;
  }
}

export class AiGatewayTimeoutError extends AiGatewayError {
  readonly timeoutMs: number;

  constructor(
    message: string,
    options: Partial<AiGatewayErrorDetails> & { timeoutMs: number }
  ) {
    super(message, {
      code: "TIMEOUT_ERROR",
      statusCode: 408,
      provider: options?.provider,
      model: options?.model,
      requestId: options?.requestId,
      isTransient: true,
    });
    this.name = "AiGatewayTimeoutError";
    this.timeoutMs = options.timeoutMs;
  }
}

export class AiGatewayUnavailableError extends AiGatewayError {
  constructor(message = "AI provider is temporarily unavailable", options?: Partial<AiGatewayErrorDetails>) {
    super(message, {
      code: "UNAVAILABLE_ERROR",
      statusCode: options?.statusCode ?? 503,
      provider: options?.provider,
      model: options?.model,
      requestId: options?.requestId,
      details: options?.rawResponse,
      isTransient: true,
    });
    this.name = "AiGatewayUnavailableError";
  }
}

export class AiGatewayInvalidRequestError extends AiGatewayError {
  constructor(message: string, options?: Partial<AiGatewayErrorDetails>) {
    super(message, {
      code: "INVALID_REQUEST_ERROR",
      statusCode: options?.statusCode ?? 400,
      provider: options?.provider,
      model: options?.model,
      requestId: options?.requestId,
      details: options?.rawResponse,
      isTransient: false,
    });
    this.name = "AiGatewayInvalidRequestError";
  }
}

export class AiGatewayValidationError extends AiGatewayError {
  readonly rawText?: string;
  readonly validationIssues?: unknown;

  constructor(
    message: string,
    options?: Partial<AiGatewayErrorDetails> & { rawText?: string; validationIssues?: unknown }
  ) {
    super(message, {
      code: "VALIDATION_ERROR",
      statusCode: 422,
      provider: options?.provider,
      model: options?.model,
      requestId: options?.requestId,
      details: options?.validationIssues,
      isTransient: false,
    });
    this.name = "AiGatewayValidationError";
    this.rawText = options?.rawText;
    this.validationIssues = options?.validationIssues;
  }
}

export function sanitizeSecretString(input: string): string {
  if (!input) return input;
  return input
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/key=[A-Za-z0-9_\-\.]+/gi, "key=[REDACTED]")
    .replace(/(api[-_]?key["']?\s*[:=]\s*["']?)[A-Za-z0-9_\-\.]+(["']?)/gi, "$1[REDACTED]$2");
}
