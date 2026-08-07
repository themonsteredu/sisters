import "server-only";

import type { AICapability } from "@/lib/domain/types";
import { logError } from "@/lib/observability/log";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Queues an AI job for the cron drainer.
 *
 * Submission analysis goes here rather than through the synchronous
 * /api/ai/[capability] path: it is slow, it must not block the student's
 * submit, and on repeated failure the drainer parks it as `manual_review`
 * rather than guessing — the AI never approves anything.
 *
 * Service-role only; 202608070001_tighten_rls.sql made sisters_ai_jobs
 * read-only for family members so a parent cannot inject a `result`.
 *
 * Known pacing constraint: vercel.json runs the drainer once a day on Hobby,
 * so a queued analysis can wait up to 24h.
 */
export async function enqueueAIJob(input: {
  familyId: string;
  capability: AICapability;
  payload: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("sisters_ai_jobs")
    .insert({
      family_id: input.familyId,
      capability: input.capability,
      payload: input.payload,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    logError("data/ai-jobs.enqueueAIJob", error, { capability: input.capability });
    return null;
  }
  return data?.id as string | undefined;
}
