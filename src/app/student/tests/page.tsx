import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { StudentTestRunner } from "@/components/student/student-test-runner";
import { loadStudentTestData } from "@/lib/data/test-workspace";

export const metadata: Metadata = { title: "테스트" };
export const dynamic = "force-dynamic";

export default async function StudentTestsPage() {
  const data = await loadStudentTestData();

  return (
    <AppShell role="student">
      <StudentTestRunner data={data} />
    </AppShell>
  );
}
