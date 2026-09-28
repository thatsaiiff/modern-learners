import {
  AiGatewayProvider,
  AiGatewayStructuredResponse,
  AiGatewayTextResponse,
  AiMessage,
  AiResponseMetadata,
  GenerateStructuredRequest,
  GenerateTextRequest,
  IAiGatewayService,
} from "./types";
import { OmniRouteProvider } from "./omniroute-provider";
import { parseAndValidateJson } from "./json-parser";
import { MODEL_ROUTES } from "./config";

export class AiGatewayService implements IAiGatewayService {
  private readonly provider: AiGatewayProvider;

  constructor(provider?: AiGatewayProvider) {
    this.provider = provider || new OmniRouteProvider();
  }

  async generateText(request: GenerateTextRequest): Promise<AiGatewayTextResponse> {
    const messages = this.prepareMessages(request.messages, request.systemPrompt);
    const model = request.model || MODEL_ROUTES.AUTO;

    const result = await this.provider.executeChatCompletion({
      messages,
      model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      responseFormat: "text",
      timeoutMs: request.timeoutMs ?? 60000,
      maxRetries: request.maxRetries ?? 2,
      promptVersion: request.promptVersion,
      signal: request.signal,
    });

    const metadata: AiResponseMetadata = {
      provider: this.provider.name,
      model: result.model,
      requestId: result.requestId ?? null,
      promptTokens: result.promptTokens ?? null,
      completionTokens: result.completionTokens ?? null,
      totalTokens: result.totalTokens ?? null,
      estimatedCostUsd: result.estimatedCostUsd ?? null,
      durationMs: result.durationMs,
      promptVersion: request.promptVersion ?? null,
      timestamp: new Date(),
    };

    return {
      text: result.text,
      metadata,
    };
  }

  async generateStructured<T>(
    request: GenerateStructuredRequest<T>
  ): Promise<AiGatewayStructuredResponse<T>> {
    const messages = this.prepareMessages(request.messages, request.systemPrompt);
    const model = request.model || MODEL_ROUTES.AUTO;

    const result = await this.provider.executeChatCompletion({
      messages,
      model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      responseFormat: "json_object",
      timeoutMs: request.timeoutMs ?? 60000,
      maxRetries: request.maxRetries ?? 2,
      promptVersion: request.promptVersion,
      signal: request.signal,
    });

    const validatedData = parseAndValidateJson(result.text, request.schema, {
      provider: this.provider.name,
      model: result.model,
    });

    const metadata: AiResponseMetadata = {
      provider: this.provider.name,
      model: result.model,
      requestId: result.requestId ?? null,
      promptTokens: result.promptTokens ?? null,
      completionTokens: result.completionTokens ?? null,
      totalTokens: result.totalTokens ?? null,
      estimatedCostUsd: result.estimatedCostUsd ?? null,
      durationMs: result.durationMs,
      promptVersion: request.promptVersion ?? null,
      timestamp: new Date(),
    };

    return {
      data: validatedData,
      rawText: result.text,
      metadata,
    };
  }

  private prepareMessages(messages: AiMessage[], systemPrompt?: string): AiMessage[] {
    if (!systemPrompt) {
      return messages;
    }

    const firstMsg = messages[0];
    if (firstMsg && firstMsg.role === "system") {
      // System message already provided in messages array
      return messages;
    }

    return [{ role: "system", content: systemPrompt }, ...messages];
  }
}

// Global default singleton instance for use across application services
export const aiGateway = new AiGatewayService();
export default aiGateway;
