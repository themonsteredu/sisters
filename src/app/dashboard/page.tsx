import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";

export const metadata: Metadata = { title: "부모 대시보드" };

export default function DashboardPage() {
  return <AppShell><ParentDashboard /></AppShell>;
}
