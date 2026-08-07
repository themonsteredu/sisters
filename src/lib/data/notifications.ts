import "server-only";

import { logError } from "@/lib/observability/log";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type NotificationChannel = "in_app" | "web_push" | "email" | "kakao";

export interface EnqueueNotificationInput {
  familyId: string;
  eventType: string;
  title: string;
  body: string;
  recipientUserId?: string | null;
  recipientStudentId?: string | null;
  /** Must be stable for the same logical event — it is the unique key. */
  dedupeKey: string;
  channels?: NotificationChannel[];
}

/**
 * Creates a notification and one delivery job per external channel.
 *
 * The cron drainer in /api/cron/jobs has always existed; until now nothing put
 * anything in these two tables, so every channel was dead code in production.
 *
 * Writes go through the service-role client: 202608070001_tighten_rls.sql made
 * sisters_notification_jobs read-only for family members.
 *
 * Enqueueing must never fail the operation that triggered it, so this logs and
 * returns instead of throwing.
 */
export async function enqueueNotification(input: EnqueueNotificationInput) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const channels = input.channels ?? ["in_app"];

  // dedupe_key is unique, so a retried operation reuses the existing row rather
  // than notifying twice.
  const { data: notification, error } = await admin
    .from("sisters_notifications")
    .upsert(
      {
        family_id: input.familyId,
        recipient_user_id: input.recipientUserId ?? null,
        recipient_student_id: input.recipientStudentId ?? null,
        event_type: input.eventType,
        title: input.title,
        body: input.body,
        channels,
        dedupe_key: input.dedupeKey,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    logError("data/notifications.enqueueNotification", error, { eventType: input.eventType });
    return null;
  }
  // Already existed — the jobs for it were created the first time.
  if (!notification) return null;

  const externalChannels = channels.filter((channel) => channel !== "in_app");
  if (externalChannels.length) {
    const { error: jobError } = await admin.from("sisters_notification_jobs").upsert(
      externalChannels.map((channel) => ({
        family_id: input.familyId,
        notification_id: notification.id,
        channel,
      })),
      { onConflict: "notification_id,channel", ignoreDuplicates: true },
    );
    if (jobError) logError("data/notifications.enqueueNotification", jobError, { notificationId: notification.id });
  }

  return notification.id as string;
}

export interface UnreadSummary {
  unread: number;
  pendingReviews: number;
}

export async function loadUnreadSummary(familyId: string, userId: string): Promise<UnreadSummary> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { unread: 0, pendingReviews: 0 };

  const [unread, pending] = await Promise.all([
    admin
      .from("sisters_notifications")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("recipient_user_id", userId)
      .is("read_at", null),
    admin
      .from("sisters_submissions")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .is("parent_decision", null),
  ]);

  return { unread: unread.count ?? 0, pendingReviews: pending.count ?? 0 };
}
