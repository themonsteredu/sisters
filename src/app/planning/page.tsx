import type { Metadata } from "next";
import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import { AppShell } from "@/components/shell/app-shell";
import { getParentSession } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { currentSeoulMonth, loadPlanningWorkspace } from "@/lib/data/planning";

export const metadata: Metadata = { title: "학습계획" };
export const dynamic = "force-dynamic";

const monthPattern = /^\d{4}-\d{2}$/;

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const selectedMonth = month && monthPattern.test(month) ? month : currentSeoulMonth();

  // Demo mode is a data source now, not a component fork — the same workspace
  // renders in both modes and the actions no-op behind isDemoMode.
  const [data, session] = await Promise.all([
    loadPlanningWorkspace(selectedMonth),
    isDemoMode ? Promise.resolve(null) : getParentSession(),
  ]);

  return (
    <AppShell
      role="parent"
      user={session ? { name: session.displayName ?? "부모님", detail: session.familyId ? "가족 학습 관리자" : "가족 미설정" } : undefined}
    >
      <PlanningWorkspace data={data} />
    </AppShell>
  );
}
