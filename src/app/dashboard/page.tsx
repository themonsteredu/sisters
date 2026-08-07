import type { Metadata } from "next";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { AppShell } from "@/components/shell/app-shell";
import { getParentSession } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { loadDashboard } from "@/lib/data/dashboard";
import { loadUnreadSummary } from "@/lib/data/notifications";

export const metadata: Metadata = { title: "대시보드" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, session] = await Promise.all([
    loadDashboard(),
    isDemoMode ? Promise.resolve(null) : getParentSession(),
  ]);

  const summary = session?.familyId
    ? await loadUnreadSummary(session.familyId, session.actor.id)
    : { unread: 0, pendingReviews: 0 };

  return (
    <AppShell
      role="parent"
      user={session ? { name: session.displayName ?? "부모님", detail: session.familyId ? "가족 학습 관리자" : "가족 미설정" } : undefined}
      pendingReviews={summary.pendingReviews}
      unread={summary.unread}
    >
      <ParentDashboard data={data} />
    </AppShell>
  );
}
