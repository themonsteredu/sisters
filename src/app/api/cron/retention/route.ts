import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createSupabaseAdminClient();
  if (!supabase) return Response.json({ error: "Supabase 설정이 필요합니다." }, { status: 503 });

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60_000).toISOString();
  const { data: assets, error } = await supabase.from("sisters_submission_assets")
    .select("id, storage_path, sisters_submissions!inner(parent_decision, submitted_at)")
    .is("deleted_at", null).eq("sisters_submissions.parent_decision", "approved")
    .lt("sisters_submissions.submitted_at", cutoff).limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const paths = (assets ?? []).map((asset) => asset.storage_path);
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("sisters-submissions").remove(paths);
    if (storageError) return Response.json({ error: storageError.message }, { status: 500 });
    await supabase.from("sisters_submission_assets").update({ deleted_at: new Date().toISOString() })
      .in("id", (assets ?? []).map((asset) => asset.id));
  }
  return Response.json({ deleted: paths.length, cutoff });
}
