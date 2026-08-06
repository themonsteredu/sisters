import { z } from "zod";
import { getParentActor } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { verifyGuardianIdentity } from "@/lib/consent/portone";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const consentType = z.enum(["child_privacy", "ai_processing", "overseas_transfer", "notifications"]);
const bodySchema = z.object({
  studentId: z.string().min(1),
  identityVerificationId: z.string().min(8).max(200),
  consentTypes: z.array(consentType).min(1),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await getParentActor();
    if (!actor) return Response.json({ error: "부모 로그인이 필요합니다." }, { status: 401 });
    const body = bodySchema.parse(await request.json());

    if (isDemoMode) {
      return Response.json({ verified: true, guardianName: "정윤 부모님", recorded: body.consentTypes });
    }
    z.string().uuid().parse(body.studentId);

    const supabase = createSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase 설정이 필요합니다.");
    const { data: student } = await supabase
      .from("sisters_students")
      .select("id, family_id")
      .eq("id", body.studentId)
      .single();
    if (!student) return Response.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });

    const { data: membership } = await supabase
      .from("sisters_family_members")
      .select("family_id")
      .eq("family_id", student.family_id)
      .eq("user_id", actor.id)
      .maybeSingle();
    if (!membership) return Response.json({ error: "이 가족에 대한 권한이 없습니다." }, { status: 403 });

    const guardian = await verifyGuardianIdentity(body.identityVerificationId);
    const rows = body.consentTypes.map((type) => ({
      family_id: student.family_id,
      student_id: student.id,
      guardian_user_id: actor.id,
      consent_type: type,
      verified_by: "portone_v2",
      verification_reference: guardian.reference,
    }));
    const { error } = await supabase.from("sisters_consents").insert(rows);
    if (error) throw error;
    await supabase.from("sisters_audit_logs").insert({
      family_id: student.family_id,
      actor_user_id: actor.id,
      action: "guardian_consent_recorded",
      entity_type: "student",
      entity_id: student.id,
      metadata: { consentTypes: body.consentTypes, provider: "portone_v2" },
    });
    return Response.json({ verified: true, guardianName: guardian.name, recorded: body.consentTypes });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "동의를 저장하지 못했습니다." }, { status: 400 });
  }
}
