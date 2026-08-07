import "server-only";

import { logError } from "@/lib/observability/log";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getParentContext, getStudentContext, isDemoContext } from "./context";

export interface FeedItem {
  id: string;
  eventType: string;
  title: string;
  body: string;
  createdAtLabel: string;
  read: boolean;
}

export interface NotificationFeed {
  demo: boolean;
  signedIn: boolean;
  role: "parent" | "student";
  items: FeedItem[];
  unread: number;
}

function label(value: string) {
  // Formatted on the server: Node and Chrome disagree on the space before
  // 오전/오후, which would produce a hydration mismatch.
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" })
    .format(new Date(value));
}

export async function loadNotificationFeed(role: "parent" | "student"): Promise<NotificationFeed> {
  const empty: NotificationFeed = { demo: isDemoContext(), signedIn: false, role, items: [], unread: 0 };
  if (isDemoContext()) return { ...empty, signedIn: true };

  const admin = createSupabaseAdminClient();
  if (!admin) return empty;

  let query = admin
    .from("sisters_notifications")
    .select("id,event_type,title,body,created_at,read_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (role === "student") {
    const context = await getStudentContext();
    if (!context.ok) return empty;
    query = query.eq("family_id", context.context.familyId).eq("recipient_student_id", context.context.studentId);
  } else {
    const context = await getParentContext();
    if (!context.ok) return empty;
    query = query.eq("family_id", context.context.familyId).eq("recipient_user_id", context.context.userId);
  }

  const { data, error } = await query;
  if (error) {
    logError("data/notification-feed.loadNotificationFeed", error, { role });
    return { ...empty, signedIn: true };
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    title: row.title,
    body: row.body,
    createdAtLabel: label(row.created_at),
    read: Boolean(row.read_at),
  }));

  return { demo: false, signedIn: true, role, items, unread: items.filter((item) => !item.read).length };
}

/** Marks the caller's own notifications read; scoped to their family and identity. */
export async function markAllRead(role: "parent" | "student") {
  const admin = createSupabaseAdminClient();
  if (!admin) return 0;

  let query = admin.from("sisters_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);

  if (role === "student") {
    const context = await getStudentContext();
    if (!context.ok) return 0;
    query = query.eq("family_id", context.context.familyId).eq("recipient_student_id", context.context.studentId);
  } else {
    const context = await getParentContext();
    if (!context.ok) return 0;
    query = query.eq("family_id", context.context.familyId).eq("recipient_user_id", context.context.userId);
  }

  const { data, error } = await query.select("id");
  if (error) {
    logError("data/notification-feed.markAllRead", error, { role });
    return 0;
  }
  return data?.length ?? 0;
}
