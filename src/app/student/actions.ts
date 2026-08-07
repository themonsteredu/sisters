"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemoMode } from "@/lib/config";
import { getStudentContext } from "@/lib/data/context";
import {
  allowedMimeTypes,
  createSubmission,
  maxFilesPerSubmission,
  maxUploadBytes,
  removeUploadedObjects,
  storageBucket,
  storagePathFor,
  type SubmissionAssetInput,
} from "@/lib/data/submissions";
import { actionFailure as fail, type ActionState } from "@/lib/forms/action-state";
import { logError } from "@/lib/observability/log";

const metaSchema = z.object({
  taskId: z.string().min(1, "할 일을 찾을 수 없습니다."),
  note: z.string().trim().max(2_000).optional(),
  elapsedMinutes: z.coerce.number().int().min(0).max(600).optional(),
  requiresPhoto: z.coerce.boolean().optional(),
});

/**
 * One action for the whole submission: files, note and elapsed time.
 *
 * next.config.ts already allows a 10mb server-action body and the client
 * re-encodes photos with sanitizeImage before sending, so this does not need a
 * separate binary upload route. The previous route uploaded to Storage without
 * ever writing sisters_submissions / sisters_submission_assets rows, which is
 * why the retention job could never reclaim those files.
 */
export async function submitTaskAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = metaSchema.safeParse({
    taskId: formData.get("taskId"),
    note: formData.get("note") || undefined,
    elapsedMinutes: formData.get("elapsedMinutes") || undefined,
    requiresPhoto: formData.get("requiresPhoto") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "제출 내용을 확인해 주세요.");

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (parsed.data.requiresPhoto && !files.length) {
    return fail("학습 사진을 한 장 이상 첨부해 주세요.");
  }
  if (files.length > maxFilesPerSubmission) {
    return fail(`한 번에 최대 ${maxFilesPerSubmission}개까지 첨부할 수 있습니다.`);
  }
  for (const file of files) {
    if (!allowedMimeTypes.has(file.type)) return fail("지원하지 않는 파일 형식입니다.");
    if (file.size > maxUploadBytes) return fail("파일 한 개가 10MB를 넘을 수 없습니다.");
  }

  if (isDemoMode) {
    return { ok: true, message: `데모 모드입니다. 제출 내용(사진 ${files.length}장)이 저장되지는 않습니다.` };
  }

  const result = await getStudentContext();
  if (!result.ok) return fail(result.message);
  const context = result.context;

  // Upload first, then write rows. If a row insert fails the uploaded objects
  // are removed so Storage does not accumulate files with no record.
  const uploaded: string[] = [];
  const assets: SubmissionAssetInput[] = [];

  try {
    for (const file of files) {
      const path = storagePathFor(context, parsed.data.taskId, file.name);
      const { error } = await context.supabase.storage
        .from(storageBucket)
        .upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: "3600", upsert: false });
      if (error) throw error;

      uploaded.push(path);
      assets.push({
        kind: file.type.startsWith("audio/") ? "audio" : "image",
        storagePath: path,
        mimeType: file.type,
        sizeBytes: file.size,
      });
    }

    await createSubmission(context, {
      taskId: parsed.data.taskId,
      note: parsed.data.note,
      elapsedMinutes: parsed.data.elapsedMinutes,
      assets,
      // Photo evidence goes to AI analysis first; everything else waits on the
      // parent directly. AI never approves — see the cron job processor.
      nextTaskStatus: assets.some((asset) => asset.kind === "image") ? "submitted" : "parent_review",
    });
  } catch (error) {
    await removeUploadedObjects(uploaded);
    logError("student/submitTaskAction", error, { taskId: parsed.data.taskId });
    return fail(error instanceof Error && error.message === "접근할 수 없는 할 일입니다."
      ? error.message
      : "제출하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  revalidatePath("/student");
  revalidatePath("/reviews");
  revalidatePath("/dashboard");
  return { ok: true, message: "학습을 제출했습니다. 부모님 확인을 기다려 주세요." };
}
