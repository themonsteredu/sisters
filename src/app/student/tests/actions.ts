"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemoMode } from "@/lib/config";
import { finalizeAttempt } from "@/lib/data/attempts";
import { getStudentContext } from "@/lib/data/context";
import { actionFailure as fail, type AttemptState } from "@/lib/forms/action-state";
import { logError } from "@/lib/observability/log";

const responsesSchema = z.record(
  z.string().min(1),
  z.union([z.string().max(2_000), z.array(z.string().max(500)).max(20)]),
);

const bodySchema = z.object({ testId: z.string().min(1) });

/**
 * Submits an attempt. The client sends responses only — it never held the
 * answers, and the score is computed server-side in finalizeAttempt.
 */
export async function submitAttemptAction(_previous: AttemptState, formData: FormData): Promise<AttemptState> {
  const parsedBody = bodySchema.safeParse({ testId: formData.get("testId") });
  if (!parsedBody.success) return fail("테스트를 찾을 수 없습니다.");

  let rawResponses: unknown;
  try {
    rawResponses = JSON.parse(String(formData.get("responsesJson") ?? "{}"));
  } catch {
    return fail("답안을 다시 확인해 주세요.");
  }

  const parsedResponses = responsesSchema.safeParse(rawResponses);
  if (!parsedResponses.success) return fail("답안 형식을 확인해 주세요.");

  if (isDemoMode) {
    return {
      ok: true,
      message: "데모 모드에서는 채점하지 않습니다. 실제 응시에서는 서버가 채점해 점수를 알려줍니다.",
      result: {
        graded: false,
        score: 0,
        passed: false,
        needsParentReview: false,
        correctCount: 0,
        gradedCount: Object.keys(parsedResponses.data).length,
        attemptsRemaining: 0,
      },
    };
  }

  const context = await getStudentContext();
  if (!context.ok) return fail(context.message);

  try {
    const result = await finalizeAttempt(context.context, {
      testId: parsedBody.data.testId,
      responses: parsedResponses.data,
    });

    revalidatePath("/student");
    revalidatePath("/student/tests");
    revalidatePath("/tests");

    return {
      ok: true,
      message: result.needsParentReview
        ? "제출했습니다. 서술형 문항은 부모님이 확인합니다."
        : result.passed
          ? `합격했어요! ${result.score}점`
          : `${result.score}점입니다. 다시 도전해 보세요.`,
      result: {
        graded: true,
        score: result.score,
        passed: result.passed,
        needsParentReview: result.needsParentReview,
        correctCount: result.correctCount,
        gradedCount: result.gradedCount,
        attemptsRemaining: result.attemptsRemaining,
      },
    };
  } catch (error) {
    logError("student/submitAttemptAction", error, { testId: parsedBody.data.testId });
    const message = error instanceof Error && /attempts remaining|no attempts/i.test(error.message)
      ? "응시 가능 횟수를 모두 사용했습니다."
      : "채점 결과를 저장하지 못했습니다.";
    return fail(message);
  }
}
