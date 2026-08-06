import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { LiveParentWorkspace } from "@/components/dashboard/live-parent-workspace";
import { requireParentWorkspace } from "@/lib/auth/parent-workspace";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "부모 대시보드" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (isDemoMode) return <AppShell><ParentDashboard /></AppShell>;

  const data = await requireParentWorkspace();
  return (
    <AppShell user={{ name: data.profile.displayName, detail: data.family?.name ?? "가족 미설정" }}>
      <LiveParentWorkspace section="dashboard" data={data} />
    </AppShell>
  );
}
