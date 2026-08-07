import "server-only";

import { demoStudents, demoTasks, demoTests } from "@/lib/demo-data";
import type { EvidenceKind, TaskStatus, TaskType } from "@/lib/domain/types";
import { logError } from "@/lib/observability/log";
import { getStudentContext, isDemoContext } from "./context";

export interface StudentTask {
  id: string;
  subject: string;
  type: TaskType;
  title: string;
  detail: string;
  dueTime: string | null;
  estimatedMinutes: number;
  status: TaskStatus;
  evidence: EvidenceKind[];
}

export interface StudentUpcomingTest {
  id: string;
  title: string;
  questionCount: number;
  timeLimitMinutes: number;
  passScore: number;
}

export interface StudentHomeData {
  demo: boolean;
  signedIn: boolean;
  student: { id: string; name: string; avatar: string; streak: number } | null;
  tasks: StudentTask[];
  nextTest: StudentUpcomingTest | null;
  weeklyGoalMinutes: number;
  weeklyStudiedMinutes: number;
}

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

function demoData(): StudentHomeData {
  const student = demoStudents[0];
  const test = demoTests.find((item) => item.studentId === student.id && item.status === "published");
  return {
    demo: true,
    signedIn: true,
    student: { id: student.id, name: student.name, avatar: student.avatar, streak: student.streak },
    tasks: demoTasks
      .filter((task) => task.studentId === student.id)
      .map((task) => ({
        id: task.id,
        subject: task.subject,
        type: task.type,
        title: task.title,
        detail: task.detail,
        dueTime: task.dueTime ?? null,
        estimatedMinutes: task.estimatedMinutes,
        status: task.status,
        evidence: task.evidence,
      })),
    nextTest: test
      ? { id: test.id, title: test.title, questionCount: test.questions.length, timeLimitMinutes: test.timeLimitMinutes, passScore: test.passScore }
      : null,
    weeklyGoalMinutes: student.weeklyGoalMinutes,
    weeklyStudiedMinutes: 0,
  };
}

export async function loadStudentHome(): Promise<StudentHomeData> {
  if (isDemoContext()) return demoData();

  const result = await getStudentContext();
  if (!result.ok) {
    return { demo: false, signedIn: false, student: null, tasks: [], nextTest: null, weeklyGoalMinutes: 0, weeklyStudiedMinutes: 0 };
  }

  const { supabase, familyId, studentId } = result.context;
  const today = seoulDate();

  const [student, tasks, tests] = await Promise.all([
    supabase
      .from("sisters_students")
      .select("id,name,avatar,weekly_goal_minutes")
      .eq("id", studentId)
      .eq("family_id", familyId)
      .maybeSingle(),
    supabase
      .from("sisters_tasks")
      .select("id,task_type,title,detail,due_time,estimated_minutes,status,evidence_requirements,sisters_subjects(name)")
      .eq("family_id", familyId)
      .eq("student_id", studentId)
      .eq("scheduled_date", today)
      .order("due_time", { nullsFirst: false })
      .limit(50),
    supabase
      .from("sisters_tests")
      .select("id,title,time_limit_minutes,pass_score,sisters_questions(count)")
      .eq("family_id", familyId)
      .eq("student_id", studentId)
      .in("status", ["published", "retest"])
      .order("scheduled_date")
      .limit(1),
  ]);

  if (!student.data) {
    logError("data/student.loadStudentHome", new Error("student row not found"), { studentId });
    return { demo: false, signedIn: false, student: null, tasks: [], nextTest: null, weeklyGoalMinutes: 0, weeklyStudiedMinutes: 0 };
  }

  const subjectName = (row: { sisters_subjects?: unknown }) => {
    const embed = row.sisters_subjects as { name?: string } | { name?: string }[] | null | undefined;
    if (Array.isArray(embed)) return embed[0]?.name ?? "기타";
    return embed?.name ?? "기타";
  };

  const firstTest = tests.data?.[0];
  const questionCount = Array.isArray(firstTest?.sisters_questions)
    ? ((firstTest.sisters_questions[0] as { count?: number } | undefined)?.count ?? 0)
    : 0;

  return {
    demo: false,
    signedIn: true,
    student: {
      id: student.data.id,
      name: student.data.name,
      avatar: student.data.avatar,
      streak: 0,
    },
    tasks: (tasks.data ?? []).map((row) => ({
      id: row.id,
      subject: subjectName(row),
      type: row.task_type as TaskType,
      title: row.title,
      detail: row.detail,
      dueTime: row.due_time ? String(row.due_time).slice(0, 5) : null,
      estimatedMinutes: row.estimated_minutes,
      status: row.status as TaskStatus,
      evidence: (Array.isArray(row.evidence_requirements) ? row.evidence_requirements : ["check"]) as EvidenceKind[],
    })),
    nextTest: firstTest
      ? {
          id: firstTest.id,
          title: firstTest.title,
          questionCount,
          timeLimitMinutes: firstTest.time_limit_minutes,
          passScore: firstTest.pass_score,
        }
      : null,
    weeklyGoalMinutes: student.data.weekly_goal_minutes ?? 0,
    weeklyStudiedMinutes: 0,
  };
}
