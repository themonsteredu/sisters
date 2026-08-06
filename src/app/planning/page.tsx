import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";

export const metadata: Metadata = { title: "학습계획" };

export default function PlanningPage() {
  return <AppShell><PlanningWorkspace /></AppShell>;
}
