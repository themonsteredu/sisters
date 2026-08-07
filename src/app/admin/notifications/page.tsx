import type { Metadata } from "next";
import { AlertTriangle, Inbox } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { loadAdminJobs } from "@/lib/data/admin";

export const metadata: Metadata = { title: "작업 현황" };
export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  queued: "대기", running: "진행 중", sent: "발송됨", failed: "실패", skipped: "건너뜀",
  completed: "완료", manual_review: "수동 확인",
};

function Tally({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts);
  return (
    <Card className="p-5">
      <h2 className="font-black">{title}</h2>
      {entries.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {entries.map(([status, count]) => (
            <Badge key={status} className={status === "failed" || status === "manual_review" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}>
              {statusLabels[status] ?? status} {count}
            </Badge>
          ))}
        </div>
      ) : <p className="mt-3 text-sm text-slate-400">작업이 없습니다.</p>}
    </Card>
  );
}

export default async function AdminNotificationsPage() {
  const jobs = await loadAdminJobs();

  return (
    <AppShell role="admin">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold text-violet-600">운영</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">작업 큐 현황</h1>
          <p className="mt-2 text-sm text-slate-500">
            크론은 Hobby 플랜 제한에 맞춰 하루 한 번 실행됩니다. 대기 중인 작업은 다음 실행까지 최대 24시간 기다립니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Tally title="알림 작업" counts={jobs.notificationJobs} />
          <Tally title="AI 작업" counts={jobs.aiJobs} />
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Inbox size={18} className="text-slate-500" />
            <h2 className="font-black">미발송 알림 {jobs.unsentNotifications}건</h2>
          </div>
          <p className="mt-2 text-xs text-slate-400">대기 또는 실패 상태로 재시도를 기다리는 작업 수입니다.</p>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 p-5">
            <AlertTriangle size={18} className="text-amber-600" />
            <h2 className="font-black">수동 확인 대기 AI 작업 {jobs.manualReview.length}건</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {jobs.manualReview.length ? jobs.manualReview.map((job) => (
              <div key={job.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{job.capability}</strong>
                  <span className="text-xs text-slate-400">{job.createdAt.slice(0, 16).replace("T", " ")}</span>
                </div>
                {job.lastError ? <p className="mt-1 break-words text-xs text-rose-600">{job.lastError}</p> : null}
              </div>
            )) : <p className="p-8 text-center text-sm text-slate-400">재시도를 모두 소진한 작업이 없습니다.</p>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
