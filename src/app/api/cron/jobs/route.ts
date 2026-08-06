import {
  analyzeSubmissionWithAI,
  generatePlanWithAI,
  generateTestWithAI,
  gradeFreeResponseWithAI,
  parseOutlineWithAI,
} from "@/lib/ai/service";
import { dispatchExternalNotifications, type NotificationPayload } from "@/lib/notifications/providers";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: "Supabase 설정이 필요합니다." }, { status: 503 });

  const [notificationResult, aiResult] = await Promise.all([
    processNotificationJobs(supabase),
    processAIJobs(supabase),
  ]);
  return Response.json({ notifications: notificationResult, ai: aiResult });
}

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

async function processNotificationJobs(supabase: AdminClient) {
  await supabase.from("sisters_notification_jobs").update({ status: "failed", locked_at: null, last_error: "작업 제한시간 초과" })
    .eq("status", "running").lt("locked_at", new Date(Date.now() - 10 * 60_000).toISOString());
  const { data: jobs } = await supabase.from("sisters_notification_jobs").select("id, notification_id, channel, attempt_count")
    .in("status", ["queued", "failed"]).lte("run_after", new Date().toISOString()).order("run_after").limit(10);
  const results = await Promise.all((jobs ?? []).map(async (job) => {
    const { data: claimed } = await supabase.from("sisters_notification_jobs").update({ status: "running", locked_at: new Date().toISOString(), attempt_count: job.attempt_count + 1 })
      .eq("id", job.id).in("status", ["queued", "failed"]).select("id").maybeSingle();
    if (!claimed) return "already_claimed";

    const { data: notification } = await supabase.from("sisters_notifications")
      .select("family_id, recipient_user_id, event_type, title, body").eq("id", job.notification_id).single();
    if (!notification?.recipient_user_id) {
      await supabase.from("sisters_notification_jobs").update({ status: "skipped", locked_at: null, last_error: "외부 채널 수신자가 없습니다." }).eq("id", job.id);
      return "skipped";
    }

    const [{ data: profile }, { data: pushes }] = await Promise.all([
      supabase.from("sisters_profiles").select("email, phone").eq("id", notification.recipient_user_id).single(),
      supabase.from("sisters_web_push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", notification.recipient_user_id),
    ]);
    const payload: NotificationPayload = {
      title: notification.title,
      body: notification.body,
      url: process.env.NEXT_PUBLIC_APP_URL,
      eventType: normalizeEventType(notification.event_type),
    };
    const recipient = {
      email: profile?.email ?? undefined,
      phone: profile?.phone ?? undefined,
      pushSubscriptions: (pushes ?? []).map((push) => ({ endpoint: push.endpoint, keys: { p256dh: push.p256dh, auth: push.auth } })),
    };
    const requested = [job.channel].filter((channel): channel is "web_push" | "email" | "kakao" => ["web_push", "email", "kakao"].includes(channel));
    let deliveries = await dispatchExternalNotifications(recipient, payload, requested);
    if (job.channel === "kakao" && !deliveries.some((delivery) => delivery.delivered)) {
      deliveries = deliveries.concat(await dispatchExternalNotifications(recipient, payload, ["web_push", "email"]));
    }
    const delivered = deliveries.some((delivery) => delivery.delivered);
    await supabase.from("sisters_notification_jobs").update(delivered
      ? { status: "sent", sent_at: new Date().toISOString(), locked_at: null, last_error: null }
      : { status: job.attempt_count + 1 >= 3 ? "skipped" : "failed", locked_at: null, run_after: new Date(Date.now() + 5 * 60_000).toISOString(), last_error: deliveries.map((item) => item.error).filter(Boolean).join("; ") })
      .eq("id", job.id);
    return delivered ? "sent" : "failed";
  }));
  return summarize(results);
}

async function processAIJobs(supabase: AdminClient) {
  await supabase.from("sisters_ai_jobs").update({ status: "failed", locked_at: null, last_error: "작업 제한시간 초과" })
    .eq("status", "running").lt("locked_at", new Date(Date.now() - 10 * 60_000).toISOString());
  const { data: jobs } = await supabase.from("sisters_ai_jobs").select("id, family_id, capability, payload, attempt_count, max_attempts")
    .in("status", ["queued", "failed"]).lte("run_after", new Date().toISOString()).order("run_after").limit(5);
  const results = [] as string[];
  for (const job of jobs ?? []) {
    const { data: claimed } = await supabase.from("sisters_ai_jobs").update({ status: "running", locked_at: new Date().toISOString(), attempt_count: job.attempt_count + 1 })
      .eq("id", job.id).in("status", ["queued", "failed"]).select("id").maybeSingle();
    if (!claimed) { results.push("already_claimed"); continue; }
    try {
      const context = typeof job.payload === "object" && job.payload && "context" in job.payload ? String(job.payload.context) : JSON.stringify(job.payload);
      const output = await runAIJob(job.capability, context, job.family_id);
      await supabase.from("sisters_ai_jobs").update({ status: "completed", result: output, locked_at: null, completed_at: new Date().toISOString(), last_error: null }).eq("id", job.id);
      results.push("completed");
    } catch (error) {
      const exhausted = job.attempt_count + 1 >= job.max_attempts;
      await supabase.from("sisters_ai_jobs").update({
        status: exhausted ? "manual_review" : "failed",
        locked_at: null,
        run_after: new Date(Date.now() + 60_000).toISOString(),
        last_error: error instanceof Error ? error.message : "AI 작업 실패",
      }).eq("id", job.id);
      results.push(exhausted ? "manual_review" : "failed");
    }
  }
  return summarize(results);
}

function runAIJob(capability: string, context: string, familyId: string) {
  if (capability === "parseCourseOutline") return parseOutlineWithAI(context, familyId);
  if (capability === "generateStudyPlan") return generatePlanWithAI(context, familyId);
  if (capability === "analyzeSubmission") return analyzeSubmissionWithAI(context, familyId);
  if (capability === "generateTest") return generateTestWithAI(context, familyId);
  if (capability === "gradeFreeResponse") return gradeFreeResponseWithAI(context, familyId);
  throw new Error(`지원하지 않는 AI 작업입니다: ${capability}`);
}

function normalizeEventType(eventType: string): NotificationPayload["eventType"] {
  if (eventType.includes("due")) return "due";
  if (eventType.includes("submission")) return "submission";
  if (eventType.includes("review")) return "review";
  if (eventType.includes("test")) return "test";
  if (eventType.includes("weekly")) return "weekly";
  return "plan";
}

function summarize(results: string[]) {
  return results.reduce<Record<string, number>>((summary, result) => ({ ...summary, [result]: (summary[result] ?? 0) + 1 }), { total: results.length });
}
