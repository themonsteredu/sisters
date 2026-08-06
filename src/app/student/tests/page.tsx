import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { StudentTestRunner } from "@/components/student/student-test-runner";
import { LiveStudentWorkspace } from "@/components/student/live-student-workspace";
import { requireStudentWorkspace } from "@/lib/auth/student-workspace";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "영어 단어 테스트" };

export default async function StudentTestsPage() {
  if (isDemoMode) return <AppShell role="student"><StudentTestRunner /></AppShell>;

  const data = await requireStudentWorkspace();
  return <AppShell role="student" user={{ name: data.student.name, detail: `${data.student.grade}학년` }}><LiveStudentWorkspace data={data} section="tests" /></AppShell>;
}
