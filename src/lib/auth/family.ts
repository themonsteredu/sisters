import "server-only";

import { getParentActor, getParentSession, type Actor } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";

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
  if (isDemoMode) {
    const actor = await getParentActor();
    if (!actor) return { ok: false, status: 401, error: "부모 로그인이 필요합니다." };
    return { ok: true, context: { actor, familyId: demoFamilyId } };
  }

  // Shares the request-cached session, so this adds no round-trip of its own.
  const session = await getParentSession();
  if (!session) return { ok: false, status: 401, error: "부모 로그인이 필요합니다." };

  if (!session.familyId) {
    return { ok: false, status: 403, error: "연결된 가족 공간이 없습니다. 먼저 가족 설정을 완료해 주세요." };
  }

  return { ok: true, context: { actor: session.actor, familyId: session.familyId } };
}
