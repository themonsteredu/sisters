import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { adminSessionCookie, verifyActiveAdminSession } from "@/lib/auth/admin-session";

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
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookie.name)?.value;
  if (!token) throw new Error("관리자 PIN 로그인이 필요합니다.");
  const session = await verifyActiveAdminSession(token);
  return { id: session.userId, role: "admin" };
}
