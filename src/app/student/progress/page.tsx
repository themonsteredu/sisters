import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { LiveStudentWorkspace } from "@/components/student/live-student-workspace";
import { requireStudentWorkspace } from "@/lib/auth/student-workspace";

export const metadata: Metadata = { title: "내 학습 기록" };

export default async function StudentProgressPage() {
  const data = await requireStudentWorkspace();
  return <AppShell role="student" user={{ name: data.student.name, detail: `${data.student.grade}학년` }}><LiveStudentWorkspace data={data} section="progress" /></AppShell>;
}
