import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { LiveStudentWorkspace } from "@/components/student/live-student-workspace";
import { StudentHome } from "@/components/student/student-home";
import { requireStudentWorkspace } from "@/lib/auth/student-workspace";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "내 학습 기록" };

export default async function StudentProgressPage() {
  // Without this branch the demo bottom-nav's third tab ejected to /login,
  // because requireStudentWorkspace needs a service-role client that demo mode
  // does not configure. Matches the sibling routes /student and /student/tests.
  if (isDemoMode) return <AppShell role="student"><StudentHome /></AppShell>;

  const data = await requireStudentWorkspace();
  return <AppShell role="student" user={{ name: data.student.name, detail: `${data.student.grade}학년` }}><LiveStudentWorkspace data={data} section="progress" /></AppShell>;
}
