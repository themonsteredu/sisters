import "server-only";

import { randomUUID } from "node:crypto";
import { logError } from "@/lib/observability/log";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { buildSubmissionStoragePath } from "@/lib/uploads/storage-path";
import { recordAudit } from "./audit";
import type { ParentContext, StudentContext } from "./context";

export const materialsBucket = "sisters-materials";
export const maxMaterialBytes = 20 * 1024 * 1024;
export const maxMaterialsPerTask = 10;

export const materialMimeTypes = new Map<string, "pdf" | "image">([
  ["application/pdf", "pdf"],
  ["image/jpeg", "image"],
  ["image/png", "image"],
  ["image/webp", "image"],
]);

export interface TaskMaterial {
  id: string;
  taskId: string;
  title: string;
  kind: "pdf" | "image";
  sizeBytes: number;
  /** Short-lived signed URL; the bucket is private. */
  url: string | null;
}

function signer() {
  return createSupabaseAdminClient();
}

async function withSignedUrls(
  rows: Array<{ id: string; task_id: string; title: string; kind: string; size_bytes: number; storage_path: string }>,
): Promise<TaskMaterial[]> {
  const admin = signer();
  let urls: Record<string, string> = {};

  if (admin && rows.length) {
    const { data } = await admin.storage
      .from(materialsBucket)
      .createSignedUrls(rows.map((row) => row.storage_path), 60 * 30);
    urls = Object.fromEntries(
      (data ?? [])
        .map((item, index) => [rows[index]?.storage_path ?? "", item.signedUrl])
        .filter(([, url]) => typeof url === "string" && url.length > 0) as Array<[string, string]>,
    );
  }

  return rows.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    kind: row.kind as "pdf" | "image",
    sizeBytes: row.size_bytes,
    url: urls[row.storage_path] ?? null,
  }));
}

/** Materials for a set of tasks, keyed by task id. */
export async function listMaterialsByTask(
  context: ParentContext | StudentContext,
  taskIds: string[],
): Promise<Map<string, TaskMaterial[]>> {
  const result = new Map<string, TaskMaterial[]>();
  if (!taskIds.length) return result;

  const { data, error } = await context.supabase
    .from("sisters_task_materials")
    .select("id,task_id,title,kind,size_bytes,storage_path")
    .eq("family_id", context.familyId)
    .in("task_id", taskIds)
    .order("created_at")
    .limit(200);

  if (error) {
    logError("data/materials.listMaterialsByTask", error, { familyId: context.familyId });
    return result;
  }

  for (const material of await withSignedUrls(data ?? [])) {
    const bucket = result.get(material.taskId);
    if (bucket) bucket.push(material);
    else result.set(material.taskId, [material]);
  }
  return result;
}

export function materialStoragePath(context: ParentContext, taskId: string, fileName: string) {
  // Same family-first layout the storage policy authorizes on.
  return buildSubmissionStoragePath({
    familyId: context.familyId,
    studentId: "materials",
    taskId,
    fileName,
    uuid: randomUUID(),
  });
}

export async function attachMaterial(
  context: ParentContext,
  input: { taskId: string; title: string; mimeType: string; sizeBytes: number; storagePath: string },
) {
  const kind = materialMimeTypes.get(input.mimeType);
  if (!kind) throw new Error("지원하지 않는 파일 형식입니다.");

  const { supabase, familyId, userId } = context;

  // The task must belong to this family before anything is linked to it.
  const { data: task } = await supabase
    .from("sisters_tasks")
    .select("id")
    .eq("id", input.taskId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (!task) throw new Error("접근할 수 없는 할 일입니다.");

  const { count } = await supabase
    .from("sisters_task_materials")
    .select("id", { count: "exact", head: true })
    .eq("task_id", input.taskId)
    .eq("family_id", familyId);
  if ((count ?? 0) >= maxMaterialsPerTask) {
    throw new Error(`한 과제에 최대 ${maxMaterialsPerTask}개까지 첨부할 수 있습니다.`);
  }

  const { data, error } = await supabase
    .from("sisters_task_materials")
    .insert({
      family_id: familyId,
      task_id: input.taskId,
      title: input.title,
      kind,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      uploaded_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("자료를 저장하지 못했습니다.");

  await recordAudit(context, {
    action: "material_attached",
    entityType: "task",
    entityId: input.taskId,
    metadata: { materialId: data.id, kind },
  });

  return data.id as string;
}

export async function deleteMaterial(context: ParentContext, materialId: string) {
  const { supabase, familyId } = context;

  const { data: material } = await supabase
    .from("sisters_task_materials")
    .select("id,storage_path,task_id")
    .eq("id", materialId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (!material) throw new Error("자료를 찾을 수 없습니다.");

  const { error } = await supabase
    .from("sisters_task_materials")
    .delete()
    .eq("id", materialId)
    .eq("family_id", familyId);
  if (error) throw error;

  // Remove the object only after the row is gone, so a failure here leaves an
  // orphan blob rather than a row pointing at nothing.
  const admin = signer();
  if (admin) {
    const { error: storageError } = await admin.storage.from(materialsBucket).remove([material.storage_path]);
    if (storageError) logError("data/materials.deleteMaterial", storageError, { materialId });
  }

  await recordAudit(context, {
    action: "material_deleted",
    entityType: "task",
    entityId: material.task_id,
    metadata: { materialId },
  });
}

export async function removeUploadedMaterials(paths: string[]) {
  if (!paths.length) return;
  const admin = signer();
  if (!admin) return;
  const { error } = await admin.storage.from(materialsBucket).remove(paths);
  if (error) logError("data/materials.removeUploadedMaterials", error, { count: paths.length });
}
