import { z } from "zod";
import { resolveParentFamily } from "@/lib/auth/family";
import { isDemoMode } from "@/lib/config";
import { logError } from "@/lib/observability/log";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// `familyId` comes from the session, not the body — see resolveParentFamily.
const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: Request) {
  try {
    try {
      assertSameOrigin(request);
    } catch {
      return Response.json({ error: "허용되지 않은 요청 출처입니다." }, { status: 403 });
    }

    const resolution = await resolveParentFamily();
    if (!resolution.ok) return Response.json({ error: resolution.error }, { status: resolution.status });

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "요청 형식을 확인해 주세요." }, { status: 422 });

    if (isDemoMode) return Response.json({ subscribed: true, demo: true });

    const supabase = createSupabaseAdminClient();
    if (!supabase) return Response.json({ error: "Supabase 설정이 필요합니다." }, { status: 503 });

    const { error } = await supabase.from("sisters_web_push_subscriptions").upsert({
      family_id: resolution.context.familyId,
      user_id: resolution.context.actor.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: request.headers.get("user-agent"),
    }, { onConflict: "endpoint" });
    if (error) throw error;
    return Response.json({ subscribed: true });
  } catch (error) {
    logError("api/notifications/push-subscription", error);
    return Response.json({ error: "푸시 구독을 저장하지 못했습니다." }, { status: 500 });
  }
}
