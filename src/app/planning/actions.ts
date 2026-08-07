"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getParentContext } from "@/lib/data/context";
import {
  attachMaterial,
  deleteMaterial,
  materialMimeTypes,
  materialStoragePath,
  materialsBucket,
  maxMaterialBytes,
  maxMaterialsPerTask,
  removeUploadedMaterials,
} from "@/lib/data/materials";
import { createCourse, createPlanWithTasks, createWorkbook } from "@/lib/data/planning";
import { isDemoMode } from "@/lib/config";
import { parseCourseOutline } from "@/lib/domain/course-parser";
import { buildPlanTasks } from "@/lib/domain/plan-tasks";
import { distributeStudyUnits } from "@/lib/domain/scheduler";
import { logError } from "@/lib/observability/log";
import { actionFailure as fail, type ActionState } from "@/lib/forms/action-state";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식을 확인해 주세요.");

// Demo fixtures use readable ids ("student-minseo"), so the UUID shape is only
// enforced on the path that actually reaches Postgres.
const studentId = isDemoMode
  ? z.string().min(1, "학생을 선택해 주세요.")
  : z.uuid("학생을 선택해 주세요.");
const subjectId = isDemoMode
  ? z.string().min(1, "과목을 선택해 주세요.")
  : z.uuid("과목을 선택해 주세요.");

// Server actions get Next's built-in Origin/Host check, so they do not repeat
// assertSameOrigin. The family is resolved from the session inside
// getParentContext and is never accepted from the form.

const courseSchema = z.object({
  studentId,
  subjectId,
  title: z.string().trim().min(1, "강좌 이름을 입력해 주세요.").max(120),
  teacher: z.string().trim().max(60).optional(),
  outline: z.string().trim().min(1, "목차를 붙여넣어 주세요.").max(50_000),
  source: z.enum(["mbest", "manual"]).default("manual"),
});

export async function createCourseAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = courseSchema.safeParse({
    studentId: formData.get("studentId"),
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    teacher: formData.get("teacher") || undefined,
    outline: formData.get("outline"),
    source: formData.get("source") || "manual",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.");

  const lessons = parseCourseOutline(parsed.data.outline).map((lesson) => ({
    index: lesson.index,
    title: lesson.title,
  }));
  if (!lessons.length) return fail("목차에서 강의를 찾지 못했습니다.");
  if (lessons.length > 300) return fail("한 강좌에는 최대 300강까지 등록할 수 있습니다.");

  if (isDemoMode) return { ok: true, message: `데모 모드입니다. ${lessons.length}강이 저장되지는 않습니다.` };

  const context = await getParentContext();
  if (!context.ok) return fail(context.message);

  try {
    await createCourse(context.context, { ...parsed.data, lessons });
  } catch (error) {
    logError("planning/createCourseAction", error);
    return fail("강좌를 저장하지 못했습니다.");
  }

  revalidatePath("/planning");
  revalidatePath("/dashboard");
  return { ok: true, message: `${parsed.data.title} · ${lessons.length}강을 등록했습니다.` };
}

const workbookSchema = z
  .object({
    studentId,
    subjectId,
    title: z.string().trim().min(1, "문제집 이름을 입력해 주세요.").max(120),
    unit: z.string().trim().max(60).optional(),
    currentPage: z.coerce.number().int().min(1, "시작 쪽수를 확인해 주세요."),
    endPage: z.coerce.number().int().min(1, "마지막 쪽수를 확인해 주세요."),
    targetDate: isoDate,
  })
  .refine((value) => value.endPage >= value.currentPage, {
    message: "마지막 쪽수는 시작 쪽수보다 커야 합니다.",
    path: ["endPage"],
  });

export async function createWorkbookAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = workbookSchema.safeParse({
    studentId: formData.get("studentId"),
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    unit: formData.get("unit") || undefined,
    currentPage: formData.get("currentPage"),
    endPage: formData.get("endPage"),
    targetDate: formData.get("targetDate"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.");

  if (isDemoMode) return { ok: true, message: "데모 모드입니다. 실제로 저장되지는 않습니다." };

  const context = await getParentContext();
  if (!context.ok) return fail(context.message);

  try {
    await createWorkbook(context.context, parsed.data);
  } catch (error) {
    logError("planning/createWorkbookAction", error);
    return fail("문제집을 저장하지 못했습니다.");
  }

  revalidatePath("/planning");
  revalidatePath("/dashboard");
  return { ok: true, message: `${parsed.data.title}을(를) 등록했습니다.` };
}

const materialSchema = z.object({
  taskId: z.string().min(1, "과제를 찾을 수 없습니다."),
  title: z.string().trim().max(120).optional(),
});

/** Attaches a parent-supplied worksheet (PDF or image) to a task. */
export async function attachMaterialAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = materialSchema.safeParse({
    taskId: formData.get("taskId"),
    title: formData.get("title") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.");

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (!files.length) return fail("파일을 선택해 주세요.");
  if (files.length > maxMaterialsPerTask) return fail(`한 번에 최대 ${maxMaterialsPerTask}개까지 올릴 수 있습니다.`);
  for (const file of files) {
    if (!materialMimeTypes.has(file.type)) return fail("PDF 또는 이미지(JPG·PNG·WEBP)만 올릴 수 있습니다.");
    if (file.size > maxMaterialBytes) return fail("파일 한 개가 20MB를 넘을 수 없습니다.");
  }

  if (isDemoMode) {
    return { ok: true, message: `데모 모드입니다. 자료 ${files.length}개가 저장되지는 않습니다.` };
  }

  const context = await getParentContext();
  if (!context.ok) return fail(context.message);

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      const path = materialStoragePath(context.context, parsed.data.taskId, file.name);
      const { error } = await context.context.supabase.storage
        .from(materialsBucket)
        .upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: "3600", upsert: false });
      if (error) throw error;
      uploaded.push(path);

      await attachMaterial(context.context, {
        taskId: parsed.data.taskId,
        title: parsed.data.title?.trim() || file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storagePath: path,
      });
    }
  } catch (error) {
    await removeUploadedMaterials(uploaded);
    logError("planning/attachMaterialAction", error, { taskId: parsed.data.taskId });
    return fail(error instanceof Error && /할 일|최대|형식/.test(error.message) ? error.message : "자료를 올리지 못했습니다.");
  }

  revalidatePath("/planning");
  revalidatePath("/student");
  return { ok: true, message: `자료 ${files.length}개를 첨부했습니다. 학생 화면에서 열어볼 수 있습니다.` };
}

