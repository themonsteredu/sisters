import "server-only";

import type { QuestionType, TestQuestion } from "@/lib/domain/types";
import { logError } from "@/lib/observability/log";
import { recordAudit } from "./audit";
import type { ParentContext, StudentContext } from "./context";
import { enqueueNotification } from "./notifications";

/** Columns that must never be sent to a student's browser. */
const secretQuestionColumns = ["answer", "accepted_answers", "explanation"] as const;

export interface ParentTest {
  id: string;
  studentId: string;
  title: string;
  subject: string;
  scheduledDate: string;
  passScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  status: string;
  questionCount: number;
  latestScore: number | null;
  attemptCount: number;
}

/**
 * A question as the student is allowed to see it.
 *
 * `answer`, `acceptedAnswers` and `explanation` are deliberately absent from
 * the type, not merely omitted at one call site — the student path runs on the
 * service-role client, so the query returns every column and redaction has to
 * be explicit and total. Grading happens on the server in finalizeAttempt.
 */
export interface StudentQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  choices: string[] | null;
  points: number;
}

export interface StudentTestView {
  id: string;
  title: string;
  timeLimitMinutes: number;
  passScore: number;
  maxAttempts: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  status: string;
  questions: StudentQuestion[];
}

function subjectNameOf(row: { sisters_subjects?: unknown }) {
  const embed = row.sisters_subjects as { name?: string } | { name?: string }[] | null | undefined;
  if (Array.isArray(embed)) return embed[0]?.name ?? "기타";
  return embed?.name ?? "기타";
}

function embeddedCount(value: unknown) {
  if (Array.isArray(value)) return (value[0] as { count?: number } | undefined)?.count ?? 0;
  return (value as { count?: number } | null)?.count ?? 0;
}

export async function listTests(context: ParentContext, limit = 50): Promise<ParentTest[]> {
  const { supabase, familyId } = context;

  const { data, error } = await supabase
    .from("sisters_tests")
    .select("id,student_id,title,scheduled_date,pass_score,time_limit_minutes,max_attempts,status,sisters_subjects(name),sisters_questions(count),sisters_attempts(score)")
    .eq("family_id", familyId)
    .order("scheduled_date", { ascending: false })
    .limit(limit);

  if (error) {
    logError("data/tests.listTests", error, { familyId });
    return [];
  }

  return (data ?? []).map((row) => {
    const attempts = (row.sisters_attempts ?? []) as Array<{ score: number }>;
    return {
      id: row.id,
      studentId: row.student_id,
      title: row.title,
      subject: subjectNameOf(row),
      scheduledDate: row.scheduled_date,
      passScore: row.pass_score,
      timeLimitMinutes: row.time_limit_minutes,
      maxAttempts: row.max_attempts,
      status: row.status,
      questionCount: embeddedCount(row.sisters_questions),
      latestScore: attempts.length ? Math.max(...attempts.map((attempt) => attempt.score)) : null,
      attemptCount: attempts.length,
    };
  });
}

export interface CreateTestInput {
  studentId: string;
  subjectId: string;
  title: string;
  scheduledDate: string;
  passScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  questions: Array<{
    type: QuestionType;
    prompt: string;
    choices?: string[];
    answer: string | string[];
    acceptedAnswers?: string[];
    points: number;
  }>;
}

