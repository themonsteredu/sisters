"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BellOff, CalendarDays, CheckCheck, ClipboardCheck, FileQuestion, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { markAllReadAction } from "@/app/notifications/actions";
import { idleState } from "@/lib/forms/action-state";
import type { NotificationFeed } from "@/lib/data/notification-feed";

const eventIcons: Record<string, typeof Sparkles> = {
  plan_published: CalendarDays,
  submission_created: ClipboardCheck,
  review_decided: CheckCheck,
  test_published: FileQuestion,
  test_review: FileQuestion,
  test_graded: FileQuestion,
};

export function NotificationList({ data }: { data: NotificationFeed }) {
  const [state, submit, pending] = useActionState(markAllReadAction, idleState);

  if (!data.signedIn) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-black">로그인이 필요해요</h1>
        <Link href="/login" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-bold text-white">로그인하기</Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-violet-600">알림</p>
            {data.demo ? <Badge className="bg-amber-50 text-amber-700">데모</Badge> : null}
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">알림</h1>
          <p className="mt-2 text-sm text-slate-500">읽지 않은 알림 {data.unread}건</p>
        </div>
        {data.unread > 0 ? (
          <form action={submit}>
            <input type="hidden" name="role" value={data.role} />
            <Button type="submit" variant="secondary" disabled={pending}>
              <CheckCheck size={16} /> {pending ? "처리 중…" : "모두 읽음"}
            </Button>
          </form>
        ) : null}
      </div>

      {state.message ? (
        <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {state.message}
        </p>
      ) : null}

      <Card className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {data.items.length ? data.items.map((item) => {
            const Icon = eventIcons[item.eventType] ?? Sparkles;
            return (
              <div key={item.id} className={`flex gap-3 p-4 ${item.read ? "" : "bg-violet-50/40"}`}>
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.read ? "bg-slate-100 text-slate-500" : "bg-violet-100 text-violet-700"}`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{item.title}</strong>
                    {item.read ? null : <span className="size-1.5 rounded-full bg-violet-500" aria-label="읽지 않음" />}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.createdAtLabel}</p>
                </div>
              </div>
            );
          }) : (
            <div className="grid min-h-64 place-items-center p-8 text-center">
              <div>
                <BellOff size={36} className="mx-auto text-slate-300" />
                <p className="mt-3 font-bold text-slate-500">아직 알림이 없습니다.</p>
                <p className="mt-1 text-xs text-slate-400">계획 발행, 제출, 검수 결과가 여기에 쌓입니다.</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
