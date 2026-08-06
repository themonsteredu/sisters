import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { TestWorkspace } from "@/components/tests/test-workspace";
import { LiveParentWorkspace } from "@/components/dashboard/live-parent-workspace";
import { requireParentWorkspace } from "@/lib/auth/parent-workspace";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "테스트" };
export const dynamic = "force-dynamic";

export default async function TestsPage() {
  if (isDemoMode) return <AppShell><TestWorkspace /></AppShell>;

  const data = await requireParentWorkspace();
  return (
    <AppShell user={{ name: data.profile.displayName, detail: data.family?.name ?? "가족 미설정" }}>
      <LiveParentWorkspace section="tests" data={data} />
    </AppShell>
  );
}
