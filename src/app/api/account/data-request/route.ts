import { z } from "zod";
import { getParentActor } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  familyId: z.string().min(1),
  requestType: z.enum(["export", "delete", "withdraw_consent"]),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getParentActor();
    if (!actor) return Response.json({ error: "부모 로그인이 필요합니다." }, { status: 401 });
    const body = bodySchema.parse(await request.json());
    if (isDemoMode) return Response.json({ id: crypto.randomUUID(), status: "requested", demo: true });
    z.string().uuid().parse(body.familyId);

    const supabase = createSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase 설정이 필요합니다.");
    const { data: membership } = await supabase
      .from("sisters_family_members")
      .select("family_id")
      .eq("family_id", body.familyId)
      .eq("user_id", actor.id)
      .maybeSingle();
    if (!membership) return Response.json({ error: "이 가족에 대한 권한이 없습니다." }, { status: 403 });

    const { data, error } = await supabase
      .from("sisters_data_requests")
      .insert({ family_id: body.familyId, requested_by: actor.id, request_type: body.requestType })
      .select("id, status, created_at")
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "요청을 접수하지 못했습니다." }, { status: 400 });
  }
}
