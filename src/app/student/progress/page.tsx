import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { LiveStudentWorkspace } from "@/components/student/live-student-workspace";
import { StudentHome } from "@/components/student/student-home";
import { requireStudentWorkspace } from "@/lib/auth/student-workspace";
import { isDemoMode } from "@/lib/config";
import { loadStudentHome } from "@/lib/data/student";

export const metadata: Metadata = { title: "내 학습 기록" };
export const dynamic = "force-dynamic";

export default async function StudentProgressPage() {
  // Demo mode has no service-role client, so requireStudentWorkspace would eject
  // to /login — the bug that used to break the third bottom-nav tab.
  if (isDemoMode) {
    const data = await loadStudentHome();
    return (
      <AppShell role="student" user={data.student ? { name: data.student.name, detail: "내 학습 기록" } : undefined}>
        <StudentHome data={data} />
      </AppShell>
    );
  }

  const data = await requireStudentWorkspace();
  return (
    <AppShell role="student" user={{ name: data.student.name, detail: `${data.student.grade}학년` }}>
      <LiveStudentWorkspace data={data} section="progress" />
    </AppShell>
  );
}
