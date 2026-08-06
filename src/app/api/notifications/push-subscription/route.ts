import { z } from "zod";
import { getParentActor } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  familyId: z.string().min(1),
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getParentActor();
    if (!actor) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const body = bodySchema.parse(await request.json());
    if (isDemoMode) return Response.json({ subscribed: true, demo: true });
    z.string().uuid().parse(body.familyId);

    const supabase = createSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase 설정이 필요합니다.");
    const { data: membership } = await supabase.from("sisters_family_members").select("family_id")
      .eq("family_id", body.familyId).eq("user_id", actor.id).maybeSingle();
    if (!membership) return Response.json({ error: "이 가족에 대한 권한이 없습니다." }, { status: 403 });

    const { error } = await supabase.from("sisters_web_push_subscriptions").upsert({
      family_id: body.familyId,
      user_id: actor.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: request.headers.get("user-agent"),
    }, { onConflict: "endpoint" });
    if (error) throw error;
    return Response.json({ subscribed: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "푸시 구독을 저장하지 못했습니다." }, { status: 400 });
  }
}
