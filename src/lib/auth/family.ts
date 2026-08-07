import "server-only";

import { getParentActor, type Actor } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const demoFamilyId = "family-demo";

export interface ParentFamilyContext {
  actor: Actor;
  familyId: string;
}

export type ParentFamilyResolution =
  | { ok: true; context: ParentFamilyContext }
  | { ok: false; status: 401 | 403 | 503; error: string };

/**
 * Resolves the caller's family from their session — never from request input.
 *
 * Accepting a client-supplied `familyId` is unsafe here because the downstream
 * consumers (AI provider keys, model assignments, push subscriptions, data
 * requests) query through the service-role client, which bypasses RLS. The
 * session is the only trustworthy source for this value.
 */
export async function resolveParentFamily(): Promise<ParentFamilyResolution> {
  const actor = await getParentActor();
  if (!actor) return { ok: false, status: 401, error: "부모 로그인이 필요합니다." };

  if (isDemoMode) return { ok: true, context: { actor, familyId: demoFamilyId } };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, status: 503, error: "Supabase 설정이 필요합니다." };

  const { data: membership } = await admin
    .from("sisters_family_members")
    .select("family_id")
    .eq("user_id", actor.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.family_id) {
    return { ok: false, status: 403, error: "연결된 가족 공간이 없습니다. 먼저 가족 설정을 완료해 주세요." };
  }

  return { ok: true, context: { actor, familyId: membership.family_id } };
}
