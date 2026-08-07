import "server-only";

import { isDemoMode } from "@/lib/config";
import { logError } from "@/lib/observability/log";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface AdminFamilyRow {
  id: string;
  name: string;
  plan: string;
  suspended: boolean;
  createdAt: string;
  studentCount: number;
  memberCount: number;
}

export interface AdminJobsSummary {
  notificationJobs: Record<string, number>;
  aiJobs: Record<string, number>;
  manualReview: Array<{ id: string; capability: string; lastError: string | null; createdAt: string }>;
  unsentNotifications: number;
}

function embeddedCount(value: unknown) {
  if (Array.isArray(value)) return (value[0] as { count?: number } | undefined)?.count ?? 0;
  return (value as { count?: number } | null)?.count ?? 0;
}

/** Operator views run on the service-role client behind requireAdmin(). */
export async function loadAdminFamilies(): Promise<AdminFamilyRow[]> {
  if (isDemoMode) {
    return [{ id: "family-demo", name: "데모 가족", plan: "beta", suspended: false, createdAt: new Date().toISOString(), studentCount: 2, memberCount: 1 }];
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("sisters_families")
    .select("id,name,plan,suspended,created_at,sisters_students(count),sisters_family_members(count)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    logError("data/admin.loadAdminFamilies", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    plan: row.plan,
    suspended: row.suspended,
    createdAt: row.created_at,
    studentCount: embeddedCount(row.sisters_students),
    memberCount: embeddedCount(row.sisters_family_members),
  }));
}

export async function loadAdminJobs(): Promise<AdminJobsSummary> {
  const empty: AdminJobsSummary = { notificationJobs: {}, aiJobs: {}, manualReview: [], unsentNotifications: 0 };
  if (isDemoMode) return empty;

  const admin = createSupabaseAdminClient();
  if (!admin) return empty;

  const [notificationJobs, aiJobs, manualReview, unsent] = await Promise.all([
    admin.from("sisters_notification_jobs").select("status").limit(2_000),
    admin.from("sisters_ai_jobs").select("status").limit(2_000),
    admin
      .from("sisters_ai_jobs")
      .select("id,capability,last_error,created_at")
      .eq("status", "manual_review")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("sisters_notification_jobs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "failed"]),
  ]);

  const tally = (rows: Array<{ status: string }> | null) =>
    (rows ?? []).reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {});

  return {
    notificationJobs: tally(notificationJobs.data),
    aiJobs: tally(aiJobs.data),
    manualReview: (manualReview.data ?? []).map((row) => ({
      id: row.id,
      capability: row.capability,
      lastError: row.last_error,
      createdAt: row.created_at,
    })),
    unsentNotifications: unsent.count ?? 0,
  };
}
