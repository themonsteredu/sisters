import { createOpenAI } from "@ai-sdk/openai";
import { createGoogle } from "@ai-sdk/google";
import { generateText, Output, transcribe } from "ai";
import type { z } from "zod";
import type { AICapability, AIModelSelection, AIProviderName } from "@/lib/domain/types";
import { logError } from "@/lib/observability/log";
import { getModelSelection, getProviderKey } from "./settings";

export class AIUnavailableError extends Error {
  constructor(message = "사용 가능한 AI 공급자가 없습니다.") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

function createLanguageModel(provider: AIProviderName, modelId: string, apiKey: string) {
  if (provider === "openai") return createOpenAI({ apiKey })(modelId);
  return createGoogle({ apiKey })(modelId);
}

async function executeStructured<T>(
  selection: Pick<AIModelSelection, "primaryProvider" | "primaryModel">,
  schema: z.ZodType<T>,
  prompt: string,
  familyId?: string,
) {
  const key = await getProviderKey(selection.primaryProvider, familyId);
  if (!key) throw new AIUnavailableError(`${selection.primaryProvider} API 키가 등록되지 않았습니다.`);
  const result = await generateText({
    model: createLanguageModel(selection.primaryProvider, selection.primaryModel, key),
    output: Output.object({ schema }),
    prompt,
    abortSignal: AbortSignal.timeout(45_000),
  });
  return result.output;
}

// A missing or rejected key will fail identically on every attempt, so retrying
// it only burns the budget before the fallback gets its turn.
function isRetryable(error: unknown) {
  return !(error instanceof AIUnavailableError);
}

const primaryAttempts = 2;
const retryBaseDelayMs = 400;

function backoffDelay(attempt: number) {
  // Exponential with jitter so concurrent jobs do not retry in lockstep.
  const ceiling = retryBaseDelayMs * 2 ** attempt;
  return ceiling / 2 + Math.random() * (ceiling / 2);
}

export async function runStructuredAI<T>(options: {
  capability: AICapability;
  schema: z.ZodType<T>;
  prompt: string;
  familyId?: string;
}) {
  const selection = await getModelSelection(options.capability, options.familyId);
  let lastError: unknown;

  for (let attempt = 0; attempt < primaryAttempts; attempt += 1) {
    try {
      const output = await executeStructured(selection, options.schema, options.prompt, options.familyId);
      return { output, provider: selection.primaryProvider, model: selection.primaryModel, usedFallback: false };
    } catch (error) {
      lastError = error;
      logError("ai/router", error, {
        capability: options.capability,
        provider: selection.primaryProvider,
        model: selection.primaryModel,
        attempt: attempt + 1,
      });
      if (!isRetryable(error)) break;
      if (attempt + 1 < primaryAttempts) {
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
      }
    }
  }

  if (selection.fallbackProvider && selection.fallbackModel) {
    try {
      const fallback = {
        primaryProvider: selection.fallbackProvider,
        primaryModel: selection.fallbackModel,
      };
      const output = await executeStructured(fallback, options.schema, options.prompt, options.familyId);
      return { output, provider: fallback.primaryProvider, model: fallback.primaryModel, usedFallback: true };
    } catch (error) {
      lastError = error;
      logError("ai/router", error, {
        capability: options.capability,
        provider: selection.fallbackProvider,
        model: selection.fallbackModel,
        stage: "fallback",
      });
    }
  }

  throw new AIUnavailableError(lastError instanceof Error ? lastError.message : undefined);
}

export async function transcribeSpeech(options: { audio: Uint8Array; familyId?: string }) {
  const selection = await getModelSelection("transcribeSpeech", options.familyId);
  if (selection.primaryProvider !== "openai") {
    throw new AIUnavailableError("현재 음성 인식은 OpenAI 전사 모델을 사용합니다.");
  }
  const key = await getProviderKey("openai", options.familyId);
  if (!key) throw new AIUnavailableError("OpenAI API 키가 등록되지 않았습니다.");
  const provider = createOpenAI({ apiKey: key });
  const result = await transcribe({
    model: provider.transcription(selection.primaryModel),
    audio: options.audio,
    providerOptions: { openai: { language: "en" } },
  });
  return { text: result.text, language: result.language, model: selection.primaryModel, provider: "openai" as const };
}
