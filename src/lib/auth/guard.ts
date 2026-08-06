import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Actor {
  id: string;
  role: "admin" | "parent";
}

export async function getParentActor(): Promise<Actor | null> {
  if (isDemoMode) return { id: "demo-parent", role: "parent" };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("sisters_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  return { id: data.user.id, role: profile?.role === "admin" ? "admin" : "parent" };
}

export async function requireAdmin(): Promise<Actor> {
  if (isDemoMode) return { id: "demo-admin", role: "admin" };
  const actor = await getParentActor();
  if (!actor || actor.role !== "admin") throw new Error("관리자 권한이 필요합니다.");
  return actor;
}
