import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { StudentHome } from "@/components/student/student-home";
import { loadStudentHome } from "@/lib/data/student";

export const metadata: Metadata = { title: "오늘의 학습" };
export const dynamic = "force-dynamic";

export default async function StudentPage() {
  // Demo mode is handled inside loadStudentHome, so there is no page-level fork.
  const data = await loadStudentHome();

  return (
    <AppShell
      role="student"
      user={data.student ? { name: data.student.name, detail: "오늘의 학습" } : undefined}
    >
      <StudentHome data={data} />
    </AppShell>
  );
}
