import type { Metadata } from "next";
import { LiveParentWorkspace } from "@/components/dashboard/live-parent-workspace";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { AppShell } from "@/components/shell/app-shell";
import { requireParentWorkspace } from "@/lib/auth/parent-workspace";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "학습 리포트" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  if (isDemoMode) return <AppShell><ParentDashboard /></AppShell>;

  const data = await requireParentWorkspace();
  return (
    <AppShell user={{ name: data.profile.displayName, detail: data.family?.name ?? "가족 미설정" }}>
      <LiveParentWorkspace section="reports" data={data} />
    </AppShell>
  );
}
