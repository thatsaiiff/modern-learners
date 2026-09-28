import { z } from "zod";

export type AiRole = "system" | "user" | "assistant";

export interface AiTextContentPart {
  type: "text";
  text: string;
}

export interface AiImageContentPart {
  type: "image_url";
  imageUrl: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export type AiContentPart = AiTextContentPart | AiImageContentPart;

export interface AiMessage {
  role: AiRole;
  content: string | AiContentPart[];
  name?: string;
}

export interface AiGatewayOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  promptVersion?: string;
  responseFormat?: "text" | "json_object";
  signal?: AbortSignal;
}

export interface GenerateTextRequest {
  messages: AiMessage[];
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  promptVersion?: string;
  signal?: AbortSignal;
}

export interface GenerateStructuredRequest<T> {
  messages: AiMessage[];
  schema: z.ZodType<T>;
  systemPrompt?: string;
  schemaName?: string;
  schemaDescription?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  promptVersion?: string;
  signal?: AbortSignal;
}

export interface AiResponseMetadata {
  provider: string;
  model: string;
  requestId?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  estimatedCostUsd?: number | null;
  durationMs: number;
  promptVersion?: string | null;
  timestamp: Date;
}

export interface AiGatewayTextResponse {
  text: string;
  metadata: AiResponseMetadata;
}

export interface AiGatewayStructuredResponse<T> {
  data: T;
  rawText: string;
  metadata: AiResponseMetadata;
}

export interface ProviderChatParams {
  messages: AiMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
  timeoutMs: number;
  maxRetries: number;
  promptVersion?: string;
  signal?: AbortSignal;
}

export interface ProviderChatResult {
  text: string;
  model: string;
  requestId?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  estimatedCostUsd?: number | null;
  durationMs: number;
  rawUsage?: unknown;
}

export interface AiGatewayProvider {
  readonly name: string;
  executeChatCompletion(params: ProviderChatParams): Promise<ProviderChatResult>;
}

export interface IAiGatewayService {
  generateText(request: GenerateTextRequest): Promise<AiGatewayTextResponse>;
  generateStructured<T>(request: GenerateStructuredRequest<T>): Promise<AiGatewayStructuredResponse<T>>;
}
