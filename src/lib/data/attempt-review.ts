import "server-only";

import { calculateScore } from "@/lib/domain/grading";
import { logError } from "@/lib/observability/log";
import { recordAudit } from "./audit";
import type { ParentContext } from "./context";
import { enqueueNotification } from "./notifications";

/** One free-response item awaiting the parent's points. */
export interface PendingAnswer {
  questionId: string;
  prompt: string;
  type: string;
  points: number;
  /** The parent authored the test, so they may see the reference answer. */
  referenceAnswer: string;
  explanation: string | null;
  response: string;
}

export interface PendingAttempt {
  id: string;
  testId: string;
  studentId: string;
  studentName: string;
  testTitle: string;
  passScore: number;
  attemptNumber: number;
  autoScore: number;
  answers: PendingAnswer[];
}

interface GradingEntry {
  questionId: string;
  type: string;
  correct: boolean;
  earnedPoints: number;
  needsParentReview: boolean;
}

function textOf(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value);
}

/**
 * Attempts blocked on the parent. Until this existed a free-response test was a
 * dead end: finalizeAttempt flagged needs_parent_review and notified, but there
 * was no screen to clear it.
 */
export async function listPendingAttempts(context: ParentContext, limit = 20): Promise<PendingAttempt[]> {
  const { supabase, familyId } = context;

  const { data, error } = await supabase
    .from("sisters_attempts")
    .select("id,test_id,student_id,attempt_number,score,responses,grading,sisters_students(name),sisters_tests(title,pass_score)")
    .eq("family_id", familyId)
    .eq("needs_parent_review", true)
    .order("completed_at")
    .limit(limit);

  if (error) {
    logError("data/attempt-review.listPendingAttempts", error, { familyId });
    return [];
  }
  const rows = data ?? [];
  if (!rows.length) return [];

  // Fetch the questions for every test involved in one round-trip.
  const testIds = [...new Set(rows.map((row) => row.test_id))];
  const { data: questions } = await supabase
    .from("sisters_questions")
    .select("id,test_id,prompt,question_type,points,answer,explanation")
    .in("test_id", testIds)
    .eq("family_id", familyId)
    .limit(500);

  const questionById = new Map((questions ?? []).map((question) => [question.id, question]));

  return rows.map((row) => {
    const single = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);
    const student = single(row.sisters_students as { name?: string } | { name?: string }[] | null);
    const test = single(row.sisters_tests as { title?: string; pass_score?: number } | { title?: string; pass_score?: number }[] | null);
    const grading = (Array.isArray(row.grading) ? row.grading : []) as GradingEntry[];
    const responses = (row.responses ?? {}) as Record<string, unknown>;

    return {
      id: row.id,
      testId: row.test_id,
      studentId: row.student_id,
      studentName: student?.name ?? "학생",
      testTitle: test?.title ?? "테스트",
      passScore: test?.pass_score ?? 80,
      attemptNumber: row.attempt_number,
      autoScore: row.score,
      answers: grading
        .filter((entry) => entry.needsParentReview)
        .map((entry) => {
          const question = questionById.get(entry.questionId);
          return {
            questionId: entry.questionId,
            prompt: question?.prompt ?? "문항",
            type: entry.type,
            points: question?.points ?? 0,
            referenceAnswer: textOf(question?.answer),
            explanation: question?.explanation ?? null,
            response: textOf(responses[entry.questionId]),
          };
        }),
    };
  });
}

/**
 * Applies the parent's points and finalises the attempt.
 *
 * The score is recomputed over ALL questions — the automatic pass excluded
 * free-response items from its denominator, so the final figure is the first
 * one measured against the whole test.
 */
export async function gradeAttempt(
  context: ParentContext,
  input: { attemptId: string; awarded: Record<string, number>; feedback?: string },
) {
  const { supabase, familyId } = context;

  const { data: attempt, error } = await supabase
    .from("sisters_attempts")
    .select("id,test_id,student_id,grading,needs_parent_review,sisters_tests(pass_score,max_attempts,title)")
    .eq("id", input.attemptId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (error) throw error;
  if (!attempt) throw new Error("응시 기록을 찾을 수 없습니다.");
  if (!attempt.needs_parent_review) throw new Error("이미 채점을 마친 응시입니다.");

  const single = <T,>(value: T | T[] | null): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);
  const test = single(attempt.sisters_tests as { pass_score?: number; max_attempts?: number; title?: string } | { pass_score?: number; max_attempts?: number; title?: string }[] | null);
  const grading = (Array.isArray(attempt.grading) ? attempt.grading : []) as GradingEntry[];

  const { data: questions } = await supabase
    .from("sisters_questions")
    .select("id,points")
    .eq("test_id", attempt.test_id)
    .eq("family_id", familyId)
    .limit(500);
  const pointsById = new Map((questions ?? []).map((question) => [question.id, question.points as number]));
  const totalPoints = [...pointsById.values()].reduce((sum, points) => sum + points, 0);

  const updated = grading.map((entry) => {
    if (!entry.needsParentReview) return entry;
    const max = pointsById.get(entry.questionId) ?? 0;
    // Clamp: a typed value must not exceed the question's own points.
    const awarded = Math.max(0, Math.min(max, Math.round(input.awarded[entry.questionId] ?? 0)));
    return { ...entry, earnedPoints: awarded, correct: max > 0 && awarded === max, needsParentReview: false };
  });

  const finalScore = calculateScore(updated, totalPoints);
  const passed = finalScore >= (test?.pass_score ?? 80);

  const { error: updateError } = await supabase
    .from("sisters_attempts")
    .update({ grading: updated, score: finalScore, passed, needs_parent_review: false })
    .eq("id", input.attemptId)
    .eq("family_id", familyId);
  if (updateError) throw updateError;

  // A pass closes the test; a fail leaves it open for a retest if attempts remain.
  const { count } = await supabase
    .from("sisters_attempts")
    .select("id", { count: "exact", head: true })
    .eq("test_id", attempt.test_id)
    .eq("student_id", attempt.student_id);
  const exhausted = (count ?? 0) >= (test?.max_attempts ?? 1);

  await supabase
    .from("sisters_tests")
    .update({ status: passed || exhausted ? "completed" : "retest" })
    .eq("id", attempt.test_id)
    .eq("family_id", familyId);

  await Promise.all([
    recordAudit(context, {
      action: "attempt_graded",
      entityType: "attempt",
      entityId: input.attemptId,
      metadata: { score: finalScore, passed },
    }),
    enqueueNotification({
      familyId,
      eventType: "test_graded",
      title: passed ? "테스트에 합격했어요" : "테스트 결과가 나왔어요",
      body: input.feedback?.trim() || `${test?.title ?? "테스트"} · ${finalScore}점`,
      recipientStudentId: attempt.student_id,
      dedupeKey: `attempt:${input.attemptId}:graded`,
      channels: ["in_app"],
    }),
  ]);

  return { score: finalScore, passed };
}