export async function deleteMaterialAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const materialId = String(formData.get("materialId") ?? "");
  if (!materialId) return fail("자료를 찾을 수 없습니다.");

  if (isDemoMode) return { ok: true, message: "데모 모드입니다. 삭제가 저장되지는 않습니다." };

  const context = await getParentContext();
  if (!context.ok) return fail(context.message);

  try {
    await deleteMaterial(context.context, materialId);
  } catch (error) {
    logError("planning/deleteMaterialAction", error, { materialId });
    return fail("자료를 삭제하지 못했습니다.");
  }

  revalidatePath("/planning");
  revalidatePath("/student");
  return { ok: true, message: "자료를 삭제했습니다." };
}

const planSchema = z
  .object({
    studentId,
    subjectId,
    title: z.string().trim().min(1, "계획 이름을 입력해 주세요.").max(120),
    periodStart: isoDate,
    periodEnd: isoDate,
    totalUnits: z.coerce.number().int().min(1, "학습량은 1 이상이어야 합니다.").max(400),
    unitLabel: z.string().trim().min(1).max(20).default("강"),
    weekdays: z.string().trim().min(1, "학습 요일을 하나 이상 선택해 주세요."),
    maxUnitsPerDay: z.coerce.number().int().min(1).max(20),
    minutesPerUnit: z.coerce.number().int().min(5).max(240),
    taskType: z.enum(["lecture", "workbook", "memorize", "review", "test", "custom"]).default("lecture"),
    holidays: z.string().trim().optional(),
  })
  .refine((value) => value.periodEnd >= value.periodStart, {
    message: "완료일은 시작일보다 빠를 수 없습니다.",
    path: ["periodEnd"],
  });

export async function createPlanAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = planSchema.safeParse({
    studentId: formData.get("studentId"),
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    totalUnits: formData.get("totalUnits"),
    unitLabel: formData.get("unitLabel") || "강",
    weekdays: formData.get("weekdays"),
    maxUnitsPerDay: formData.get("maxUnitsPerDay"),
    minutesPerUnit: formData.get("minutesPerUnit"),
    taskType: formData.get("taskType") || "lecture",
    holidays: formData.get("holidays") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.");

  const availableWeekdays = parsed.data.weekdays
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  if (!availableWeekdays.length) return fail("학습 요일을 하나 이상 선택해 주세요.");

  const holidays = (parsed.data.holidays ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));

  // The same deterministic scheduler the demo preview uses, now with the real
  // weekdays, holidays and daily cap from the form.
  let units;
  try {
    units = distributeStudyUnits({
      startDate: parsed.data.periodStart,
      endDate: parsed.data.periodEnd,
      totalUnits: parsed.data.totalUnits,
      availableWeekdays,
      holidays,
      maxUnitsPerDay: parsed.data.maxUnitsPerDay,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "일정을 배분하지 못했습니다.");
  }

  const { unitLabel, minutesPerUnit, taskType, title } = parsed.data;
  const tasks = buildPlanTasks({ units, title, unitLabel, minutesPerUnit, taskType });

  if (isDemoMode) {
    return { ok: true, message: `데모 모드입니다. ${tasks.length}일치 과제가 저장되지는 않습니다.` };
  }

  const context = await getParentContext();
  if (!context.ok) return fail(context.message);

  try {
    await createPlanWithTasks(context.context, {
      studentId: parsed.data.studentId,
      subjectId: parsed.data.subjectId,
      title,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      tasks,
    });
  } catch (error) {
    logError("planning/createPlanAction", error);
    return fail("학습계획을 저장하지 못했습니다.");
  }

  revalidatePath("/planning");
  revalidatePath("/dashboard");
  revalidatePath("/student");
  return { ok: true, message: `${tasks.length}일치 과제를 만들어 학생에게 공개했습니다.` };
}
