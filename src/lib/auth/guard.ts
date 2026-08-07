import { cache } from "react";
import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { adminSessionCookie, verifyActiveAdminSession } from "@/lib/auth/admin-session";

export interface Actor {
  id: string;
  role: "admin" | "parent";
}

export interface ParentSession {
  actor: Actor;
  email: string | null;
  displayName: string | null;
  /** null when the account has completed sign-up but not family onboarding. */
  familyId: string | null;
  /** Operator-set hold; see sisters_families.suspended. */
  familySuspended: boolean;
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
}

/**
 * Resolves the signed-in parent, their profile and their family in two
 * round-trips, once per request.
 *
 * `auth.getUser()` is a network call to the Supabase auth server
 * (GET /auth/v1/user), not a local token decode. Loading a parent page used to
 * issue it twice, plus sisters_profiles twice, across four sequential waves.
 * React's `cache` dedupes this across the whole render, and the profile and
 * membership lookups — which only need the user id — are issued together.
 */
export const getParentSession = cache(async (): Promise<ParentSession | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from("sisters_profiles")
      .select("role, display_name, email")
      .eq("id", data.user.id)
      .maybeSingle(),
    supabase
      .from("sisters_family_members")
      .select("family_id, sisters_families(suspended)")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const familyEmbed = membership?.sisters_families as { suspended?: boolean } | { suspended?: boolean }[] | null | undefined;
  const familyRow = Array.isArray(familyEmbed) ? familyEmbed[0] : familyEmbed;

  return {
    actor: { id: data.user.id, role: profile?.role === "admin" ? "admin" : "parent" },
    email: profile?.email ?? data.user.email ?? null,
    displayName: profile?.display_name?.trim() || data.user.email?.split("@")[0] || null,
    familyId: membership?.family_id ?? null,
    familySuspended: Boolean(familyRow?.suspended),
    supabase,
  };
});

export async function getParentActor(): Promise<Actor | null> {
  if (isDemoMode) return { id: "demo-parent", role: "parent" };
  return (await getParentSession())?.actor ?? null;
}

export async function requireAdmin(): Promise<Actor> {
  if (isDemoMode) return { id: "demo-admin", role: "admin" };
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookie.name)?.value;
  if (!token) throw new Error("관리자 PIN 로그인이 필요합니다.");
  const session = await verifyActiveAdminSession(token);
  return { id: session.userId, role: "admin" };
}
