import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { TestWorkspace } from "@/components/tests/test-workspace";
import { getParentSession } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { loadTestWorkspace } from "@/lib/data/test-workspace";

export const metadata: Metadata = { title: "테스트" };
export const dynamic = "force-dynamic";

export default async function TestsPage() {
  const [data, session] = await Promise.all([
    loadTestWorkspace(),
    isDemoMode ? Promise.resolve(null) : getParentSession(),
  ]);

  return (
    <AppShell
      role="parent"
      user={session ? { name: session.displayName ?? "부모님", detail: session.familyId ? "가족 학습 관리자" : "가족 미설정" } : undefined}
    >
      <TestWorkspace data={data} />
    </AppShell>
  );
}
