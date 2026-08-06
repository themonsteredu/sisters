"use server";

import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canConfigureAdminPin } from "@/lib/auth/admin-pin";
import {
  adminPinHashMetadataKey,
  adminSessionCookie,
  signAdminSession,
} from "@/lib/auth/admin-session";
import { getParentActor } from "@/lib/auth/guard";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface AdminPinState {
  ok: boolean;
  message: string;
}

const schema = z.object({
  pin: z.string().regex(/^\d{6}$/, "관리자 PIN은 숫자 6자리여야 합니다."),
  confirmation: z.string(),
}).refine((value) => value.pin === value.confirmation, {
  path: ["confirmation"],
  message: "PIN 확인 값이 일치하지 않습니다.",
});

export async function saveAdminPin(
  _previousState: AdminPinState,
  formData: FormData,
): Promise<AdminPinState> {
  const actor = await getParentActor();
  if (!actor) return { ok: false, message: "부모 로그인이 만료되었습니다. 다시 로그인해 주세요." };

  const parsed = schema.safeParse({
    pin: formData.get("pin"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "PIN을 확인해 주세요." };
  }

  const permission = await canConfigureAdminPin(actor.id);
  if (!permission.allowed) return { ok: false, message: permission.reason };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, message: "Supabase 서버 설정이 필요합니다." };
  const { data: authData, error: authReadError } = await admin.auth.admin.getUserById(actor.id);
  if (authReadError || !authData.user) {
    return { ok: false, message: authReadError?.message ?? "부모 계정을 확인하지 못했습니다." };
  }

  const pinHash = await hash(parsed.data.pin, 12);
  const updatedAt = new Date().toISOString();
  const { error: authUpdateError } = await admin.auth.admin.updateUserById(actor.id, {
    app_metadata: {
      ...authData.user.app_metadata,
      sisters_admin: true,
      [adminPinHashMetadataKey]: pinHash,
      sisters_admin_pin_updated_at: updatedAt,
    },
  });
  if (authUpdateError) return { ok: false, message: authUpdateError.message };

  const { error: profileError } = await admin
    .from("sisters_profiles")
    .update({ role: "admin" })
    .eq("id", actor.id);
  if (profileError) return { ok: false, message: profileError.message };

  await admin.from("sisters_audit_logs").insert({
    actor_user_id: actor.id,
    action: permission.configured ? "admin_pin_changed" : "admin_pin_created",
    entity_type: "admin_auth",
    entity_id: actor.id,
    metadata: { updatedAt },
  });

  const token = await signAdminSession(actor.id, pinHash);
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookie.name, token, adminSessionCookie.options);
  redirect("/admin/ai");
}
