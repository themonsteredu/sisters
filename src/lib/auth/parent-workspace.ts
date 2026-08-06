import "server-only";

import { redirect } from "next/navigation";
import { getParentActor } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ParentWorkspaceData {
  profile: {
    displayName: string;
    email: string | null;
  };
  family: {
    id: string;
    name: string;
  } | null;
  students: Array<{
    id: string;
    name: string;
    grade: number;
  }>;
  todayTasks: Array<{
    id: string;
    title: string;
    status: string;
    studentId: string;
    estimatedMinutes: number;
  }>;
  pendingSubmissions: Array<{
    id: string;
    studentId: string;
    submittedAt: string;
  }>;
  tests: Array<{
    id: string;
    title: string;
    status: string;
    studentId: string;
    scheduledDate: string;
    passScore: number;
  }>;
  counts: {
    courses: number;
    workbooks: number;
    plans: number;
    allTasks: number;
    approvedTasks: number;
  };
}

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function requireParentWorkspace(): Promise<ParentWorkspaceData> {
  const actor = await getParentActor();
  if (!actor) redirect("/login");
  if (actor.role === "admin") redirect("/admin/ai");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=Supabase%20설정이%20필요합니다");

  const [{ data: authData }, { data: profile }, { data: membership }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("sisters_profiles")
      .select("display_name,email")
      .eq("id", actor.id)
      .maybeSingle(),
    supabase
      .from("sisters_family_members")
      .select("family_id")
      .eq("user_id", actor.id)
      .limit(1)
      .maybeSingle(),
  ]);

  const displayName = profile?.display_name?.trim()
    || authData.user?.email?.split("@")[0]
    || "부모님";
  const email = profile?.email ?? authData.user?.email ?? null;

  if (!membership?.family_id) {
    return {
      profile: { displayName, email },
      family: null,
      students: [],
      todayTasks: [],
      pendingSubmissions: [],
      tests: [],
      counts: { courses: 0, workbooks: 0, plans: 0, allTasks: 0, approvedTasks: 0 },
    };
  }

  const familyId = membership.family_id;
  const today = seoulDate();
  const [
    familyResult,
    studentsResult,
    tasksResult,
    submissionsResult,
    testsResult,
    coursesResult,
    workbooksResult,
    plansResult,
    allTasksResult,
    approvedTasksResult,
  ] = await Promise.all([
    supabase.from("sisters_families").select("id,name").eq("id", familyId).maybeSingle(),
    supabase
      .from("sisters_students")
      .select("id,name,grade")
      .eq("family_id", familyId)
      .eq("active", true)
      .order("created_at"),
    supabase
      .from("sisters_tasks")
      .select("id,title,status,student_id,estimated_minutes")
      .eq("family_id", familyId)
      .eq("scheduled_date", today)
      .order("due_time", { nullsFirst: false }),
    supabase
      .from("sisters_submissions")
      .select("id,student_id,submitted_at")
      .eq("family_id", familyId)
      .is("parent_decision", null)
      .order("submitted_at", { ascending: false })
      .limit(10),
    supabase
      .from("sisters_tests")
      .select("id,title,status,student_id,scheduled_date,pass_score")
      .eq("family_id", familyId)
      .order("scheduled_date", { ascending: false })
      .limit(10),
    supabase.from("sisters_courses").select("id", { count: "exact", head: true }).eq("family_id", familyId),
    supabase.from("sisters_workbooks").select("id", { count: "exact", head: true }).eq("family_id", familyId),
    supabase.from("sisters_plans").select("id", { count: "exact", head: true }).eq("family_id", familyId),
    supabase.from("sisters_tasks").select("id", { count: "exact", head: true }).eq("family_id", familyId),
    supabase
      .from("sisters_tasks")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("status", "approved"),
  ]);

  const family = familyResult.data
    ? { id: familyResult.data.id, name: familyResult.data.name }
    : null;

  return {
    profile: { displayName, email },
    family,
    students: (studentsResult.data ?? []).map((student) => ({
      id: student.id,
      name: student.name,
      grade: student.grade,
    })),
    todayTasks: (tasksResult.data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      studentId: task.student_id,
      estimatedMinutes: task.estimated_minutes,
    })),
    pendingSubmissions: (submissionsResult.data ?? []).map((submission) => ({
      id: submission.id,
      studentId: submission.student_id,
      submittedAt: submission.submitted_at,
    })),
    tests: (testsResult.data ?? []).map((test) => ({
      id: test.id,
      title: test.title,
      status: test.status,
      studentId: test.student_id,
      scheduledDate: test.scheduled_date,
      passScore: test.pass_score,
    })),
    counts: {
      courses: coursesResult.count ?? 0,
      workbooks: workbooksResult.count ?? 0,
      plans: plansResult.count ?? 0,
      allTasks: allTasksResult.count ?? 0,
      approvedTasks: approvedTasksResult.count ?? 0,
    },
  };
}
