"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemoMode } from "@/lib/config";
import { getParentContext } from "@/lib/data/context";
import { createTest, publishTest } from "@/lib/data/tests";
import { actionFailure as fail, type ActionState } from "@/lib/forms/action-state";
import { logError } from "@/lib/observability/log";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식을 확인해 주세요.");

const studentId = isDemoMode ? z.string().min(1, "학생을 선택해 주세요.") : z.uuid("학생을 선택해 주세요.");
const subjectId = isDemoMode ? z.string().min(1, "과목을 선택해 주세요.") : z.uuid("과목을 선택해 주세요.");

const questionSchema = z.object({
  type: z.enum(["multiple_choice", "spelling", "dictation", "short_answer", "fill_blank", "ordering", "essay", "oral", "speaking"]),
  prompt: z.string().trim().min(1, "문제를 입력해 주세요.").max(1_000),
  choices: z.array(z.string().trim().min(1)).max(8).optional(),
  answer: z.union([z.string().trim(), z.array(z.string().trim())]),
  acceptedAnswers: z.array(z.string().trim()).max(10).optional(),
  points: z.coerce.number().int().min(1).max(100),
});

const testSchema = z.object({
  studentId,
  subjectId,
  title: z.string().trim().min(1, "테스트 이름을 입력해 주세요.").max(120),
  scheduledDate: isoDate,
  passScore: z.coerce.number().int().min(0).max(100),
  timeLimitMinutes: z.coerce.number().int().min(1).max(180),
  maxAttempts: z.coerce.number().int().min(1).max(5),
  shuffleQuestions: z.coerce.boolean(),
  questions: z.array(questionSchema).min(1, "문항을 하나 이상 추가해 주세요.").max(100),
});

export async function createTestAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  let rawQuestions: unknown;
  try {
    rawQuestions = JSON.parse(String(formData.get("questionsJson") ?? "[]"));
  } catch {
    return fail("문항 정보를 다시 확인해 주세요.");
  }

  const parsed = testSchema.safeParse({
    studentId: formData.get("studentId"),
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    scheduledDate: formData.get("scheduledDate"),
    passScore: formData.get("passScore"),
    timeLimitMinutes: formData.get("timeLimitMinutes"),
    maxAttempts: formData.get("maxAttempts"),
    shuffleQuestions: formData.get("shuffleQuestions") ? true : false,
    questions: rawQuestions,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "입력 내용을 확인해 주세요.");

  // A multiple-choice question without choices cannot be answered.
  const broken = parsed.data.questions.find((q) => q.type === "multiple_choice" && (q.choices?.length ?? 0) < 2);
  if (broken) return fail("객관식 문항에는 보기를 두 개 이상 입력해 주세요.");

  if (isDemoMode) {
    return { ok: true, message: `데모 모드입니다. ${parsed.data.questions.length}문항이 저장되지는 않습니다.` };
  }

  const context = await getParentContext();
  if (!context.ok) return fail(context.message);

  try {
    await createTest(context.context, parsed.data);
  } catch (error) {
    logError("tests/createTestAction", error);
    return fail("테스트를 저장하지 못했습니다.");
  }

  revalidatePath("/tests");
  return { ok: true, message: `${parsed.data.title} 초안을 만들었습니다. 공개하면 학생이 응시할 수 있습니다.` };
}

const publishSchema = z.object({ testId: z.string().min(1) });

export async function publishTestAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = publishSchema.safeParse({ testId: formData.get("testId") });
  if (!parsed.success) return fail("테스트를 찾을 수 없습니다.");

  if (isDemoMode) return { ok: true, message: "데모 모드입니다. 공개 상태가 저장되지는 않습니다." };

  const context = await getParentContext();
  if (!context.ok) return fail(context.message);

  try {
    await publishTest(context.context, parsed.data.testId);
  } catch (error) {
    logError("tests/publishTestAction", error);
    return fail(error instanceof Error && error.message.includes("문항") ? error.message : "테스트를 공개하지 못했습니다.");
  }

  revalidatePath("/tests");
  revalidatePath("/student");
  revalidatePath("/student/tests");
  return { ok: true, message: "테스트를 학생에게 공개했습니다." };
}
