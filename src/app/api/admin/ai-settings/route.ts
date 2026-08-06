import { z } from "zod";
import { defaultModelSelections } from "@/lib/ai/catalog";
import { requireAdmin } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { encryptCredential } from "@/lib/security/credentials";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const selectionSchema = z.object({
  capability: z.enum([
    "parseCourseOutline",
    "generateStudyPlan",
    "analyzeSubmission",
    "generateTest",
    "gradeFreeResponse",
    "transcribeSpeech",
  ]),
  primaryProvider: z.enum(["openai", "google"]),
  primaryModel: z.string().min(1).max(100),
  fallbackProvider: z.enum(["openai", "google"]).optional(),
  fallbackModel: z.string().min(1).max(100).optional(),
});

const updateSchema = z.object({
  provider: z.enum(["openai", "google"]).optional(),
  apiKey: z.string().min(10).max(500).optional(),
  selections: z.array(selectionSchema).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const admin = createSupabaseAdminClient();
    if (!admin) {
      return Response.json({
        demo: true,
        providers: {
          openai: { configured: Boolean(process.env.OPENAI_API_KEY), lastFour: null },
          google: { configured: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY), lastFour: null },
        },
        selections: defaultModelSelections,
      });
    }

    const [{ data: configs }, { data: assignments }] = await Promise.all([
      admin.from("sisters_ai_provider_configs").select("provider,key_last_four,enabled").is("family_id", null),
      admin
        .from("sisters_ai_model_assignments")
        .select("capability,primary_provider,primary_model,fallback_provider,fallback_model")
        .is("family_id", null),
    ]);
    const providers = Object.fromEntries(
      (configs ?? []).map((item) => [
        item.provider,
        { configured: item.enabled, lastFour: item.key_last_four },
      ]),
    );
    const selections = assignments?.length
      ? assignments.map((item) => ({
          capability: item.capability,
          primaryProvider: item.primary_provider,
          primaryModel: item.primary_model,
          fallbackProvider: item.fallback_provider ?? undefined,
          fallbackModel: item.fallback_model ?? undefined,
        }))
      : defaultModelSelections;
    return Response.json({ demo: false, providers, selections });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "관리자 권한이 필요합니다." }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdmin();
    const payload = updateSchema.parse(await request.json());
    const admin = createSupabaseAdminClient();

    if (!admin) {
      if (isDemoMode && !payload.apiKey) {
        return Response.json({ ok: true, persisted: false, message: "모델 선택을 이 기기에 저장했습니다." });
      }
      return Response.json(
        { error: "Supabase와 CREDENTIAL_ENCRYPTION_KEY를 연결한 뒤 API 키를 저장할 수 있습니다." },
        { status: 503 },
      );
    }

    if (payload.provider && payload.apiKey) {
      const { error } = await admin.from("sisters_ai_provider_configs").upsert(
        {
          family_id: null,
          provider: payload.provider,
          encrypted_api_key: encryptCredential(payload.apiKey),
          key_last_four: payload.apiKey.slice(-4),
          enabled: true,
          updated_by: actor.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "family_id,provider" },
      );
      if (error) throw error;
    }

    if (payload.selections?.length) {
      const { error } = await admin.from("sisters_ai_model_assignments").upsert(
        payload.selections.map((selection) => ({
          family_id: null,
          capability: selection.capability,
          primary_provider: selection.primaryProvider,
          primary_model: selection.primaryModel,
          fallback_provider: selection.fallbackProvider ?? null,
          fallback_model: selection.fallbackModel ?? null,
          updated_by: actor.id,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "family_id,capability" },
      );
      if (error) throw error;
    }

    return Response.json({ ok: true, persisted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "설정을 저장하지 못했습니다.";
    return Response.json({ error: message }, { status: message.includes("권한") ? 403 : 400 });
  }
}
