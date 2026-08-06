import "server-only";

import { adminPinHashMetadataKey } from "@/lib/auth/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function getAdminPinOwner() {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase 서버 설정이 필요합니다.");

  const { data: profile, error } = await admin
    .from("sisters_profiles")
    .select("id,display_name,created_at")
    .eq("role", "admin")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  const { data, error: authError } = await admin.auth.admin.getUserById(profile.id);
  if (authError) throw authError;
  const pinHash = data.user?.app_metadata?.[adminPinHashMetadataKey];
  return {
    id: profile.id,
    displayName: profile.display_name,
    pinHash: typeof pinHash === "string" ? pinHash : null,
  };
}

export async function canConfigureAdminPin(userId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return { allowed: false as const, reason: "Supabase 서버 설정이 필요합니다.", configured: false };

  const owner = await getAdminPinOwner();
  if (owner) {
    return owner.id === userId
      ? { allowed: true as const, reason: "", configured: Boolean(owner.pinHash) }
      : { allowed: false as const, reason: "현재 지정된 관리자만 PIN을 변경할 수 있습니다.", configured: Boolean(owner.pinHash) };
  }

  const { data: firstProfile, error } = await admin
    .from("sisters_profiles")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return firstProfile?.id === userId
    ? { allowed: true as const, reason: "", configured: false }
    : { allowed: false as const, reason: "최초 가입한 부모 계정만 첫 관리자 PIN을 지정할 수 있습니다.", configured: false };
}
