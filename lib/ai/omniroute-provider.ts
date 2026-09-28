import {
  AiGatewayProvider,
  ProviderChatParams,
  ProviderChatResult,
  AiMessage,
  AiContentPart,
} from "./types";
import { AiGatewayConfig, getAiGatewayConfig } from "./config";
import {
  AiGatewayAuthenticationError,
  AiGatewayInvalidRequestError,
  AiGatewayRateLimitError,
  AiGatewayTimeoutError,
  AiGatewayUnavailableError,
  AiGatewayError,
  sanitizeSecretString,
} from "./errors";

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } }
      >;
  name?: string;
}

interface OpenAIChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    estimated_cost_usd?: number;
    cost?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
}

export class OmniRouteProvider implements AiGatewayProvider {
  readonly name = "omniroute";
  private readonly config: AiGatewayConfig;
  private readonly customFetch?: typeof fetch;

  constructor(options?: { config?: Partial<AiGatewayConfig>; fetch?: typeof fetch }) {
    this.config = getAiGatewayConfig(options?.config);
    this.customFetch = options?.fetch;
  }

  async executeChatCompletion(params: ProviderChatParams): Promise<ProviderChatResult> {
    const fetchFn = this.customFetch || globalThis.fetch;
    if (!fetchFn) {
      throw new AiGatewayUnavailableError("No global fetch implementation found in runtime environment", {
        provider: this.name,
        model: params.model,
      });
    }

    const maxRetries = params.maxRetries ?? this.config.defaultMaxRetries;
    const timeoutMs = params.timeoutMs ?? this.config.defaultTimeoutMs;
    const model = params.model || this.config.defaultModel;

    let lastError: Error | null = null;
    const totalAttempts = Math.max(1, maxRetries + 1);

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      if (params.signal?.aborted) {
        throw new AiGatewayTimeoutError("AI request was aborted by caller signal", {
          provider: this.name,
          model,
          timeoutMs: 0,
        });
      }

      const startTime = Date.now();
      const controller = new AbortController();
      let isTimeout = false;

      const timer = setTimeout(() => {
        isTimeout = true;
        controller.abort();
      }, timeoutMs);

      const abortListener = () => {
        controller.abort();
      };
      if (params.signal) {
        params.signal.addEventListener("abort", abortListener, { once: true });
      }

      try {
        const url = `${this.config.baseUrl}/chat/completions`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };

        if (this.config.apiKey) {
          headers["Authorization"] = `Bearer ${this.config.apiKey}`;
        }

        const requestBody: Record<string, unknown> = {
          model,
          messages: this.formatMessages(params.messages),
        };

        if (typeof params.temperature === "number") {
          requestBody.temperature = params.temperature;
        }

        if (typeof params.maxTokens === "number") {
          requestBody.max_tokens = params.maxTokens;
        }

        if (params.responseFormat === "json_object") {
          requestBody.response_format = { type: "json_object" };
        }

        const response = await fetchFn(url, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timer);
        if (params.signal) {
          params.signal.removeEventListener("abort", abortListener);
        }

        const durationMs = Date.now() - startTime;
        const requestIdHeader = response.headers?.get?.("x-request-id") || null;

        if (!response.ok) {
          const status = response.status;
          let errorPayload: unknown = null;
          let errorMessage = `Provider returned HTTP ${status}`;

          try {
            const rawBody = await response.text();
            try {
              errorPayload = JSON.parse(rawBody);
              if (
                errorPayload &&
                typeof errorPayload === "object" &&
                "error" in errorPayload &&
                typeof (errorPayload as { error: { message?: string } }).error?.message === "string"
              ) {
                errorMessage = (errorPayload as { error: { message: string } }).error.message;
              }
            } catch {
              errorPayload = rawBody;
            }
          } catch {
            // ignore response body read failure
          }

          errorMessage = sanitizeSecretString(errorMessage);

          // Handle specific HTTP Status Codes
          if (status === 401 || status === 403) {
            throw new AiGatewayAuthenticationError(errorMessage, {
              statusCode: status,
              provider: this.name,
              model,
              requestId: requestIdHeader,
              rawResponse: errorPayload,
            });
          }

          if (status === 429) {
            const retryAfterHeader = response.headers?.get?.("retry-after");
            const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
            const retryAfterMs = Number.isNaN(retryAfterSec) ? undefined : retryAfterSec * 1000;

            const err = new AiGatewayRateLimitError(errorMessage, {
              statusCode: 429,
              provider: this.name,
              model,
              requestId: requestIdHeader,
              rawResponse: errorPayload,
              retryAfterMs,
            });

            if (attempt < totalAttempts - 1) {
              lastError = err;
              await this.waitBackoff(attempt, retryAfterMs);
              continue;
            }
            throw err;
          }

          if (status === 400 || status === 422) {
            throw new AiGatewayInvalidRequestError(errorMessage, {
              statusCode: status,
              provider: this.name,
              model,
              requestId: requestIdHeader,
              rawResponse: errorPayload,
            });
          }

          // Transient server errors (500, 502, 503, 504)
          if (status >= 500 && status <= 599) {
            const err = new AiGatewayUnavailableError(errorMessage, {
              statusCode: status,
              provider: this.name,
              model,
              requestId: requestIdHeader,
              rawResponse: errorPayload,
            });

            if (attempt < totalAttempts - 1) {
              lastError = err;
              await this.waitBackoff(attempt);
              continue;
            }
            throw err;
          }

          // Other unexpected status codes
          const err = new AiGatewayError(errorMessage, {
            statusCode: status,
            provider: this.name,
            model,
            requestId: requestIdHeader,
            details: errorPayload,
            isTransient: false,
          });
          throw err;
        }

        const data = (await response.json()) as OpenAIChatCompletionResponse;
        const text = data.choices?.[0]?.message?.content ?? "";
        const usage = data.usage;

        const estimatedCost =
          typeof usage?.estimated_cost_usd === "number"
            ? usage.estimated_cost_usd
            : typeof usage?.cost === "number"
              ? usage.cost
              : null;

        return {
          text,
          model: data.model || model,
          requestId: data.id || requestIdHeader,
          promptTokens: typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : null,
          completionTokens: typeof usage?.completion_tokens === "number" ? usage.completion_tokens : null,
          totalTokens: typeof usage?.total_tokens === "number" ? usage.total_tokens : null,
          estimatedCostUsd: estimatedCost,
          durationMs,
          rawUsage: usage ?? null,
        };
      } catch (error) {
        clearTimeout(timer);
        if (params.signal) {
          params.signal.removeEventListener("abort", abortListener);
        }

        if (isTimeout) {
          throw new AiGatewayTimeoutError(`AI gateway request timed out after ${timeoutMs}ms`, {
            provider: this.name,
            model,
            timeoutMs,
          });
        }

        if (error instanceof AiGatewayError && !error.isTransient) {
          throw error;
        }

        // If it's a fetch network error (e.g. connection refused, network drop)
        const isNetworkOrTransient =
          error instanceof AiGatewayError
            ? error.isTransient
            : (error as Error)?.name === "TypeError" ||
              (error as Error)?.message?.includes("fetch failed") ||
              (error as Error)?.message?.includes("ECONNREFUSED") ||
              (error as Error)?.message?.includes("ETIMEDOUT");

        if (isNetworkOrTransient && attempt < totalAttempts - 1) {
          lastError =
            error instanceof Error
              ? error
              : new Error(sanitizeSecretString(String(error)));
          await this.waitBackoff(attempt);
          continue;
        }

        if (error instanceof AiGatewayError) {
          throw error;
        }

        throw new AiGatewayUnavailableError(
          sanitizeSecretString(`AI gateway request failed: ${(error as Error)?.message || "Unknown error"}`),
          {
            provider: this.name,
            model,
            rawResponse: { error: (error as Error)?.message },
          }
        );
      }
    }

    throw (
      lastError ||
      new AiGatewayUnavailableError("AI gateway maximum retries exceeded", {
        provider: this.name,
        model,
      })
    );
  }

  private formatMessages(messages: AiMessage[]): OpenAIChatMessage[] {
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: msg.content,
          name: msg.name,
        };
      }

      const formattedContent = msg.content.map((part: AiContentPart) => {
        if (part.type === "text") {
          return { type: "text" as const, text: part.text };
        }
        return {
          type: "image_url" as const,
          image_url: {
            url: part.imageUrl.url,
            detail: part.imageUrl.detail,
          },
        };
      });

      return {
        role: msg.role,
        content: formattedContent,
        name: msg.name,
      };
    });
  }

  private async waitBackoff(attempt: number, explicitRetryAfterMs?: number): Promise<void> {
    if (typeof explicitRetryAfterMs === "number" && explicitRetryAfterMs > 0) {
      const clampedDelay = Math.min(explicitRetryAfterMs, 30000);
      await new Promise((resolve) => setTimeout(resolve, clampedDelay));
      return;
    }

    const base = this.config.initialBackoffMs;
    const factor = this.config.backoffFactor;
    const delay = base * Math.pow(factor, attempt);
    // Add jitter (up to 20%)
    const jitter = delay * 0.2 * Math.random();
    const finalDelay = Math.min(delay + jitter, 15000);

    await new Promise((resolve) => setTimeout(resolve, finalDelay));
  }
}
