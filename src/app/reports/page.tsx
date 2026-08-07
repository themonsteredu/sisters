import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/reports-view";
import { AppShell } from "@/components/shell/app-shell";
import { getParentSession } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { loadReports } from "@/lib/data/reports";

export const metadata: Metadata = { title: "학습 리포트" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [data, session] = await Promise.all([
    loadReports(),
    isDemoMode ? Promise.resolve(null) : getParentSession(),
  ]);

  return (
    <AppShell
      role="parent"
      user={session ? { name: session.displayName ?? "부모님", detail: session.familyId ? "가족 학습 관리자" : "가족 미설정" } : undefined}
    >
      <ReportsView data={data} />
    </AppShell>
  );
}
