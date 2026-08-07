import "server-only";

import { logError } from "@/lib/observability/log";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { ParentContext } from "./context";

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an audit row through the service-role client.
 *
 * 202608070001_tighten_rls.sql made sisters_audit_logs read-only for family
 * members, so the family client cannot be used here — and a parent can no
 * longer rewrite their own trail.
 *
 * Auditing must never fail the operation it records, so errors are logged and
 * swallowed rather than thrown.
 */
export async function recordAudit(context: ParentContext, entry: AuditEntry) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  const { error } = await admin.from("sisters_audit_logs").insert({
    family_id: context.familyId,
    actor_user_id: context.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    metadata: entry.metadata ?? {},
  });

  if (error) logError("data/audit", error, { action: entry.action, entityType: entry.entityType });
}
