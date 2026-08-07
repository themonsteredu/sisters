import "server-only";

import type { ReviewWorkspaceData } from "@/components/reviews/review-workspace";
import { demoStudents, demoSubmissions, demoTasks } from "@/lib/demo-data";
import { logError } from "@/lib/observability/log";
import { listPendingAttempts } from "./attempt-review";
import { getParentContext, isDemoContext } from "./context";
import { formatSubmittedAt, listPendingSubmissions } from "./submissions";

function demoWorkspace(): ReviewWorkspaceData {
  const pending = demoSubmissions.filter((submission) => !submission.parentDecision);
  return {
    demo: true,
    hasFamily: true,
    reviewedToday: demoSubmissions.length - pending.length,
    pendingAttempts: [],
    pending: pending.map((submission) => {
      const task = demoTasks.find((item) => item.id === submission.taskId);
      const student = demoStudents.find((item) => item.id === submission.studentId);
      return {
        id: submission.id,
        taskId: submission.taskId,
        studentId: submission.studentId,
        studentName: student?.name ?? "학생",
        taskTitle: task?.title ?? "학습",
        taskDetail: task?.detail ?? "",
        subject: task?.subject ?? "기타",
        scheduledDate: task?.scheduledDate ?? "",
        note: submission.note ?? null,
        elapsedMinutes: submission.elapsedMinutes ?? null,
        submittedAt: submission.submittedAt,
        submittedAtLabel: formatSubmittedAt(submission.submittedAt),
        aiReview: (submission.aiReview as unknown as Record<string, unknown>) ?? null,
        // Demo fixtures carry no real storage objects, so there is nothing to sign.
        imageUrls: [],
        decision: submission.parentDecision ?? null,
      };
    }),
  };
}

export async function loadReviewWorkspace(): Promise<ReviewWorkspaceData> {
  if (isDemoContext()) return demoWorkspace();

  const result = await getParentContext();
  if (!result.ok) {
    return { demo: false, hasFamily: false, pending: [], reviewedToday: 0, pendingAttempts: [] };
  }

  const { supabase, familyId } = result.context;

  const [pending, reviewed, pendingAttempts] = await Promise.all([
    listPendingSubmissions(result.context),
    supabase
      .from("sisters_submissions")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .not("parent_decision", "is", null),
    listPendingAttempts(result.context),
  ]);

  if (reviewed.error) logError("data/reviews.loadReviewWorkspace", reviewed.error, { familyId });

  return { demo: false, hasFamily: true, pending, reviewedToday: reviewed.count ?? 0, pendingAttempts };
}
