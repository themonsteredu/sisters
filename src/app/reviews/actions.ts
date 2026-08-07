"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemoMode } from "@/lib/config";
import { gradeAttempt } from "@/lib/data/attempt-review";
import { getParentContext } from "@/lib/data/context";
import { recordDecision } from "@/lib/data/submissions";
import { actionFailure as fail, type ActionState } from "@/lib/forms/action-state";
import { proposeRemediationDate } from "@/lib/domain/scheduler";
import { logError } from "@/lib/observability/log";

const gradeSchema = z.object({
  attemptId: z.string().min(1),
  awardedJson: z.string().min(2),
  feedback: z.string().trim().max(2_000).optional(),
});

/** Applies the parent's points to the free-response items of an attempt. */
export async function gradeAttemptAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = gradeSchema.safeParse({
    attemptId: formData.get("attemptId"),
    awardedJson: formData.get("awardedJson"),
    feedback: formData.get("feedback") || undefined,
  });
  if (!parsed.success) return fail("채점 내용을 확인해 주세요.");

  let awarded: Record<string, number>;
  try {
    const raw = JSON.parse(parsed.data.awardedJson) as Record<string, unknown>;
    awarded = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, Number(value) || 0]),
    );
  } catch {
    return fail("배점을 다시 확인해 주세요.");
  }

  if (isDemoMode) return { ok: true, message: "데모 모드입니다. 채점이 저장되지는 않습니다." };

  const context = await getParentContext();
  if (!context.ok) return fail(context.message);

  try {
    const result = await gradeAttempt(context.context, {
      attemptId: parsed.data.attemptId,
      awarded,
      feedback: parsed.data.feedback,
    });
    revalidatePath("/reviews");
    revalidatePath("/tests");
    revalidatePath("/reports");
    return {
      ok: true,
      message: `최종 ${result.score}점 · ${result.passed ? "합격" : "불합격"}으로 기록했습니다.`,
    };
  } catch (error) {
    logError("reviews/gradeAttemptAction", error, { attemptId: parsed.data.attemptId });
    return fail(error instanceof Error && error.message.includes("이미") ? error.message : "채점을 저장하지 못했습니다.");
  }
}

const decisionSchema = z.object({
  submissionId: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  feedback: z.string().trim().max(2_000).optional(),
  taskTitle: z.string().trim().max(120).optional(),
});

// Weekdays the remediation task may land on. Kept here until per-family study
// weekdays are configurable.
const remediationWeekdays = [1, 2, 3, 4, 5];
const remediationMinutes = 15;

function seoulDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date());
}

/**
 * Records the parent's decision. The AI never approves anything — its analysis
 * is advisory and this action is the only thing that writes parent_decision.
 */
export async function reviewSubmissionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = decisionSchema.safeParse({
    submissionId: formData.get("submissionId"),
    decision: formData.get("decision"),
    feedback: formData.get("feedback") || undefined,
    taskTitle: formData.get("taskTitle") || undefined,
  });
  if (!parsed.success) return fail("검수 내용을 확인해 주세요.");

  const approved = parsed.data.decision === "approved";

  if (isDemoMode) {
    return {
      ok: true,
      message: approved
        ? "데모 모드입니다. 승인이 저장되지는 않습니다."
        : "데모 모드입니다. 반려와 보완 과제가 저장되지는 않습니다.",
    };
  }

  const context = await getParentContext();
  if (!context.ok) return fail(context.message);

  let remediation: { date: string; title: string; detail: string; estimatedMinutes: number } | undefined;
  if (!approved) {
    try {
      remediation = {
        date: proposeRemediationDate(seoulDate(), remediationWeekdays),
        title: `${parsed.data.taskTitle ?? "학습"} 다시 하기`,
        detail: parsed.data.feedback?.trim() || "부모님이 반려한 학습을 다시 진행합니다.",
        estimatedMinutes: remediationMinutes,
      };
    } catch (error) {
      // A rejection is still worth recording even if no follow-up slot exists.
      logError("reviews/reviewSubmissionAction", error);
    }
  }

  let remediationTaskId: string | null = null;
  try {
    ({ remediationTaskId } = await recordDecision(context.context, {
      submissionId: parsed.data.submissionId,
      decision: parsed.data.decision,
      feedback: parsed.data.feedback,
      remediation,
    }));
  } catch (error) {
    logError("reviews/reviewSubmissionAction", error, { submissionId: parsed.data.submissionId });
    const message = error instanceof Error && error.message === "이미 검수를 마친 제출물입니다."
      ? error.message
      : "검수를 저장하지 못했습니다.";
    return fail(message);
  }

  revalidatePath("/reviews");
  revalidatePath("/dashboard");
  revalidatePath("/student");

  if (approved) return { ok: true, message: "제출물을 승인했습니다." };
  return {
    ok: true,
    message: remediationTaskId && remediation
      ? `반려했습니다. ${remediation.date}에 보완 과제를 배정했습니다.`
      : "반려했습니다.",
  };
}
