import { hash } from "bcryptjs";
import { z } from "zod";
import { getParentActor } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const bodySchema = z.object({ pin: z.string().regex(/^\d{6}$/) });

export async function PUT(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await getParentActor();
    if (!actor) return Response.json({ error: "부모 로그인이 필요합니다." }, { status: 401 });
    const { studentId } = await params;
    const { pin } = bodySchema.parse(await request.json());
    if (isDemoMode) return Response.json({ reset: true, sessionsRevoked: true, demo: true });
    z.string().uuid().parse(studentId);

    const admin = createSupabaseAdminClient();
    if (!admin) throw new Error("Supabase 설정이 필요합니다.");
    const { data: student } = await admin.from("sisters_students").select("id, family_id").eq("id", studentId).single();
    if (!student) return Response.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
    const { data: membership } = await admin.from("sisters_family_members").select("family_id")
      .eq("family_id", student.family_id).eq("user_id", actor.id).maybeSingle();
    if (!membership) return Response.json({ error: "이 학생에 대한 권한이 없습니다." }, { status: 403 });

    const pinHash = await hash(pin, 12);
    const { error } = await admin.from("sisters_student_credentials").upsert({
      student_id: student.id,
      family_id: student.family_id,
      pin_hash: pinHash,
      failed_attempts: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "student_id" });
    if (error) throw error;
    await Promise.all([
      admin.from("sisters_student_sessions").update({ revoked_at: new Date().toISOString() }).eq("student_id", student.id).is("revoked_at", null),
      admin.from("sisters_audit_logs").insert({ family_id: student.family_id, actor_user_id: actor.id, action: "student_pin_reset", entity_type: "student", entity_id: student.id }),
    ]);
    return Response.json({ reset: true, sessionsRevoked: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "PIN을 초기화하지 못했습니다." }, { status: 400 });
  }
}
