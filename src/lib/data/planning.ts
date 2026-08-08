import "server-only";

import { demoCourses, demoStudents, demoTasks, demoWorkbooks } from "@/lib/demo-data";
import { logError } from "@/lib/observability/log";
import { getParentContext, isDemoContext, type ParentContext } from "./context";
import { recordAudit } from "./audit";
import { listMaterialsByTask, type TaskMaterial } from "./materials";
import { enqueueNotification } from "./notifications";

export interface PlanningStudent {
  id: string;
  name: string;
  grade: number;
}

export interface PlanningSubject {
  id: string;
  name: string;
}

export interface PlanningCourse {
  id: string;
  studentId: string;
  subject: string;
  title: string;
  teacher: string | null;
  lessonCount: number;
}

export interface PlanningWorkbook {
  id: string;
  studentId: string;
  subject: string;
  title: string;
  unit: string | null;
  currentPage: number;
  endPage: number;
  targetDate: string;
}

export interface PlanningPlan {
  id: string;
  studentId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  taskCount: number;
}

export interface PlanningTask {
  id: string;
  studentId: string;
  subject: string;
  title: string;
  scheduledDate: string;
  estimatedMinutes: number;
  status: string;
  materials: TaskMaterial[];
}

export interface PlanningWorkspaceData {
  demo: boolean;
  /** null when the parent has not completed family onboarding. */
  hasFamily: boolean;
  month: string;
  /** Today in Asia/Seoul; the quick-plan parser resolves relative dates against it. */
  today: string;
  students: PlanningStudent[];
  subjects: PlanningSubject[];
  courses: PlanningCourse[];
  workbooks: PlanningWorkbook[];
  plans: PlanningPlan[];
  tasks: PlanningTask[];
}

export function monthRange(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 0));
  const iso = (value: Date) => value.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end), daysInMonth: end.getUTCDate() };
}

export function currentSeoulDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

export function currentSeoulMonth() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" })
    .format(new Date())
    .slice(0, 7);
}

function demoWorkspace(month: string): PlanningWorkspaceData {
  return {
    demo: true,
    hasFamily: true,
    month,
    today: currentSeoulDate(),
    students: demoStudents.map((student) => ({ id: student.id, name: student.name, grade: student.grade })),
    subjects: ["영어", "수학", "국어", "과학", "역사"].map((name) => ({ id: `subject-${name}`, name })),
    courses: demoCourses.map((course) => ({
      id: course.id,
      studentId: course.studentId,
      subject: course.subject,
      title: course.title,
      teacher: course.teacher ?? null,
      lessonCount: course.lessons.length,
    })),
    workbooks: demoWorkbooks.map((workbook) => ({
      id: workbook.id,
      studentId: workbook.studentId,
      subject: workbook.subject,
      title: workbook.title,
      unit: workbook.unit ?? null,
      currentPage: workbook.currentPage,
      endPage: workbook.endPage,
      targetDate: workbook.targetDate,
    })),
    plans: [],
    tasks: demoTasks.map((task) => ({
      id: task.id,
      studentId: task.studentId,
      subject: task.subject,
      title: task.title,
      scheduledDate: task.scheduledDate,
      estimatedMinutes: task.estimatedMinutes,
      status: task.status,
      materials: [],
    })),
  };
}

function emptyWorkspace(month: string, hasFamily: boolean): PlanningWorkspaceData {
  return { demo: false, hasFamily, month, today: currentSeoulDate(), students: [], subjects: [], courses: [], workbooks: [], plans: [], tasks: [] };
}

export async function loadPlanningWorkspace(month = currentSeoulMonth()): Promise<PlanningWorkspaceData> {
  if (isDemoContext()) return demoWorkspace(month);

  const result = await getParentContext();
  if (!result.ok) return emptyWorkspace(month, result.reason !== "no-family" ? false : false);

  const { supabase, familyId } = result.context;
  const { start, end } = monthRange(month);

  const [students, subjects, courses, workbooks, plans, tasks] = await Promise.all([
    supabase.from("sisters_students").select("id,name,grade").eq("family_id", familyId).eq("active", true).order("created_at"),
    supabase.from("sisters_subjects").select("id,name").eq("family_id", familyId).order("sort_order"),
    supabase
      .from("sisters_courses")
      .select("id,student_id,title,teacher,sisters_subjects(name),sisters_lessons(count)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("sisters_workbooks")
      .select("id,student_id,title,unit,current_page,end_page,target_date,sisters_subjects(name)")
      .eq("family_id", familyId)
      .order("target_date")
      .limit(100),
    supabase
      .from("sisters_plans")
      .select("id,student_id,title,period_start,period_end,status,sisters_tasks(count)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("sisters_tasks")
      .select("id,student_id,title,scheduled_date,estimated_minutes,status,sisters_subjects(name)")
      .eq("family_id", familyId)
      .gte("scheduled_date", start)
      .lte("scheduled_date", end)
      .order("scheduled_date")
      .limit(500),
  ]);

  // PostgREST returns embedded one-to-one relations as an object and aggregate
  // embeds as a single-element array; both are typed loosely, so normalize here.
  const subjectName = (row: { sisters_subjects?: unknown }) => {
    const embed = row.sisters_subjects as { name?: string } | { name?: string }[] | null | undefined;
    if (Array.isArray(embed)) return embed[0]?.name ?? "기타";
    return embed?.name ?? "기타";
  };
  const embeddedCount = (value: unknown) => {
    if (Array.isArray(value)) return (value[0] as { count?: number } | undefined)?.count ?? 0;
    return (value as { count?: number } | null)?.count ?? 0;
  };

  const taskRows = (tasks.data ?? []).map((row) => ({
    id: row.id,
    studentId: row.student_id,
    subject: subjectName(row),
    title: row.title,
    scheduledDate: row.scheduled_date,
    estimatedMinutes: row.estimated_minutes,
    status: row.status,
    materials: [] as TaskMaterial[],
  }));

  // One extra round-trip for the whole month rather than one per task.
  const materialsByTask = await listMaterialsByTask(result.context, taskRows.map((task) => task.id));
  for (const task of taskRows) task.materials = materialsByTask.get(task.id) ?? [];

  return {
    demo: false,
    hasFamily: true,
    month,
    today: currentSeoulDate(),
    students: (students.data ?? []).map((row) => ({ id: row.id, name: row.name, grade: row.grade })),
    subjects: (subjects.data ?? []).map((row) => ({ id: row.id, name: row.name })),
    courses: (courses.data ?? []).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      subject: subjectName(row),
      title: row.title,
      teacher: row.teacher,
      lessonCount: embeddedCount(row.sisters_lessons),
    })),
    workbooks: (workbooks.data ?? []).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      subject: subjectName(row),
      title: row.title,
      unit: row.unit,
      currentPage: row.current_page,
      endPage: row.end_page,
      targetDate: row.target_date,
    })),
    plans: (plans.data ?? []).map((row) => ({
      id: row.id,
      studentId: row.student_id,
      title: row.title,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      status: row.status,
      taskCount: embeddedCount(row.sisters_tasks),
    })),
    tasks: taskRows,
  };
}

