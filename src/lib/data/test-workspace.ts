import "server-only";

import type { StudentTestData } from "@/components/student/student-test-runner";
import type { TestWorkspaceData } from "@/components/tests/test-workspace";
import { demoStudents, demoTests } from "@/lib/demo-data";
import { getParentContext, getStudentContext, isDemoContext } from "./context";
import { listTests, loadStudentTest } from "./tests";

function demoParentWorkspace(): TestWorkspaceData {
  return {
    demo: true,
    hasFamily: true,
    students: demoStudents.map((student) => ({ id: student.id, name: student.name, grade: student.grade })),
    subjects: ["영어", "수학", "국어", "과학", "역사"].map((name) => ({ id: `subject-${name}`, name })),
    tests: demoTests.map((test) => ({
      id: test.id,
      studentId: test.studentId,
      title: test.title,
      subject: test.subject,
      scheduledDate: test.scheduledDate,
      passScore: test.passScore,
      timeLimitMinutes: test.timeLimitMinutes,
      maxAttempts: test.maxAttempts,
      status: test.status,
      questionCount: test.questions.length,
      latestScore: test.latestScore ?? null,
      attemptCount: test.latestScore !== undefined ? 1 : 0,
    })),
  };
}

export async function loadTestWorkspace(): Promise<TestWorkspaceData> {
  if (isDemoContext()) return demoParentWorkspace();

  const result = await getParentContext();
  if (!result.ok) return { demo: false, hasFamily: false, tests: [], students: [], subjects: [] };

  const { supabase, familyId } = result.context;
  const [tests, students, subjects] = await Promise.all([
    listTests(result.context),
    supabase.from("sisters_students").select("id,name,grade").eq("family_id", familyId).eq("active", true).order("created_at"),
    supabase.from("sisters_subjects").select("id,name").eq("family_id", familyId).order("sort_order"),
  ]);

  return {
    demo: false,
    hasFamily: true,
    tests,
    students: (students.data ?? []).map((row) => ({ id: row.id, name: row.name, grade: row.grade })),
    subjects: (subjects.data ?? []).map((row) => ({ id: row.id, name: row.name })),
  };
}

function demoStudentTest(): StudentTestData {
  const test = demoTests[0];
  return {
    demo: true,
    signedIn: true,
    test: {
      id: test.id,
      title: test.title,
      timeLimitMinutes: test.timeLimitMinutes,
      passScore: test.passScore,
      maxAttempts: test.maxAttempts,
      attemptsUsed: 0,
      attemptsRemaining: test.maxAttempts,
      status: test.status,
      // Answers are stripped even in demo mode, so the demo cannot drift back
      // into shipping an answer key to the browser.
      questions: test.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        choices: question.choices ?? null,
        points: question.points,
      })),
    },
  };
}

export async function loadStudentTestData(): Promise<StudentTestData> {
  if (isDemoContext()) return demoStudentTest();

  const result = await getStudentContext();
  if (!result.ok) return { demo: false, signedIn: false, test: null };

  return { demo: false, signedIn: true, test: await loadStudentTest(result.context) };
}
