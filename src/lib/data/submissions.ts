import "server-only";

import { randomUUID } from "node:crypto";
import { logError } from "@/lib/observability/log";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { buildSubmissionStoragePath } from "@/lib/uploads/storage-path";
import { enqueueAIJob } from "./ai-jobs";
import { recordAudit } from "./audit";
import type { ParentContext, StudentContext } from "./context";
import { enqueueNotification } from "./notifications";

export const storageBucket = "sisters-submissions";

/** Matches the 90-day retention promised in the privacy policy. */
export const retentionDays = 90;

export const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "audio/webm", "audio/mpeg"]);
export const maxUploadBytes = 10 * 1024 * 1024;
export const maxFilesPerSubmission = 8;

export interface SubmissionAssetInput {
  kind: "image" | "audio";
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CreateSubmissionInput {
  taskId: string;
  note?: string;
  elapsedMinutes?: number;
  assets: SubmissionAssetInput[];
  /** Task status to move to; photo evidence waits on AI, otherwise on the parent. */
  nextTaskStatus: "submitted" | "parent_review";
}

function retentionTimestamp() {
  return new Date(Date.now() + retentionDays * 24 * 60 * 60_000).toISOString();
}

export function storagePathFor(context: StudentContext, taskId: string, fileName: string) {
  return buildSubmissionStoragePath({
    familyId: context.familyId,
    studentId: context.studentId,
    taskId,
    fileName,
    uuid: randomUUID(),
  });
}

/**
 * Writes the submission and its asset rows.
 *
 * The previous upload route put files in Storage and stopped there, so the rows
 * the retention cron joins on never existed and those images could never be
 * reclaimed. Every asset now gets a row and an explicit `delete_after`.
 */
export async function createSubmission(context: StudentContext, input: CreateSubmissionInput) {
  const { supabase, familyId, studentId } = context;

  // The task must belong to this student in this family. On the service-role
  // client this check is the authorization.
  const { data: task } = await supabase
    .from("sisters_tasks")
    .select("id")
    .eq("id", input.taskId)
    .eq("student_id", studentId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (!task) throw new Error("접근할 수 없는 할 일입니다.");

  const { data: submission, error } = await supabase
    .from("sisters_submissions")
    .insert({
      family_id: familyId,
      student_id: studentId,
      task_id: input.taskId,
      note: input.note || null,
      elapsed_minutes: input.elapsedMinutes ?? null,
    })
    .select("id")
    .single();
  if (error || !submission) throw error ?? new Error("제출물을 저장하지 못했습니다.");

  if (input.assets.length) {
    const { error: assetError } = await supabase.from("sisters_submission_assets").insert(
      input.assets.map((asset) => ({
        family_id: familyId,
        submission_id: submission.id,
        kind: asset.kind,
        storage_path: asset.storagePath,
        mime_type: asset.mimeType,
        size_bytes: asset.sizeBytes,
        delete_after: retentionTimestamp(),
      })),
    );
    if (assetError) {
      // Without asset rows the uploaded blobs would be orphaned again.
      await supabase.from("sisters_submissions").delete().eq("id", submission.id).eq("family_id", familyId);
      throw assetError;
    }
  }

  const { data: task2 } = await supabase
    .from("sisters_tasks")
    .update({ status: input.nextTaskStatus, updated_at: new Date().toISOString() })
    .eq("id", input.taskId)
    .eq("family_id", familyId)
    .select("title")
    .maybeSingle();

  // Tell the parents there is something to review, and queue the photo
  // analysis. Neither is allowed to fail the submission itself.
  const [{ data: members }, { data: student }] = await Promise.all([
    supabase.from("sisters_family_members").select("user_id").eq("family_id", familyId).limit(10),
    supabase.from("sisters_students").select("name").eq("id", studentId).maybeSingle(),
  ]);

  await Promise.all(
    (members ?? []).map((member) =>
      enqueueNotification({
        familyId,
        eventType: "submission_created",
        title: "새 학습 제출",
        body: `${student?.name ?? "학생"} · ${task2?.title ?? "학습"} 제출물이 검수를 기다립니다.`,
        recipientUserId: member.user_id,
        dedupeKey: `submission:${submission.id}:review:${member.user_id}`,
        channels: ["in_app", "web_push"],
      }),
    ),
  );

  if (input.assets.some((asset) => asset.kind === "image")) {
    await enqueueAIJob({
      familyId,
      capability: "analyzeSubmission",
      payload: { submissionId: submission.id, taskId: input.taskId, context: task2?.title ?? "학습 제출물" },
    });
  }

  return submission.id as string;
}

export async function removeUploadedObjects(paths: string[]) {
  if (!paths.length) return;
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const { error } = await admin.storage.from(storageBucket).remove(paths);
  if (error) logError("data/submissions.removeUploadedObjects", error, { count: paths.length });
}

export interface PendingSubmission {
  id: string;
  taskId: string;
  studentId: string;
  studentName: string;
  taskTitle: string;
  taskDetail: string;
  subject: string;
  scheduledDate: string;
  note: string | null;
  elapsedMinutes: number | null;
  submittedAt: string;
  /**
   * Preformatted on the server. Running Intl in the client component produced a
   * hydration mismatch: Node and Chrome disagree on the space character Korean
   * short times use before 오전/오후.
   */
  submittedAtLabel: string;
  aiReview: Record<string, unknown> | null;
  imageUrls: string[];
  decision: "approved" | "rejected" | null;
}

export function formatSubmittedAt(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function subjectNameOf(row: { sisters_subjects?: unknown }) {
  const embed = row.sisters_subjects as { name?: string } | { name?: string }[] | null | undefined;
  if (Array.isArray(embed)) return embed[0]?.name ?? "기타";
  return embed?.name ?? "기타";
}

/**
 * Submissions awaiting a parent decision, with short-lived signed URLs for the
 * private bucket. The bucket is not public, so the parent UI cannot link to
 * storage paths directly.
 */
export async function listPendingSubmissions(context: ParentContext, limit = 30): Promise<PendingSubmission[]> {
  const { supabase, familyId } = context;

  const { data, error } = await supabase
    .from("sisters_submissions")
    .select(`
      id, task_id, student_id, note, elapsed_minutes, submitted_at, ai_review, parent_decision,
      sisters_students(name),
      sisters_tasks(title, detail, scheduled_date, sisters_subjects(name)),
      sisters_submission_assets(storage_path, kind, deleted_at)
    `)
    .eq("family_id", familyId)
    .is("parent_decision", null)
    .order("submitted_at")
    .limit(limit);

  if (error) {
    logError("data/submissions.listPendingSubmissions", error, { familyId });
    return [];
  }

  const rows = data ?? [];
  const admin = createSupabaseAdminClient();

  return Promise.all(
    rows.map(async (row) => {
      const taskEmbed = (Array.isArray(row.sisters_tasks) ? row.sisters_tasks[0] : row.sisters_tasks) as
        | { title?: string; detail?: string; scheduled_date?: string; sisters_subjects?: unknown }
        | null;
      const studentEmbed = (Array.isArray(row.sisters_students) ? row.sisters_students[0] : row.sisters_students) as
        | { name?: string }
        | null;
      const assets = (row.sisters_submission_assets ?? []) as Array<{ storage_path: string; kind: string; deleted_at: string | null }>;
      const imagePaths = assets.filter((asset) => asset.kind === "image" && !asset.deleted_at).map((asset) => asset.storage_path);

      let imageUrls: string[] = [];
      if (admin && imagePaths.length) {
        const { data: signed } = await admin.storage.from(storageBucket).createSignedUrls(imagePaths, 60 * 10);
        imageUrls = (signed ?? [])
          .map((item) => item.signedUrl)
          .filter((url): url is string => typeof url === "string" && url.length > 0);
      }

      return {
        id: row.id,
        taskId: row.task_id,
        studentId: row.student_id,
        studentName: studentEmbed?.name ?? "학생",
        taskTitle: taskEmbed?.title ?? "학습",
        taskDetail: taskEmbed?.detail ?? "",
        subject: taskEmbed ? subjectNameOf(taskEmbed) : "기타",
        scheduledDate: taskEmbed?.scheduled_date ?? "",
        note: row.note,
        elapsedMinutes: row.elapsed_minutes,
        submittedAt: row.submitted_at,
        submittedAtLabel: formatSubmittedAt(row.submitted_at),
        aiReview: (row.ai_review as Record<string, unknown> | null) ?? null,
        imageUrls,
        decision: row.parent_decision,
      };
    }),
  );
}

export interface DecisionInput {
  submissionId: string;
  decision: "approved" | "rejected";
  feedback?: string;
  /** Set when a rejection schedules follow-up work. */
  remediation?: { date: string; title: string; detail: string; estimatedMinutes: number };
}

export async function recordDecision(context: ParentContext, input: DecisionInput) {
  const { supabase, familyId } = context;

  const { data: submission, error: loadError } = await supabase
    .from("sisters_submissions")
    .select("id, task_id, student_id, parent_decision, sisters_tasks(subject_id, plan_id, title)")
    .eq("id", input.submissionId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!submission) throw new Error("제출물을 찾을 수 없습니다.");
  if (submission.parent_decision) throw new Error("이미 검수를 마친 제출물입니다.");

  const { error } = await supabase
    .from("sisters_submissions")
    .update({
      parent_decision: input.decision,
      parent_feedback: input.feedback || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", input.submissionId)
    .eq("family_id", familyId);
  if (error) throw error;

  await supabase
    .from("sisters_tasks")
    .update({
      status: input.decision === "approved" ? "approved" : "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", submission.task_id)
    .eq("family_id", familyId);

  let remediationTaskId: string | null = null;
  if (input.decision === "rejected" && input.remediation) {
    const taskEmbed = (Array.isArray(submission.sisters_tasks) ? submission.sisters_tasks[0] : submission.sisters_tasks) as
      | { subject_id?: string; plan_id?: string | null }
      | null;

    if (taskEmbed?.subject_id) {
      const { data: created, error: remediationError } = await supabase
        .from("sisters_tasks")
        .insert({
          family_id: familyId,
          student_id: submission.student_id,
          plan_id: taskEmbed.plan_id ?? null,
          subject_id: taskEmbed.subject_id,
          task_type: "review",
          title: input.remediation.title,
          detail: input.remediation.detail,
          scheduled_date: input.remediation.date,
          estimated_minutes: input.remediation.estimatedMinutes,
          status: "remediation",
          source_id: submission.task_id,
        })
        .select("id")
        .single();
      if (remediationError) {
        // The decision itself already stands; losing the follow-up task should
        // not roll it back, but it must not pass silently either.
        logError("data/submissions.recordDecision", remediationError, { submissionId: input.submissionId });
      } else {
        remediationTaskId = created?.id ?? null;
      }
    }
  }

  await Promise.all([
    recordAudit(context, {
      action: input.decision === "approved" ? "submission_approved" : "submission_rejected",
      entityType: "submission",
      entityId: input.submissionId,
      metadata: { taskId: submission.task_id, remediationTaskId },
    }),
    // The student has no user account, so this is an in-app notification only;
    // the external channels have no address to deliver to.
    enqueueNotification({
      familyId,
      eventType: "review_decided",
      title: input.decision === "approved" ? "학습이 승인되었어요" : "학습을 다시 확인해 주세요",
      body: input.feedback?.trim() || (input.decision === "approved" ? "부모님이 학습을 승인했어요." : "부모님이 보완을 요청했어요."),
      recipientStudentId: submission.student_id,
      dedupeKey: `submission:${input.submissionId}:decision`,
      channels: ["in_app"],
    }),
  ]);

  return { remediationTaskId };
}
