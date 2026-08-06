import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { TestWorkspace } from "@/components/tests/test-workspace";

export const metadata: Metadata = { title: "테스트" };

export default function TestsPage() {
  return <AppShell><TestWorkspace /></AppShell>;
}
