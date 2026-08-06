import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import { LiveParentWorkspace } from "@/components/dashboard/live-parent-workspace";
import { requireParentWorkspace } from "@/lib/auth/parent-workspace";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "학습계획" };
export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  if (isDemoMode) return <AppShell><PlanningWorkspace /></AppShell>;

  const data = await requireParentWorkspace();
  return (
    <AppShell user={{ name: data.profile.displayName, detail: data.family?.name ?? "가족 미설정" }}>
      <LiveParentWorkspace section="planning" data={data} />
    </AppShell>
  );
}