export async function createTest(context: ParentContext, input: CreateTestInput) {
  const { supabase, familyId, userId } = context;

  const { data: test, error } = await supabase
    .from("sisters_tests")
    .insert({
      family_id: familyId,
      student_id: input.studentId,
      subject_id: input.subjectId,
      title: input.title,
      scheduled_date: input.scheduledDate,
      pass_score: input.passScore,
      time_limit_minutes: input.timeLimitMinutes,
      max_attempts: input.maxAttempts,
      shuffle_questions: input.shuffleQuestions,
      status: "draft",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !test) throw error ?? new Error("테스트를 저장하지 못했습니다.");

  const { error: questionError } = await supabase.from("sisters_questions").insert(
    input.questions.map((question, index) => ({
      family_id: familyId,
      test_id: test.id,
      question_type: question.type,
      prompt: question.prompt,
      choices: question.choices ?? null,
      answer: question.answer,
      accepted_answers: question.acceptedAnswers ?? null,
      points: question.points,
      source: "parent",
      sort_order: index,
    })),
  );
  if (questionError) {
    // A test with no questions is not a usable draft.
    await supabase.from("sisters_tests").delete().eq("id", test.id).eq("family_id", familyId);
    throw questionError;
  }

  await recordAudit(context, {
    action: "test_created",
    entityType: "test",
    entityId: test.id,
    metadata: { questionCount: input.questions.length },
  });

  return test.id as string;
}

export async function publishTest(context: ParentContext, testId: string) {
  const { supabase, familyId } = context;

  const { count } = await supabase
    .from("sisters_questions")
    .select("id", { count: "exact", head: true })
    .eq("test_id", testId)
    .eq("family_id", familyId);
  if (!count) throw new Error("문항이 없는 테스트는 공개할 수 없습니다.");

  const { data: test, error } = await supabase
    .from("sisters_tests")
    .update({ status: "published" })
    .eq("id", testId)
    .eq("family_id", familyId)
    .eq("status", "draft")
    .select("student_id, title")
    .maybeSingle();
  if (error) throw error;

  await Promise.all([
    recordAudit(context, { action: "test_published", entityType: "test", entityId: testId }),
    test
      ? enqueueNotification({
          familyId,
          eventType: "test_published",
          title: "새 테스트가 열렸어요",
          body: `${test.title} · ${count}문항`,
          recipientStudentId: test.student_id,
          dedupeKey: `test:${testId}:published`,
          channels: ["in_app"],
        })
      : Promise.resolve(null),
  ]);
}

/**
 * The student's view of a test. Answers never leave the server.
 */
export async function loadStudentTest(context: StudentContext): Promise<StudentTestView | null> {
  const { supabase, familyId, studentId } = context;

  const { data: test, error } = await supabase
    .from("sisters_tests")
    .select("id,title,time_limit_minutes,pass_score,max_attempts,shuffle_questions,status")
    .eq("family_id", familyId)
    .eq("student_id", studentId)
    .in("status", ["published", "retest"])
    .order("scheduled_date")
    .limit(1)
    .maybeSingle();

  if (error) {
    logError("data/tests.loadStudentTest", error, { studentId });
    return null;
  }
  if (!test) return null;

  const [questions, attempts] = await Promise.all([
    // Note the select list: no answer, no accepted_answers, no explanation.
    supabase
      .from("sisters_questions")
      .select("id,question_type,prompt,choices,points")
      .eq("test_id", test.id)
      .eq("family_id", familyId)
      .order("sort_order")
      .limit(200),
    supabase
      .from("sisters_attempts")
      .select("id", { count: "exact", head: true })
      .eq("test_id", test.id)
      .eq("student_id", studentId),
  ]);

  const attemptsUsed = attempts.count ?? 0;
  const items: StudentQuestion[] = (questions.data ?? []).map((row) => ({
    id: row.id,
    type: row.question_type as QuestionType,
    prompt: row.prompt,
    choices: Array.isArray(row.choices) ? (row.choices as string[]) : null,
    points: row.points,
  }));

  if (test.shuffle_questions) shuffle(items);

  return {
    id: test.id,
    title: test.title,
    timeLimitMinutes: test.time_limit_minutes,
    passScore: test.pass_score,
    maxAttempts: test.max_attempts,
    attemptsUsed,
    attemptsRemaining: Math.max(0, test.max_attempts - attemptsUsed),
    status: test.status,
    questions: items,
  };
}

function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/** Server-side only: the graded form of a question, including its answer. */
export async function loadGradableQuestions(context: StudentContext, testId: string): Promise<TestQuestion[]> {
  const { supabase, familyId } = context;

  const { data, error } = await supabase
    .from("sisters_questions")
    .select(`id,question_type,prompt,choices,points,${secretQuestionColumns.join(",")}`)
    .eq("test_id", testId)
    .eq("family_id", familyId)
    .order("sort_order")
    .limit(200);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const record = row as unknown as {
      id: string;
      question_type: string;
      prompt: string;
      choices: unknown;
      points: number;
      answer: unknown;
      accepted_answers: unknown;
      explanation: string | null;
    };
    return {
      id: record.id,
      type: record.question_type as QuestionType,
      prompt: record.prompt,
      choices: Array.isArray(record.choices) ? (record.choices as string[]) : undefined,
      answer: (Array.isArray(record.answer) ? record.answer : String(record.answer ?? "")) as string | string[],
      acceptedAnswers: Array.isArray(record.accepted_answers) ? (record.accepted_answers as string[]) : undefined,
      explanation: record.explanation ?? undefined,
      points: record.points,
    };
  });
}
