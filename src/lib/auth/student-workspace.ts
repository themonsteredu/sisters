import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { studentSessionCookie, verifyActiveStudentSession } from "@/lib/auth/student-session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface StudentWorkspaceData {
  student: { id: string; name: string; grade: number };
  tasks: Array<{ id: string; title: string; detail: string; status: string; estimatedMinutes: number }>;
  tests: Array<{ id: string; title: string; scheduledDate: string; status: string; passScore: number }>;
  approvedTaskCount: number;
  allTaskCount: number;
}

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function requireStudentWorkspace(): Promise<StudentWorkspaceData> {
  const cookieStore = await cookies();
  const token = cookieStore.get(studentSessionCookie.name)?.value;
  if (!token) redirect("/login");

  let session: Awaited<ReturnType<typeof verifyActiveStudentSession>>;
  try {
    session = await verifyActiveStudentSession(token);
  } catch {
    redirect("/login?error=학생%20로그인이%20만료되었습니다");
  }

  const admin = createSupabaseAdminClient();
  if (!admin) redirect("/login?error=학생%20로그인%20설정이%20필요합니다");

  const [studentResult, tasksResult, testsResult, allTasksResult, approvedTasksResult] = await Promise.all([
    admin
      .from("sisters_students")
      .select("id,name,grade")
      .eq("id", session.studentId)
      .eq("family_id", session.familyId)
      .eq("active", true)
      .maybeSingle(),
    admin
      .from("sisters_tasks")
      .select("id,title,detail,status,estimated_minutes")
      .eq("family_id", session.familyId)
      .eq("student_id", session.studentId)
      .eq("scheduled_date", seoulDate())
      .order("due_time", { nullsFirst: false }),
    admin
      .from("sisters_tests")
      .select("id,title,scheduled_date,status,pass_score")
      .eq("family_id", session.familyId)
      .eq("student_id", session.studentId)
      .in("status", ["published", "retest"])
      .order("scheduled_date")
      .limit(10),
    admin
      .from("sisters_tasks")
      .select("id", { count: "exact", head: true })
      .eq("family_id", session.familyId)
      .eq("student_id", session.studentId),
    admin
      .from("sisters_tasks")
      .select("id", { count: "exact", head: true })
      .eq("family_id", session.familyId)
      .eq("student_id", session.studentId)
      .eq("status", "approved"),
  ]);

  if (!studentResult.data) redirect("/login?error=학생%20계정을%20찾을%20수%20없습니다");

  return {
    student: studentResult.data,
    tasks: (tasksResult.data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      detail: task.detail,
      status: task.status,
      estimatedMinutes: task.estimated_minutes,
    })),
    tests: (testsResult.data ?? []).map((test) => ({
      id: test.id,
      title: test.title,
      scheduledDate: test.scheduled_date,
      status: test.status,
      passScore: test.pass_score,
    })),
    approvedTaskCount: approvedTasksResult.count ?? 0,
    allTaskCount: allTasksResult.count ?? 0,
  };
}
