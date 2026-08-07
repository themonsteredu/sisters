import type { Metadata } from "next";
import { NotificationList } from "@/components/notifications/notification-list";
import { AppShell } from "@/components/shell/app-shell";
import { getParentSession } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { loadNotificationFeed } from "@/lib/data/notification-feed";

export const metadata: Metadata = { title: "알림" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: rawRole } = await searchParams;
  const role = rawRole === "student" ? "student" : "parent";

  const [data, session] = await Promise.all([
    loadNotificationFeed(role),
    isDemoMode || role === "student" ? Promise.resolve(null) : getParentSession(),
  ]);

  return (
    <AppShell
      role={role}
      user={session ? { name: session.displayName ?? "부모님", detail: "가족 학습 관리자" } : undefined}
      unread={data.unread}
    >
      <NotificationList data={data} />
    </AppShell>
  );
}
