import "server-only";

import { demoMetrics, demoStudents } from "@/lib/demo-data";
import { logError } from "@/lib/observability/log";
import { getParentContext, isDemoContext } from "./context";

export interface StudentReport {
  studentId: string;
  name: string;
  /** Approved / all tasks. */
  completionRate: number;
  /** Approved on or before the scheduled date. */
  onTimeRate: number;
  rejectionRate: number;
  studyMinutes: number;
  averageScore: number | null;
  pendingReviews: number;
  totalTasks: number;
  weakSubjects: string[];
}

export interface ReportsData {
  demo: boolean;
  hasFamily: boolean;
  students: StudentReport[];
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function demoReports(): ReportsData {
  return {
    demo: true,
    hasFamily: true,
    students: demoStudents.map((student) => {
      const metrics = demoMetrics[student.id];
      return {
        studentId: student.id,
        name: student.name,
        completionRate: metrics?.completionRate ?? 0,
        onTimeRate: metrics?.onTimeRate ?? 0,
        rejectionRate: metrics?.rejectionRate ?? 0,
        studyMinutes: metrics?.studyMinutes ?? 0,
        averageScore: metrics?.averageScore ?? null,
        pendingReviews: metrics?.pendingReviews ?? 0,
        totalTasks: 0,
        weakSubjects: [],
      };
    }),
  };
}

/**
 * Per-child metrics. Replaces the single approved/total ratio the read-only
 * fallback showed, and finally fills the four README-promised figures
 * (on-time, study minutes, score, weak areas) that had no data source.
 */
export async function loadReports(): Promise<ReportsData> {
  if (isDemoContext()) return demoReports();

  const result = await getParentContext();
  if (!result.ok) return { demo: false, hasFamily: false, students: [] };

  const { supabase, familyId } = result.context;

  const [students, tasks, submissions, attempts] = await Promise.all([
    supabase.from("sisters_students").select("id,name").eq("family_id", familyId).eq("active", true).order("created_at"),
    supabase
      .from("sisters_tasks")
      .select("id,student_id,status,scheduled_date,estimated_minutes,sisters_subjects(name)")
      .eq("family_id", familyId)
      .limit(5_000),
    supabase
      .from("sisters_submissions")
      .select("id,student_id,parent_decision,elapsed_minutes,reviewed_at,task_id")
      .eq("family_id", familyId)
      .limit(5_000),
    supabase.from("sisters_attempts").select("student_id,score").eq("family_id", familyId).limit(5_000),
  ]);

  if (tasks.error) logError("data/reports.loadReports", tasks.error, { familyId });

  const taskRows = tasks.data ?? [];
  const submissionRows = submissions.data ?? [];
  const attemptRows = attempts.data ?? [];

  const subjectOf = (row: { sisters_subjects?: unknown }) => {
    const embed = row.sisters_subjects as { name?: string } | { name?: string }[] | null | undefined;
    if (Array.isArray(embed)) return embed[0]?.name ?? "기타";
    return embed?.name ?? "기타";
  };
  const taskById = new Map(taskRows.map((task) => [task.id, task]));

  return {
    demo: false,
    hasFamily: true,
    students: (students.data ?? []).map((student) => {
      const own = taskRows.filter((task) => task.student_id === student.id);
      const approved = own.filter((task) => task.status === "approved");
      const rejected = own.filter((task) => ["rejected", "remediation"].includes(task.status));
      const ownSubmissions = submissionRows.filter((s) => s.student_id === student.id);
      const ownAttempts = attemptRows.filter((a) => a.student_id === student.id);

      // On time = approved and reviewed no later than the scheduled date.
      const onTime = ownSubmissions.filter((submission) => {
        if (submission.parent_decision !== "approved" || !submission.reviewed_at) return false;
        const task = taskById.get(submission.task_id);
        return task ? submission.reviewed_at.slice(0, 10) <= task.scheduled_date : false;
      });

      // Weak subjects: those with a below-average approval rate for this child.
      const bySubject = new Map<string, { total: number; approved: number }>();
      for (const task of own) {
        const name = subjectOf(task);
        const entry = bySubject.get(name) ?? { total: 0, approved: 0 };
        entry.total += 1;
        if (task.status === "approved") entry.approved += 1;
        bySubject.set(name, entry);
      }
      const overall = percent(approved.length, own.length);
      const weakSubjects = [...bySubject.entries()]
        .filter(([, entry]) => entry.total >= 3 && percent(entry.approved, entry.total) < overall)
        .sort((a, b) => percent(a[1].approved, a[1].total) - percent(b[1].approved, b[1].total))
        .slice(0, 3)
        .map(([name]) => name);

      return {
        studentId: student.id,
        name: student.name,
        completionRate: overall,
        onTimeRate: percent(onTime.length, approved.length),
        rejectionRate: percent(rejected.length, own.length),
        studyMinutes: ownSubmissions.reduce((sum, s) => sum + (s.elapsed_minutes ?? 0), 0),
        averageScore: ownAttempts.length
          ? Math.round(ownAttempts.reduce((sum, a) => sum + a.score, 0) / ownAttempts.length)
          : null,
        pendingReviews: ownSubmissions.filter((s) => !s.parent_decision).length,
        totalTasks: own.length,
        weakSubjects,
      };
    }),
  };
}
