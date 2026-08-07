import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getParentSession } from "@/lib/auth/guard";
import { demoFamilyId } from "@/lib/auth/family";
import { studentSessionCookie, verifyActiveStudentSession } from "@/lib/auth/student-session";
import { isDemoMode } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

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
  | { ok: false; reason: "unauthenticated" | "no-family" | "unconfigured" | "suspended"; message: string };

export async function getParentContext(): Promise<ContextResult<ParentContext>> {
  const session = await getParentSession();
  if (!session) {
    return { ok: false, reason: "unauthenticated", message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
  }
  if (!session.familyId) {
    return { ok: false, reason: "no-family", message: "가족 공간을 먼저 만들어 주세요." };
  }
  // sisters_families.suspended was stored but never checked anywhere.
  if (session.familySuspended) {
    return { ok: false, reason: "suspended", message: "이용이 일시 중지된 가족 공간입니다. 운영자에게 문의해 주세요." };
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

/**
 * Students do not authenticate through Supabase Auth — they hold a signed
 * cookie — so `auth.uid()` is null for them and RLS can grant them nothing.
 * Their access therefore runs on the service-role client, which means the
 * explicit family_id AND student_id filters in every query are the security
 * boundary, not a second line of defence.
 */
export interface StudentContext {
  kind: "student";
  familyId: string;
  studentId: string;
  supabase: SupabaseClient;
}

export async function getStudentContext(): Promise<ContextResult<StudentContext>> {
  const cookieStore = await cookies();
  const token = cookieStore.get(studentSessionCookie.name)?.value;
  if (!token) {
    return { ok: false, reason: "unauthenticated", message: "학생 로그인이 필요합니다." };
  }

  let session: { studentId: string; familyId: string };
  try {
    session = await verifyActiveStudentSession(token);
  } catch {
    return { ok: false, reason: "unauthenticated", message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, reason: "unconfigured", message: "저장소를 연결하지 않았습니다." };
  }

  return {
    ok: true,
    context: {
      kind: "student",
      familyId: session.familyId,
      studentId: session.studentId,
      supabase,
    },
  };
}

/** True when the caller should be served fixtures instead of real rows. */
export function isDemoContext() {
  return isDemoMode;
}

export { demoFamilyId };
