import { logError, logInfo } from "@/lib/observability/log";
import { storageBucket } from "@/lib/data/submissions";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Vercel Hobby allows one run a day, so a single pass has to be able to drain a
// backlog rather than stopping at the first page.
const batchSize = 100;
const maxBatchesPerRun = 20;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: "Supabase 설정이 필요합니다." }, { status: 503 });

  const now = new Date().toISOString();
  let deleted = 0;
  let batches = 0;
  let remaining = false;

  while (batches < maxBatchesPerRun) {
    // Filter on delete_after, which submissions now stamp at creation time and
    // which sisters_assets_retention_idx actually covers. The previous query
    // joined sisters_submissions.submitted_at, an index the schema never had —
    // and matched nothing at all, because no asset rows were being written.
    const { data: assets, error } = await supabase
      .from("sisters_submission_assets")
      .select("id, storage_path")
      .is("deleted_at", null)
      .not("delete_after", "is", null)
      .lt("delete_after", now)
      .limit(batchSize);

    if (error) {
      logError("cron/retention", error);
      return Response.json({ error: "보존 정리에 실패했습니다." }, { status: 500 });
    }

    const rows = assets ?? [];
    if (!rows.length) break;

    const { error: storageError } = await supabase.storage
      .from(storageBucket)
      .remove(rows.map((asset) => asset.storage_path));
    if (storageError) {
      logError("cron/retention", storageError, { batch: batches });
      return Response.json({ error: "저장소 파일을 삭제하지 못했습니다.", deleted }, { status: 500 });
    }

    // Marked only after the objects are gone, so a mid-run failure retries the
    // same rows tomorrow instead of losing track of them.
    const { error: markError } = await supabase
      .from("sisters_submission_assets")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", rows.map((asset) => asset.id));
    if (markError) {
      logError("cron/retention", markError, { batch: batches });
      return Response.json({ error: "삭제 기록을 남기지 못했습니다.", deleted }, { status: 500 });
    }

    deleted += rows.length;
    batches += 1;
    if (rows.length < batchSize) break;
    remaining = batches >= maxBatchesPerRun;
  }

  // Never let a truncated run read as "everything was cleaned".
  if (remaining) logInfo("cron/retention", "batch cap reached; backlog remains", { deleted, maxBatchesPerRun });

  return Response.json({ deleted, batches, backlogRemaining: remaining });
}