export interface CreateCourseInput {
  studentId: string;
  subjectId: string;
  title: string;
  teacher?: string;
  source: "mbest" | "manual";
  lessons: Array<{ index: number; title: string }>;
}

export async function createCourse(context: ParentContext, input: CreateCourseInput) {
  const { supabase, familyId } = context;

  const { data: course, error } = await supabase
    .from("sisters_courses")
    .insert({
      family_id: familyId,
      student_id: input.studentId,
      subject_id: input.subjectId,
      title: input.title,
      teacher: input.teacher || null,
      source: input.source,
    })
    .select("id")
    .single();
  if (error || !course) throw error ?? new Error("강좌를 저장하지 못했습니다.");

  if (input.lessons.length) {
    const { error: lessonError } = await supabase.from("sisters_lessons").insert(
      input.lessons.map((lesson) => ({
        family_id: familyId,
        course_id: course.id,
        lesson_index: lesson.index,
        title: lesson.title,
      })),
    );
    if (lessonError) {
      // The course row would otherwise survive without its outline.
      await supabase.from("sisters_courses").delete().eq("id", course.id).eq("family_id", familyId);
      throw lessonError;
    }
  }

  await recordAudit(context, {
    action: "course_created",
    entityType: "course",
    entityId: course.id,
    metadata: { lessonCount: input.lessons.length, source: input.source },
  });

  return course.id as string;
}

export interface CreateWorkbookInput {
  studentId: string;
  subjectId: string;
  title: string;
  unit?: string;
  currentPage: number;
  endPage: number;
  targetDate: string;
}

export async function createWorkbook(context: ParentContext, input: CreateWorkbookInput) {
  const { supabase, familyId } = context;

  const { data: workbook, error } = await supabase
    .from("sisters_workbooks")
    .insert({
      family_id: familyId,
      student_id: input.studentId,
      subject_id: input.subjectId,
      title: input.title,
      unit: input.unit || null,
      current_page: input.currentPage,
      end_page: input.endPage,
      target_date: input.targetDate,
    })
    .select("id")
    .single();
  if (error || !workbook) throw error ?? new Error("문제집을 저장하지 못했습니다.");

  await recordAudit(context, { action: "workbook_created", entityType: "workbook", entityId: workbook.id });

  return workbook.id as string;
}

export interface PlanTaskInput {
  title: string;
  detail: string;
  scheduledDate: string;
  estimatedMinutes: number;
  taskType: "lecture" | "workbook" | "memorize" | "review" | "test" | "custom";
  sourceId?: string;
}

export interface CreatePlanInput {
  studentId: string;
  subjectId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  tasks: PlanTaskInput[];
}

export async function createPlanWithTasks(context: ParentContext, input: CreatePlanInput) {
  const { supabase, familyId } = context;

  // One transaction: plan row + task rows + version snapshot.
  const { data, error } = await supabase.rpc("sisters_create_plan_with_tasks", {
    p_family_id: familyId,
    p_student_id: input.studentId,
    p_subject_id: input.subjectId,
    p_title: input.title,
    p_period_start: input.periodStart,
    p_period_end: input.periodEnd,
    p_tasks: input.tasks.map((task) => ({
      title: task.title,
      detail: task.detail,
      scheduled_date: task.scheduledDate,
      estimated_minutes: task.estimatedMinutes,
      task_type: task.taskType,
      source_id: task.sourceId ?? null,
    })),
  });

  if (error) {
    logError("data/planning.createPlanWithTasks", error, { familyId });
    throw error;
  }

  const planId = data as string;
  await Promise.all([
    recordAudit(context, {
      action: "plan_published",
      entityType: "plan",
      entityId: planId,
      metadata: { taskCount: input.tasks.length, periodStart: input.periodStart, periodEnd: input.periodEnd },
    }),
    enqueueNotification({
      familyId,
      eventType: "plan_published",
      title: "새 학습계획이 도착했어요",
      body: `${input.title} · ${input.tasks.length}일치 과제가 배정되었습니다.`,
      recipientStudentId: input.studentId,
      dedupeKey: `plan:${planId}:published`,
      channels: ["in_app"],
    }),
  ]);

  return planId;
}
