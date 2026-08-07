import type { Metadata } from "next";
import { ReviewWorkspace } from "@/components/reviews/review-workspace";
import { AppShell } from "@/components/shell/app-shell";
import { getParentSession } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { loadReviewWorkspace } from "@/lib/data/reviews";

export const metadata: Metadata = { title: "제출검수" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const [data, session] = await Promise.all([
    loadReviewWorkspace(),
    isDemoMode ? Promise.resolve(null) : getParentSession(),
  ]);

  return (
    <AppShell
      role="parent"
      user={session ? { name: session.displayName ?? "부모님", detail: session.familyId ? "가족 학습 관리자" : "가족 미설정" } : undefined}
    >
      <ReviewWorkspace data={data} />
    </AppShell>
  );
}
