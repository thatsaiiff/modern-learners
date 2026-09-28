export interface AiGatewayConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  defaultTimeoutMs: number;
  defaultMaxRetries: number;
  initialBackoffMs: number;
  backoffFactor: number;
}

export const MODEL_ROUTES = {
  AUTO: "auto",
  REASONING: "auto/reasoning",
  VISION: "auto/vision",
  MULTIMODAL: "auto/multimodal",
  FAST: "auto/fast",
  CHEAP: "auto/cheap",
} as const;

export type ModelRoute = (typeof MODEL_ROUTES)[keyof typeof MODEL_ROUTES] | string;

export function getAiGatewayConfig(overrides?: Partial<AiGatewayConfig>): AiGatewayConfig {
  const envBaseUrl = process.env.OMNIROUTE_BASE_URL || "http://localhost:20128/v1";
  // Clean trailing slashes
  const baseUrl = envBaseUrl.replace(/\/+$/, "");

  const apiKey = process.env.OMNIROUTE_API_KEY || undefined;
  const defaultModel = process.env.OMNIROUTE_DEFAULT_MODEL || MODEL_ROUTES.AUTO;
  const defaultTimeoutMs = parseInt(process.env.OMNIROUTE_DEFAULT_TIMEOUT_MS || "60000", 10);
  const defaultMaxRetries = parseInt(process.env.OMNIROUTE_MAX_RETRIES || "2", 10);
  const initialBackoffMs = parseInt(process.env.OMNIROUTE_INITIAL_BACKOFF_MS || "500", 10);
  const backoffFactor = parseFloat(process.env.OMNIROUTE_BACKOFF_FACTOR || "2");

  return {
    baseUrl: overrides?.baseUrl ?? baseUrl,
    apiKey: overrides?.apiKey ?? apiKey,
    defaultModel: overrides?.defaultModel ?? defaultModel,
    defaultTimeoutMs: overrides?.defaultTimeoutMs ?? (Number.isNaN(defaultTimeoutMs) ? 60000 : defaultTimeoutMs),
    defaultMaxRetries: overrides?.defaultMaxRetries ?? (Number.isNaN(defaultMaxRetries) ? 2 : defaultMaxRetries),
    initialBackoffMs: overrides?.initialBackoffMs ?? (Number.isNaN(initialBackoffMs) ? 500 : initialBackoffMs),
    backoffFactor: overrides?.backoffFactor ?? (Number.isNaN(backoffFactor) ? 2 : backoffFactor),
  };
}
