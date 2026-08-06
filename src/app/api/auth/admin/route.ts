import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  adminSessionCookie,
  hashAdminLoginClient,
  signAdminSession,
} from "@/lib/auth/admin-session";
import { getAdminPinOwner } from "@/lib/auth/admin-pin";
import { isDemoMode } from "@/lib/config";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const loginSchema = z.object({ pin: z.string().regex(/^\d{6}$/) });
const maxFailures = 5;
const failureWindowMs = 15 * 60_000;

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return hashAdminLoginClient(forwarded || "unknown-client");
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { pin } = loginSchema.parse(await request.json());

    if (isDemoMode && pin === "123456") {
      const token = await signAdminSession("demo-admin", "$2b$demo-admin-pin");
      const cookieStore = await cookies();
      cookieStore.set(adminSessionCookie.name, token, adminSessionCookie.options);
      return Response.json({ ok: true, redirectTo: "/admin/ai" });
    }

    const admin = createSupabaseAdminClient();
    if (!admin) return Response.json({ error: "관리자 로그인 서비스를 연결하지 않았습니다." }, { status: 503 });
    const owner = await getAdminPinOwner();
    if (!owner?.pinHash) {
      return Response.json({ error: "관리자 PIN이 아직 없습니다. 부모로 로그인한 뒤 설정에서 먼저 만들어 주세요." }, { status: 409 });
    }

    const loginClient = clientKey(request);
    const since = new Date(Date.now() - failureWindowMs).toISOString();
    const { count } = await admin
      .from("sisters_audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "admin_pin_login_failed")
      .gte("created_at", since)
      .contains("metadata", { loginClient });
    if ((count ?? 0) >= maxFailures) {
      return Response.json({ error: "PIN 입력이 잠겼습니다. 15분 뒤 다시 시도해 주세요." }, { status: 429 });
    }

    const valid = await compare(pin, owner.pinHash);
    if (!valid) {
      await admin.from("sisters_audit_logs").insert({
        actor_user_id: null,
        action: "admin_pin_login_failed",
        entity_type: "admin_auth",
        metadata: { loginClient },
      });
      return Response.json({ error: "관리자 PIN이 올바르지 않습니다." }, { status: 401 });
    }

    const token = await signAdminSession(owner.id, owner.pinHash);
    const cookieStore = await cookies();
    cookieStore.set(adminSessionCookie.name, token, adminSessionCookie.options);
    await admin.from("sisters_audit_logs").insert({
      actor_user_id: owner.id,
      action: "admin_pin_login_succeeded",
      entity_type: "admin_auth",
      entity_id: owner.id,
      metadata: { loginClient },
    });
    return Response.json({ ok: true, redirectTo: "/admin/ai" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "관리자 로그인에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  assertSameOrigin(request);
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookie.name);
  return Response.json({ ok: true });
}
