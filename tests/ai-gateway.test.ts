import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  AiGatewayService,
  OmniRouteProvider,
  AiGatewayAuthenticationError,
  AiGatewayRateLimitError,
  AiGatewayTimeoutError,
  AiGatewayUnavailableError,
  AiGatewayValidationError,
  AiGatewayInvalidRequestError,
  MODEL_ROUTES,
  getAiGatewayConfig,
  extractJsonString,
  parseAndValidateJson,
} from "@/lib/ai";

describe("AI-01B — OmniRoute AI Gateway Service & Provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Gateway constructs request with configured OmniRoute base URL and headers", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockFetch = vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "chatcmpl-test-123",
          model: "auto",
          choices: [{ message: { content: "Hello from OmniRoute", role: "assistant" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
      };
    });

    const provider = new OmniRouteProvider({
      config: {
        baseUrl: "http://localhost:20128/v1",
        apiKey: "mock-secret-key-12345",
        defaultModel: "auto",
      },
      fetch: mockFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);
    const response = await gateway.generateText({
      messages: [{ role: "user", content: "Say hello" }],
      systemPrompt: "You are a helpful assistant.",
      model: MODEL_ROUTES.AUTO,
    });

    expect(capturedUrl).toBe("http://localhost:20128/v1/chat/completions");
    expect(capturedOptions?.method).toBe("POST");

    const headers = capturedOptions?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBe("Bearer mock-secret-key-12345");

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.model).toBe("auto");
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual({ role: "system", content: "You are a helpful assistant." });
    expect(body.messages[1]).toEqual({ role: "user", content: "Say hello" });

    expect(response.text).toBe("Hello from OmniRoute");
    expect(response.metadata.provider).toBe("omniroute");
    expect(response.metadata.model).toBe("auto");
    expect(response.metadata.requestId).toBe("chatcmpl-test-123");
  });

  it("2. API credentials are never included in returned application data or serialized errors", async () => {
    const secretApiKey = "sk-super-secret-production-key-99999";

    const mockFetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "Safe answer" } }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        }),
      };
    });

    const provider = new OmniRouteProvider({
      config: {
        baseUrl: "http://localhost:20128/v1",
        apiKey: secretApiKey,
      },
      fetch: mockFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);
    const response = await gateway.generateText({
      messages: [{ role: "user", content: "Test safety" }],
    });

    // Verify response does not leak credentials anywhere
    const serializedResponse = JSON.stringify(response);
    expect(serializedResponse).not.toContain(secretApiKey);
    expect(response.metadata).not.toHaveProperty("apiKey");
    expect(response.metadata).not.toHaveProperty("authorization");

    // Also verify error sanitization
    const failingFetch = vi.fn().mockImplementation(async () => {
      throw new Error(`Connection failed with header Authorization: Bearer ${secretApiKey}`);
    });

    const failingProvider = new OmniRouteProvider({
      config: {
        baseUrl: "http://localhost:20128/v1",
        apiKey: secretApiKey,
        defaultMaxRetries: 0,
      },
      fetch: failingFetch as unknown as typeof fetch,
    });

    const failingGateway = new AiGatewayService(failingProvider);
    await expect(
      failingGateway.generateText({ messages: [{ role: "user", content: "fail" }] })
    ).rejects.toThrow();

    try {
      await failingGateway.generateText({ messages: [{ role: "user", content: "fail" }] });
    } catch (err: unknown) {
      const serializedError = JSON.stringify(err, Object.getOwnPropertyNames(err as object));
      expect(serializedError).not.toContain(secretApiKey);
      expect((err as Error).message).toContain("[REDACTED]");
    }
  });

  it("3. Structured JSON response is validated successfully with Zod schema", async () => {
    const TestSchema = z.object({
      summary: z.string(),
      score: z.number().min(0).max(10),
      highlights: z.array(z.string()),
    });

    const validPayload = {
      summary: "Excellent understanding of Newton's third law",
      score: 9.5,
      highlights: ["Action-reaction pairs correctly identified", "Clear real-world examples"],
    };

    const mockFetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: `\`\`\`json\n${JSON.stringify(validPayload)}\n\`\`\``,
              },
            },
          ],
          usage: { prompt_tokens: 150, completion_tokens: 60, total_tokens: 210 },
        }),
      };
    });

    const provider = new OmniRouteProvider({
      config: { baseUrl: "http://localhost:20128/v1" },
      fetch: mockFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);
    const result = await gateway.generateStructured({
      messages: [{ role: "user", content: "Evaluate physics answer" }],
      schema: TestSchema,
      promptVersion: "eval-v1.0",
    });

    expect(result.data.summary).toBe("Excellent understanding of Newton's third law");
    expect(result.data.score).toBe(9.5);
    expect(result.data.highlights).toHaveLength(2);
    expect(result.metadata.promptVersion).toBe("eval-v1.0");
    expect(result.metadata.totalTokens).toBe(210);
  });

  it("4. Malformed structured response is rejected safely via AiGatewayValidationError", async () => {
    const TestSchema = z.object({
      score: z.number().min(0).max(10),
      reasoning: z.string(),
    });

    // Scenario A: Non-JSON plain text
    const nonJsonFetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "I cannot evaluate this question." } }],
        }),
      };
    });

    const gatewayA = new AiGatewayService(
      new OmniRouteProvider({
        config: { baseUrl: "http://localhost:20128/v1" },
        fetch: nonJsonFetch as unknown as typeof fetch,
      })
    );

    await expect(
      gatewayA.generateStructured({
        messages: [{ role: "user", content: "Evaluate" }],
        schema: TestSchema,
      })
    ).rejects.toThrow(AiGatewayValidationError);

    // Scenario B: Valid JSON but fails Zod schema constraints
    const invalidSchemaFetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ score: 99, reasoning: "Score exceeds max 10" }),
              },
            },
          ],
        }),
      };
    });

    const gatewayB = new AiGatewayService(
      new OmniRouteProvider({
        config: { baseUrl: "http://localhost:20128/v1" },
        fetch: invalidSchemaFetch as unknown as typeof fetch,
      })
    );

    try {
      await gatewayB.generateStructured({
        messages: [{ role: "user", content: "Evaluate" }],
        schema: TestSchema,
      });
      expect.unreachable("Should have thrown AiGatewayValidationError");
    } catch (err) {
      expect(err).toBeInstanceOf(AiGatewayValidationError);
      const valErr = err as AiGatewayValidationError;
      expect(valErr.code).toBe("VALIDATION_ERROR");
      expect(valErr.rawText).toContain("99");
      expect(valErr.validationIssues).toBeDefined();
    }
  });

  it("5. Timeout is classified correctly as AiGatewayTimeoutError", async () => {
    const hangingFetch = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener("abort", () => {
          const abortError = new Error("The operation was aborted");
          abortError.name = "AbortError";
          reject(abortError);
        });
      });
    });

    const provider = new OmniRouteProvider({
      config: {
        baseUrl: "http://localhost:20128/v1",
        defaultTimeoutMs: 50,
        defaultMaxRetries: 0,
      },
      fetch: hangingFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);

    await expect(
      gateway.generateText({
        messages: [{ role: "user", content: "Quick call" }],
        timeoutMs: 30,
        maxRetries: 0,
      })
    ).rejects.toThrow(AiGatewayTimeoutError);
  });

  it("6. Transient provider failure retries according to configuration", async () => {
    let callCount = 0;

    const intermittentFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First call fails with 503 Service Unavailable
        return {
          ok: false,
          status: 503,
          text: async () => JSON.stringify({ error: { message: "Model engine booting up" } }),
          headers: new Headers(),
        };
      }
      // Second call succeeds
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "Recovered successfully on retry" } }],
          usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
        }),
      };
    });

    const provider = new OmniRouteProvider({
      config: {
        baseUrl: "http://localhost:20128/v1",
        defaultMaxRetries: 2,
        initialBackoffMs: 10, // Fast backoff for test
        backoffFactor: 1,
      },
      fetch: intermittentFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);
    const response = await gateway.generateText({
      messages: [{ role: "user", content: "Retry test" }],
      maxRetries: 2,
    });

    expect(callCount).toBe(2);
    expect(response.text).toBe("Recovered successfully on retry");
  });

  it("7. Authentication failure is NOT retried indefinitely (fails immediately)", async () => {
    let callCount = 0;

    const authFailingFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: "Invalid OmniRoute API Key" } }),
        headers: new Headers(),
      };
    });

    const provider = new OmniRouteProvider({
      config: {
        baseUrl: "http://localhost:20128/v1",
        defaultMaxRetries: 3,
        initialBackoffMs: 10,
      },
      fetch: authFailingFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);

    await expect(
      gateway.generateText({
        messages: [{ role: "user", content: "Auth test" }],
        maxRetries: 3,
      })
    ).rejects.toThrow(AiGatewayAuthenticationError);

    // Should fail on the first attempt without retrying 401
    expect(callCount).toBe(1);
  });

  it("8. Model and route selection is passed through correctly", async () => {
    let capturedBody: { model?: string; temperature?: number; max_tokens?: number } | null = null;

    const mockFetch = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      capturedBody = JSON.parse(options.body as string);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          model: "auto/reasoning",
          choices: [{ message: { content: "Deep reasoning done" } }],
        }),
      };
    });

    const provider = new OmniRouteProvider({
      config: { baseUrl: "http://localhost:20128/v1" },
      fetch: mockFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);
    const response = await gateway.generateText({
      messages: [{ role: "user", content: "Complex math question" }],
      model: MODEL_ROUTES.REASONING,
      temperature: 0.2,
      maxTokens: 1000,
    });

    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.model).toBe("auto/reasoning");
    expect(capturedBody!.temperature).toBe(0.2);
    expect(capturedBody!.max_tokens).toBe(1000);
    expect(response.metadata.model).toBe("auto/reasoning");
  });

  it("9. Prompt version is preserved in metadata", async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "Versioned evaluation output" } }],
        }),
      };
    });

    const provider = new OmniRouteProvider({
      config: { baseUrl: "http://localhost:20128/v1" },
      fetch: mockFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);
    const response = await gateway.generateText({
      messages: [{ role: "user", content: "Test prompt versioning" }],
      promptVersion: "eval-subjective-v1.2",
    });

    expect(response.metadata.promptVersion).toBe("eval-subjective-v1.2");
  });

  it("10. Missing token/cost metadata does not cause failure", async () => {
    const mockFetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        // Provider response omitting usage and cost metadata entirely
        json: async () => ({
          id: "resp-without-usage",
          model: "local/llama3",
          choices: [{ message: { content: "Local model response without usage object" } }],
        }),
      };
    });

    const provider = new OmniRouteProvider({
      config: { baseUrl: "http://localhost:20128/v1" },
      fetch: mockFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);
    const response = await gateway.generateText({
      messages: [{ role: "user", content: "Hello local model" }],
    });

    expect(response.text).toBe("Local model response without usage object");
    expect(response.metadata.promptTokens).toBeNull();
    expect(response.metadata.completionTokens).toBeNull();
    expect(response.metadata.totalTokens).toBeNull();
    expect(response.metadata.estimatedCostUsd).toBeNull();
    expect(response.metadata.durationMs).toBeGreaterThanOrEqual(0);
    expect(response.metadata.model).toBe("local/llama3");
  });

  it("11. JSON parser handles varied markdown code fences and wrapper commentary", () => {
    const schema = z.object({ message: z.string() });

    // Clean JSON
    expect(parseAndValidateJson('{"message":"hello"}', schema)).toEqual({ message: "hello" });

    // ```json ... ```
    expect(parseAndValidateJson('```json\n{"message":"hello"}\n```', schema)).toEqual({
      message: "hello",
    });

    // ``` ... ```
    expect(parseAndValidateJson('```\n{"message":"hello"}\n```', schema)).toEqual({
      message: "hello",
    });

    // Surrounded by chat commentary
    const wrapped = 'Sure! Here is the JSON output requested:\n{"message":"hello"}\nHope this helps!';
    expect(parseAndValidateJson(wrapped, schema)).toEqual({ message: "hello" });
  });

  it("12. 429 Rate limit retry uses Retry-After header and succeeds", async () => {
    let attempts = 0;
    const rateLimitFetch = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts === 1) {
        const headers = new Headers();
        headers.set("retry-after", "0.01"); // 10ms
        return {
          ok: false,
          status: 429,
          text: async () => JSON.stringify({ error: { message: "Rate limit exceeded" } }),
          headers,
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "Rate limit cleared" } }],
        }),
      };
    });

    const provider = new OmniRouteProvider({
      config: {
        baseUrl: "http://localhost:20128/v1",
        defaultMaxRetries: 2,
        initialBackoffMs: 10,
      },
      fetch: rateLimitFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);
    const res = await gateway.generateText({
      messages: [{ role: "user", content: "Rate limit test" }],
    });

    expect(attempts).toBe(2);
    expect(res.text).toBe("Rate limit cleared");
  });

  it("13. 400 Bad Request / 422 Invalid Request is not retried", async () => {
    let attempts = 0;
    const invalidReqFetch = vi.fn().mockImplementation(async () => {
      attempts++;
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: "Invalid parameter max_tokens" } }),
        headers: new Headers(),
      };
    });

    const provider = new OmniRouteProvider({
      config: { baseUrl: "http://localhost:20128/v1", defaultMaxRetries: 3 },
      fetch: invalidReqFetch as unknown as typeof fetch,
    });

    const gateway = new AiGatewayService(provider);
    await expect(
      gateway.generateText({ messages: [{ role: "user", content: "Bad req test" }] })
    ).rejects.toThrow(AiGatewayInvalidRequestError);

    expect(attempts).toBe(1);
  });

  it("14. Default configuration resolves safely when environment variables are omitted", () => {
    const originalEnv = { ...process.env };
    delete process.env.OMNIROUTE_BASE_URL;
    delete process.env.OMNIROUTE_API_KEY;
    delete process.env.OMNIROUTE_DEFAULT_MODEL;
    delete process.env.OMNIROUTE_DEFAULT_TIMEOUT_MS;
    delete process.env.OMNIROUTE_MAX_RETRIES;

    const config = getAiGatewayConfig();
    expect(config.baseUrl).toBe("http://localhost:20128/v1");
    expect(config.apiKey).toBeUndefined();
    expect(config.defaultModel).toBe("auto");
    expect(config.defaultTimeoutMs).toBe(60000);
    expect(config.defaultMaxRetries).toBe(2);

    process.env = originalEnv;
  });

  it("15. MODEL_ROUTES constants provide all required provider-neutral logical model aliases", () => {
    expect(MODEL_ROUTES.AUTO).toBe("auto");
    expect(MODEL_ROUTES.REASONING).toBe("auto/reasoning");
    expect(MODEL_ROUTES.VISION).toBe("auto/vision");
    expect(MODEL_ROUTES.MULTIMODAL).toBe("auto/multimodal");
    expect(MODEL_ROUTES.FAST).toBe("auto/fast");
    expect(MODEL_ROUTES.CHEAP).toBe("auto/cheap");
  });
});
