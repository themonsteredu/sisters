import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { ReviewWorkspace } from "@/components/reviews/review-workspace";

export const metadata: Metadata = { title: "제출검수" };

export default function ReviewsPage() {
  return <AppShell><ReviewWorkspace /></AppShell>;
}
