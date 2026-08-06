import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { isDemoMode } from "@/lib/config";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { hashSessionToken, signStudentSession, studentSessionCookie } from "@/lib/auth/student-session";

const loginSchema = z.object({
  handle: z.string().trim().min(2).max(40),
  pin: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { handle, pin } = loginSchema.parse(await request.json());
    let studentId: string;
    let familyId: string;

    if (isDemoMode && ["minseo", "jiwoo"].includes(handle.toLowerCase()) && pin === "123456") {
      studentId = handle.toLowerCase() === "minseo" ? "student-minseo" : "student-jiwoo";
      familyId = "family-demo";
    } else {
      const admin = createSupabaseAdminClient();
      if (!admin) return Response.json({ error: "로그인 서비스를 연결하지 않았습니다." }, { status: 503 });

      const { data: student } = await admin
        .from("sisters_students")
        .select("id,family_id,sisters_student_credentials(pin_hash,failed_attempts,locked_until)")
        .eq("handle", handle.toLowerCase())
        .eq("active", true)
        .maybeSingle();
      const credential = Array.isArray(student?.sisters_student_credentials)
        ? student?.sisters_student_credentials[0]
        : student?.sisters_student_credentials;
      if (!student || !credential) return Response.json({ error: "아이디 또는 PIN이 올바르지 않습니다." }, { status: 401 });
      if (credential.locked_until && new Date(credential.locked_until) > new Date()) {
        return Response.json({ error: "로그인이 잠겼습니다. 부모에게 PIN 초기화를 요청하세요." }, { status: 423 });
      }

      const valid = await compare(pin, credential.pin_hash);
      if (!valid) {
        const attempts = credential.failed_attempts + 1;
        await admin
          .from("sisters_student_credentials")
          .update({
            failed_attempts: attempts >= 5 ? 0 : attempts,
            locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null,
          })
          .eq("student_id", student.id);
        return Response.json({ error: "아이디 또는 PIN이 올바르지 않습니다." }, { status: 401 });
      }
      await admin
        .from("sisters_student_credentials")
        .update({ failed_attempts: 0, locked_until: null })
        .eq("student_id", student.id);
      studentId = student.id;
      familyId = student.family_id;
    }

    const token = await signStudentSession({ studentId, familyId });
    const cookieStore = await cookies();
    cookieStore.set(studentSessionCookie.name, token, studentSessionCookie.options);

    const admin = createSupabaseAdminClient();
    if (admin && !isDemoMode) {
      await admin.from("sisters_student_sessions").insert({
        student_id: studentId,
        family_id: familyId,
        token_hash: hashSessionToken(token),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
      });
    }
    return Response.json({ ok: true, redirectTo: "/student" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "로그인에 실패했습니다." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  assertSameOrigin(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(studentSessionCookie.name)?.value;
  if (token && !isDemoMode) {
    const admin = createSupabaseAdminClient();
    if (admin) await admin.from("sisters_student_sessions").update({ revoked_at: new Date().toISOString() }).eq("token_hash", hashSessionToken(token));
  }
  cookieStore.delete(studentSessionCookie.name);
  return Response.json({ ok: true });
}
