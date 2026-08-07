import "server-only";

import { demoStudents, demoTasks } from "@/lib/demo-data";
import type { TaskStatus } from "@/lib/domain/types";
import { logError } from "@/lib/observability/log";
import { getParentContext, isDemoContext } from "./context";

export interface DashboardTask {
  id: string;
  studentId: string;
  subject: string;
  title: string;
  detail: string;
  estimatedMinutes: number;
  status: TaskStatus;
  dueTime: string | null;
}

export interface DashboardStudent {
  id: string;
  name: string;
  grade: number;
  todayTotal: number;
  todayDone: number;
}

export interface DashboardData {
  demo: boolean;
  hasFamily: boolean;
  today: string;
  students: DashboardStudent[];
  tasks: DashboardTask[];
  pendingReviews: number;
  approvedTasks: number;
  allTasks: number;
}

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

const doneStatuses: TaskStatus[] = ["approved", "submitted", "parent_review"];

function demoDashboard(): DashboardData {
  const tasks = demoTasks.map((task) => ({
    id: task.id,
    studentId: task.studentId,
    subject: task.subject,
    title: task.title,
    detail: task.detail,
    estimatedMinutes: task.estimatedMinutes,
    status: task.status,
    dueTime: task.dueTime ?? null,
  }));
  return {
    demo: true,
    hasFamily: true,
    today: seoulDate(),
    students: demoStudents.map((student) => {
      const own = tasks.filter((task) => task.studentId === student.id);
      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        todayTotal: own.length,
        todayDone: own.filter((task) => doneStatuses.includes(task.status)).length,
      };
    }),
    tasks,
    pendingReviews: 2,
    approvedTasks: tasks.filter((task) => task.status === "approved").length,
    allTasks: tasks.length,
  };
}

export async function loadDashboard(): Promise<DashboardData> {
  if (isDemoContext()) return demoDashboard();

  const result = await getParentContext();
  if (!result.ok) {
    return { demo: false, hasFamily: false, today: seoulDate(), students: [], tasks: [], pendingReviews: 0, approvedTasks: 0, allTasks: 0 };
  }

  const { supabase, familyId } = result.context;
  const today = seoulDate();

  const [students, tasks, pending, approved, all] = await Promise.all([
    supabase.from("sisters_students").select("id,name,grade").eq("family_id", familyId).eq("active", true).order("created_at"),
    supabase
      .from("sisters_tasks")
      .select("id,student_id,title,detail,status,estimated_minutes,due_time,sisters_subjects(name)")
      .eq("family_id", familyId)
      .eq("scheduled_date", today)
      .order("due_time", { nullsFirst: false })
      .limit(200),
    supabase.from("sisters_submissions").select("id", { count: "exact", head: true }).eq("family_id", familyId).is("parent_decision", null),
    supabase.from("sisters_tasks").select("id", { count: "exact", head: true }).eq("family_id", familyId).eq("status", "approved"),
    supabase.from("sisters_tasks").select("id", { count: "exact", head: true }).eq("family_id", familyId),
  ]);

  if (tasks.error) logError("data/dashboard.loadDashboard", tasks.error, { familyId });

  const subjectOf = (row: { sisters_subjects?: unknown }) => {
    const embed = row.sisters_subjects as { name?: string } | { name?: string }[] | null | undefined;
    if (Array.isArray(embed)) return embed[0]?.name ?? "기타";
    return embed?.name ?? "기타";
  };

  const taskRows: DashboardTask[] = (tasks.data ?? []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    subject: subjectOf(row),
    title: row.title,
    detail: row.detail,
    estimatedMinutes: row.estimated_minutes,
    status: row.status as TaskStatus,
    dueTime: row.due_time ? String(row.due_time).slice(0, 5) : null,
  }));

  return {
    demo: false,
    hasFamily: true,
    today,
    students: (students.data ?? []).map((student) => {
      const own = taskRows.filter((task) => task.studentId === student.id);
      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        todayTotal: own.length,
        todayDone: own.filter((task) => doneStatuses.includes(task.status)).length,
      };
    }),
    tasks: taskRows,
    pendingReviews: pending.count ?? 0,
    approvedTasks: approved.count ?? 0,
    allTasks: all.count ?? 0,
  };
}
