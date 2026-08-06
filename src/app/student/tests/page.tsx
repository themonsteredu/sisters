import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { StudentTestRunner } from "@/components/student/student-test-runner";

export const metadata: Metadata = { title: "영어 단어 테스트" };

export default function StudentTestsPage() {
  return <AppShell role="student"><StudentTestRunner /></AppShell>;
}
