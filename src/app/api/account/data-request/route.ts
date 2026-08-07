import { z } from "zod";
import { resolveParentFamily } from "@/lib/auth/family";
import { isDemoMode } from "@/lib/config";
import { logError } from "@/lib/observability/log";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// `familyId` comes from the session, not the body — see resolveParentFamily.
const bodySchema = z.object({
  requestType: z.enum(["export", "delete", "withdraw_consent"]),
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

    if (isDemoMode) return Response.json({ id: crypto.randomUUID(), status: "requested", demo: true });

    const supabase = createSupabaseAdminClient();
    if (!supabase) return Response.json({ error: "Supabase 설정이 필요합니다." }, { status: 503 });

    const { data, error } = await supabase
      .from("sisters_data_requests")
      .insert({
        family_id: resolution.context.familyId,
        requested_by: resolution.context.actor.id,
        request_type: parsed.data.requestType,
      })
      .select("id, status, created_at")
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (error) {
    logError("api/account/data-request", error);
    return Response.json({ error: "요청을 접수하지 못했습니다." }, { status: 500 });
  }
}
