"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle, BrainCircuit, Camera, Check, CheckCircle2, ChevronRight,
  Clock3, FileSearch, RotateCcw, Sparkles, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { reviewSubmissionAction } from "@/app/reviews/actions";
import { idleState, type ActionState } from "@/lib/forms/action-state";
import type { PendingAttempt } from "@/lib/data/attempt-review";
import type { PendingSubmission } from "@/lib/data/submissions";
import { AttemptGrader } from "./attempt-grader";
import { subjectTone } from "@/lib/utils";

export interface ReviewWorkspaceData {
  demo: boolean;
  hasFamily: boolean;
  pending: PendingSubmission[];
  reviewedToday: number;
  pendingAttempts: PendingAttempt[];
}

interface AiReview {
  summary?: string;
  completionPercent?: number;
  confidence?: number;
  blurScore?: number;
  detectedPages?: string[];
  flags?: string[];
  provider?: string;
  model?: string;
}

export function ReviewWorkspace({ data }: { data: ReviewWorkspaceData }) {
  const [selectedId, setSelectedId] = useState<string | null>(data.pending[0]?.id ?? null);
  const [feedback, setFeedback] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [notice, setNotice] = useState<ActionState>(idleState);

  const [state, submit, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await reviewSubmissionAction(previous, formData);
      if (result.ok) {
        setNotice(result);
        setFeedback("");
        // Move to the next item in the queue; the server revalidate refreshes
        // the list itself.
        const remaining = data.pending.filter((item) => item.id !== formData.get("submissionId"));
        setSelectedId(remaining[0]?.id ?? null);
        setActiveImage(0);
      }
      return result;
    },
    idleState,
  );

  const selected = data.pending.find((item) => item.id === selectedId) ?? data.pending[0] ?? null;
  const analysis = (selected?.aiReview ?? null) as AiReview | null;
  const flags = analysis?.flags ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-violet-600">제출검수</p>
            {data.demo ? <Badge className="bg-amber-50 text-amber-700">데모 · 저장 안 됨</Badge> : <Badge className="bg-emerald-50 text-emerald-700">운영 데이터</Badge>}
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">학생이 올린 학습을 확인하세요</h1>
          <p className="mt-2 text-sm text-slate-500">AI 분석은 참고용이며 승인과 반려는 부모님이 결정합니다.</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-amber-50 px-3 py-2 text-amber-700">대기 {data.pending.length}건</Badge>
          <Badge className="bg-emerald-50 px-3 py-2 text-emerald-700">검수 완료 {data.reviewedToday}건</Badge>
        </div>
      </div>

      {notice.message ? (
        <div role="status" className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          <span className="flex items-center gap-2"><CheckCircle2 size={18} />{notice.message}</span>
          <button type="button" onClick={() => setNotice(idleState)} aria-label="알림 닫기"><X size={16} /></button>
        </div>
      ) : null}

      <AttemptGrader attempts={data.pendingAttempts} />

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <Card className="h-fit overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-black">검수 대기 목록</h2>
            <p className="mt-1 text-xs text-slate-400">오래된 제출 순서</p>
          </div>
          <div className="divide-y divide-slate-100">
            {data.pending.length ? data.pending.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setSelectedId(item.id); setActiveImage(0); }}
                className={`flex w-full items-center gap-3 p-4 text-left transition ${selected?.id === item.id ? "bg-violet-50" : "hover:bg-slate-50"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm">{item.studentName}</strong>
                    <Badge className={subjectTone(item.subject)}>{item.subject}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{item.taskTitle}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {item.elapsedMinutes ? `${item.elapsedMinutes}분 · ` : ""}사진 {item.imageUrls.length}장
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-slate-300" />
              </button>
            )) : <div className="p-8 text-center text-sm text-slate-400">모든 제출물을 확인했어요.</div>}
          </div>
        </Card>

        {selected ? (
          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black">{selected.taskTitle}</h2>
                    <Badge className={subjectTone(selected.subject)}>{selected.subject}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {selected.studentName}{selected.taskDetail ? ` · ${selected.taskDetail}` : ""}
                    {selected.elapsedMinutes ? ` · ${selected.elapsedMinutes}분 학습` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock3 size={15} /> {selected.submittedAtLabel}
                </div>
              </div>

              <div className="grid lg:grid-cols-[1.15fr_.85fr]">
                <section className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-black"><Camera size={17} /> 제출 사진</h3>
                    {selected.imageUrls.length ? <Badge>{activeImage + 1} / {selected.imageUrls.length}</Badge> : null}
                  </div>
                  {selected.imageUrls.length ? (
                    <>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <Image
                          src={selected.imageUrls[activeImage]}
                          alt={`${selected.taskTitle} 제출 사진 ${activeImage + 1}`}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>
                      {selected.imageUrls.length > 1 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selected.imageUrls.map((_, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setActiveImage(index)}
                              className={`grid aspect-[4/3] w-20 place-items-center rounded-lg border text-xs font-bold ${index === activeImage ? "border-violet-500 bg-violet-50 text-violet-600" : "border-slate-200 bg-slate-50 text-slate-400"}`}
                            >
                              {index + 1}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
                      첨부된 사진이 없습니다.
                    </div>
                  )}
                  {selected.note ? (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      <strong className="mb-1 block text-xs text-slate-400">학생 메모</strong>{selected.note}
                    </div>
                  ) : null}
                </section>

                <section className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-black">
                      <span className="grid size-8 place-items-center rounded-xl bg-violet-100 text-violet-700"><Sparkles size={16} /></span>AI 1차 분석
                    </h3>
                    {analysis?.provider ? <Badge className="bg-violet-50 text-violet-700">{analysis.provider} · {analysis.model}</Badge> : null}
                  </div>

                  {analysis ? (
                    <>
                      <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm leading-6 text-violet-900">{analysis.summary}</p>
                      <div className="mt-5 space-y-4">
                        {typeof analysis.completionPercent === "number" ? (
                          <div>
                            <div className="mb-2 flex justify-between text-xs"><span className="font-bold">작성 감지</span><strong>{analysis.completionPercent}%</strong></div>
                            <Progress value={analysis.completionPercent} indicatorClassName="bg-emerald-500" />
                          </div>
                        ) : null}
                        {typeof analysis.confidence === "number" ? (
                          <div>
                            <div className="mb-2 flex justify-between text-xs"><span className="font-bold">분석 신뢰도</span><strong>{Math.round(analysis.confidence * 100)}%</strong></div>
                            <Progress value={analysis.confidence * 100} />
                          </div>
                        ) : null}
                        {flags.length > 0 ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-800"><AlertTriangle size={16} /> 확인할 부분</div>
                            <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-700">
                              {flags.map((flag) => <li key={flag}>• {flag}</li>)}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                      아직 AI 분석이 없습니다. 사진을 직접 확인한 뒤 승인 또는 반려해 주세요.
                    </p>
                  )}
                </section>
              </div>
            </Card>

            <Card className="p-5">
              <form action={submit}>
                <input type="hidden" name="submissionId" value={selected.id} />
                <input type="hidden" name="taskTitle" value={selected.taskTitle} />
                <label className="block">
                  <span className="mb-2 block text-sm font-black">학생에게 남길 피드백</span>
                  <textarea
                    name="feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="잘한 점이나 다시 확인할 부분을 적어주세요."
                    className="min-h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400"
                  />
                </label>

                {state.message && !state.ok ? (
                  <p role="status" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{state.message}</p>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" name="decision" value="rejected" variant="danger" className="flex-1" disabled={pending}>
                    <RotateCcw size={17} /> 반려·보완 요청
                  </Button>
                  <Button type="submit" name="decision" value="approved" className="flex-1" disabled={pending}>
                    <Check size={17} /> 학습 승인
                  </Button>
                </div>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <BrainCircuit size={13} /> AI는 승인하지 않으며 부모님의 결정이 최종 기록됩니다.
                </p>
              </form>
            </Card>
          </div>
        ) : (
          <Card className="grid min-h-96 place-items-center">
            <div className="text-center">
              <FileSearch size={40} className="mx-auto text-slate-300" />
              <p className="mt-3 font-bold text-slate-500">검수할 제출물이 없습니다.</p>
              <p className="mt-1 text-xs text-slate-400">학생이 학습을 제출하면 여기에 나타납니다.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
