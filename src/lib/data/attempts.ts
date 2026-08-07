import "server-only";

import { calculateScore, gradeDeterministicAnswer } from "@/lib/domain/grading";
import { logError } from "@/lib/observability/log";
import type { StudentContext } from "./context";
import { enqueueNotification } from "./notifications";
import { loadGradableQuestions } from "./tests";

/** Question types a machine cannot settle; they always go to the parent. */
const parentReviewTypes = new Set(["essay", "oral", "speaking"]);

export interface AttemptResult {
  attemptId: string;
  attemptNumber: number;
  attemptsRemaining: number;
  score: number;
  passed: boolean;
  needsParentReview: boolean;
  correctCount: number;
  gradedCount: number;
}

/**
 * Grades and records an attempt. The score is computed here from the stored
 * answers — the client sends only responses, and never received the answers in
 * the first place (see loadStudentTest).
 *
 * Free-response items are excluded from the deterministic denominator rather
 * than counted as wrong, so a student is not penalised for work the parent has
 * not marked yet.
 */
export async function finalizeAttempt(
  context: StudentContext,
  input: { testId: string; responses: Record<string, string | string[]> },
): Promise<AttemptResult> {
  const { supabase, familyId, studentId } = context;

  const questions = await loadGradableQuestions(context, input.testId);
  if (!questions.length) throw new Error("문항이 없는 테스트입니다.");

  const graded = questions.map((question) => {
    const response = input.responses[question.id] ?? "";
    const result = gradeDeterministicAnswer(question, response);
    return { questionId: question.id, type: question.type, ...result };
  });

  const deterministic = graded.filter((item) => !item.needsParentReview);
  const deterministicPoints = questions
    .filter((question) => !parentReviewTypes.has(question.type))
    .reduce((sum, question) => sum + question.points, 0);

  const score = calculateScore(deterministic, deterministicPoints);
  const needsParentReview = graded.some((item) => item.needsParentReview);

  const { data: test } = await supabase
    .from("sisters_tests")
    .select("pass_score")
    .eq("id", input.testId)
    .eq("family_id", familyId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!test) throw new Error("접근할 수 없는 테스트입니다.");

  // A test with unmarked free response is not passed on the machine score alone.
  const passed = !needsParentReview && score >= test.pass_score;

  const { data, error } = await supabase.rpc("sisters_finalize_attempt", {
    p_family_id: familyId,
    p_student_id: studentId,
    p_test_id: input.testId,
    p_responses: input.responses,
    p_grading: graded,
    p_score: score,
    p_passed: passed,
    p_needs_parent_review: needsParentReview,
  });

  if (error) {
    logError("data/attempts.finalizeAttempt", error, { testId: input.testId });
    throw error;
  }

  const result = data as { attempt_id: string; attempt_number: number; attempts_remaining: number };

  // Free-response answers need a parent; a fail with attempts left does not.
  if (needsParentReview) {
    const { data: members } = await supabase
      .from("sisters_family_members")
      .select("user_id")
      .eq("family_id", familyId)
      .limit(10);
    await Promise.all(
      (members ?? []).map((member) =>
        enqueueNotification({
          familyId,
          eventType: "test_review",
          title: "서술형 채점이 필요합니다",
          body: `자동 채점 ${score}점. 서술형 문항을 확인해 주세요.`,
          recipientUserId: member.user_id,
          dedupeKey: `attempt:${result.attempt_id}:review:${member.user_id}`,
          channels: ["in_app", "web_push"],
        }),
      ),
    );
  }

  return {
    attemptId: result.attempt_id,
    attemptNumber: result.attempt_number,
    attemptsRemaining: result.attempts_remaining,
    score,
    passed,
    needsParentReview,
    correctCount: deterministic.filter((item) => item.correct).length,
    gradedCount: deterministic.length,
  };
}
