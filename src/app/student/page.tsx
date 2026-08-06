import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { StudentHome } from "@/components/student/student-home";

export const metadata: Metadata = { title: "오늘의 학습" };

export default function StudentPage() {
  return <AppShell role="student"><StudentHome /></AppShell>;
}
