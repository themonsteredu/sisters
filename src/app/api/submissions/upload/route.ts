import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { isDemoMode } from "@/lib/config";
import { studentSessionCookie, verifyActiveStudentSession } from "@/lib/auth/student-session";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/mpeg"]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const data = await request.formData();
    const file = data.get("file");
    const taskId = data.get("taskId");
    if (!(file instanceof File) || typeof taskId !== "string") throw new Error("파일과 할 일이 필요합니다.");
    if (!allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024) throw new Error("지원하지 않는 파일이거나 10MB를 초과했습니다.");

    if (isDemoMode) return Response.json({ ok: true, path: `demo/${taskId}/${file.name}`, demo: true });
    const cookieStore = await cookies();
    const token = cookieStore.get(studentSessionCookie.name)?.value;
    if (!token) return Response.json({ error: "학생 로그인이 필요합니다." }, { status: 401 });
    const session = await verifyActiveStudentSession(token);
    const admin = createSupabaseAdminClient();
    if (!admin) return Response.json({ error: "저장소를 연결하지 않았습니다." }, { status: 503 });
    const { data: task } = await admin.from("sisters_tasks").select("id").eq("id", taskId).eq("student_id", session.studentId).eq("family_id", session.familyId).maybeSingle();
    if (!task) return Response.json({ error: "접근할 수 없는 할 일입니다." }, { status: 403 });
    const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
    const path = `${session.familyId}/${session.studentId}/${taskId}/${randomUUID()}.${extension}`;
    const { error } = await admin.storage.from("sisters-submissions").upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: "3600", upsert: false });
    if (error) throw error;
    return Response.json({ ok: true, path });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "업로드에 실패했습니다." }, { status: 400 });
  }
}
