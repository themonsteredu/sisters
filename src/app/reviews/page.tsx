import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { ReviewWorkspace } from "@/components/reviews/review-workspace";
import { LiveParentWorkspace } from "@/components/dashboard/live-parent-workspace";
import { requireParentWorkspace } from "@/lib/auth/parent-workspace";
import { isDemoMode } from "@/lib/config";

export const metadata: Metadata = { title: "제출검수" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  if (isDemoMode) return <AppShell><ReviewWorkspace /></AppShell>;

  const data = await requireParentWorkspace();
  return (
    <AppShell user={{ name: data.profile.displayName, detail: data.family?.name ?? "가족 미설정" }}>
      <LiveParentWorkspace section="reviews" data={data} />
    </AppShell>
  );
}
