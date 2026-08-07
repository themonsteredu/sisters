import { z } from "zod";
import { AIUnavailableError } from "@/lib/ai/router";
import { resolveParentFamily } from "@/lib/auth/family";
import { isDemoMode } from "@/lib/config";
import { logError } from "@/lib/observability/log";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/request";
import {
  analyzeSubmissionWithAI,
  generatePlanWithAI,
  generateTestWithAI,
  gradeFreeResponseWithAI,
  parseOutlineWithAI,
} from "@/lib/ai/service";

const capabilitySchema = z.enum([
  "parseCourseOutline",
  "generateStudyPlan",
  "analyzeSubmission",
  "generateTest",
  "gradeFreeResponse",
]);

// `familyId` is deliberately absent: it is derived from the session, never from
// the request. A client-supplied value would select another family's decrypted
// provider key, because the lookup runs on the service-role client.
const bodySchema = z.object({ context: z.string().min(1).max(50_000) });

// Each call can fan out to three provider requests at a 45s timeout, so this
// bounds what one family can spend on the operator's key.
const requestsPerWindow = 20;
const windowMs = 60_000;

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ capability: string }> }) {
  let capability: z.infer<typeof capabilitySchema> | undefined;

  try {
    try {
      assertSameOrigin(request);
    } catch {
      throw new HttpError(403, "허용되지 않은 요청 출처입니다.");
    }

    const resolution = await resolveParentFamily();
    if (!resolution.ok) throw new HttpError(resolution.status, resolution.error);
    const { familyId } = resolution.context;

    const parsedCapability = capabilitySchema.safeParse((await params).capability);
    if (!parsedCapability.success) throw new HttpError(404, "지원하지 않는 AI 기능입니다.");
    capability = parsedCapability.data;

    const parsedBody = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsedBody.success) throw new HttpError(422, "요청 형식을 확인해 주세요.");
    const { context } = parsedBody.data;

    const limit = consumeRateLimit(`ai:${familyId}`, requestsPerWindow, windowMs);
    if (!limit.allowed) {
      return Response.json(
        { error: "AI 요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    if (isDemoMode && !process.env.OPENAI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json({ demo: true, capability, output: demoOutput(capability) });
    }

    const operations = {
      parseCourseOutline: () => parseOutlineWithAI(context, familyId),
      generateStudyPlan: () => generatePlanWithAI(context, familyId),
      analyzeSubmission: () => analyzeSubmissionWithAI(context, familyId),
      generateTest: () => generateTestWithAI(context, familyId),
      gradeFreeResponse: () => gradeFreeResponseWithAI(context, familyId),
    };
    return Response.json(await operations[capability]());
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    // Everything below is an unexpected server-side failure. Log the detail and
    // return a generic message — provider and PostgREST errors must not be
    // echoed back to the browser.
    logError("api/ai", error, { capability });

    if (error instanceof AIUnavailableError) {
      return Response.json(
        { error: "AI 공급자를 사용할 수 없습니다. 부모 검수로 진행해 주세요.", manualReview: true },
        { status: 503 },
      );
    }

    return Response.json(
      { error: "AI 작업을 완료하지 못했습니다.", manualReview: true },
      { status: 500 },
    );
  }
}

function demoOutput(capability: z.infer<typeof capabilitySchema>) {
  if (capability === "analyzeSubmission") return { summary: "데모 분석 결과입니다.", detectedPages: ["88", "89"], completionPercent: 92, blurScore: 0.08, blankAreas: [], flags: [], confidence: 0.9 };
  if (capability === "gradeFreeResponse") return { scorePercent: 82, correct: true, rationale: "핵심 개념이 포함되었습니다.", missingKeywords: [], confidence: 0.84, needsParentReview: true };
  if (capability === "generateTest") return { title: "데모 테스트", questions: [] };
  if (capability === "generateStudyPlan") return { summary: "12강을 평일에 분배했습니다.", warnings: [], tasks: [] };
  return { lessons: [{ index: 1, title: "문장의 형식" }] };
}
