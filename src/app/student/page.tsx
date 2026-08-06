import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { StudentHome } from "@/components/student/student-home";
import { LiveStudentWorkspace } from "@/components/student/live-student-workspace";
import { requireStudentWorkspace } from "@/lib/auth/student-workspace";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "오늘의 학습" };

export default async function StudentPage() {
  if (isDemoMode) return <AppShell role="student"><StudentHome /></AppShell>;

  const data = await requireStudentWorkspace();
  return <AppShell role="student" user={{ name: data.student.name, detail: `${data.student.grade}학년` }}><LiveStudentWorkspace data={data} section="today" /></AppShell>;
}
