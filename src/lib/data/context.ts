import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getParentSession } from "@/lib/auth/guard";
import { demoFamilyId } from "@/lib/auth/family";
import { isDemoMode } from "@/lib/config";

/**
 * The unit of trust for every function in `src/lib/data/*`.
 *
 * `familyId` is produced here and nowhere else. No data-layer function accepts
 * it as an argument, so a request body can never influence which family's rows
 * are read or written.
 */
export interface ParentContext {
  kind: "parent";
  familyId: string;
  userId: string;
  supabase: SupabaseClient;
}

export type ContextResult<T> =
  | { ok: true; context: T }
  | { ok: false; reason: "unauthenticated" | "no-family" | "unconfigured"; message: string };

export async function getParentContext(): Promise<ContextResult<ParentContext>> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, reason: "unauthenticated", message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
  }
  if (!session.familyId) {
    return { ok: false, reason: "no-family", message: "가족 공간을 먼저 만들어 주세요." };
  }
  return {
    ok: true,
    context: {
      kind: "parent",
      familyId: session.familyId,
      userId: session.actor.id,
      // The RLS client. Family policies are a second line of defence behind the
      // explicit .eq("family_id", ...) that every data-layer query carries.
      supabase: session.supabase as SupabaseClient,
    },
  };
}

/** True when the caller should be served fixtures instead of real rows. */
export function isDemoContext() {
  return isDemoMode;
}

export { demoFamilyId };
