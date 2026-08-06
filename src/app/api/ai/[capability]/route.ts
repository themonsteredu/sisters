import { z } from "zod";
import { getParentActor } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
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

const bodySchema = z.object({ context: z.string().min(1).max(50_000), familyId: z.uuid().optional() });

export async function POST(request: Request, { params }: { params: Promise<{ capability: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await getParentActor();
    if (!actor) return Response.json({ error: "부모 로그인이 필요합니다." }, { status: 401 });
    const { capability: rawCapability } = await params;
    const capability = capabilitySchema.parse(rawCapability);
    const { context, familyId } = bodySchema.parse(await request.json());

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
    return Response.json(
      { error: error instanceof Error ? error.message : "AI 작업을 완료하지 못했습니다.", manualReview: true },
      { status: 400 },
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
