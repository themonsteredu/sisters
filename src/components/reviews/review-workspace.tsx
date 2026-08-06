"use client";

import { useState } from "react";
import { AlertTriangle, BrainCircuit, CalendarPlus, Camera, Check, CheckCircle2, ChevronRight, Clock3, Eye, FileSearch, RotateCcw, Sparkles, X } from "lucide-react";
import { useDemo } from "@/components/providers/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoStudents } from "@/lib/demo-data";
import { subjectTone } from "@/lib/utils";

export function ReviewWorkspace() {
  const { tasks, submissions, reviewSubmission } = useDemo();
  const pending = submissions.filter((submission) => !submission.parentDecision);
  const [selectedId, setSelectedId] = useState(pending[0]?.id ?? submissions[0]?.id);
  const [feedback, setFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const selected = submissions.find((submission) => submission.id === selectedId) ?? pending[0];
  const task = tasks.find((item) => item.id === selected?.taskId);
  const student = demoStudents.find((item) => item.id === selected?.studentId);
  const analysis = selected?.aiReview;
  const reviewedCount = submissions.filter((submission) => submission.parentDecision).length;

  const flags = analysis?.flags ?? [];

  function decide(decision: "approved" | "rejected") {
    if (!selected) return;
    reviewSubmission(selected.id, decision, feedback);
    setNotice(decision === "approved" ? "제출물을 승인했습니다." : "반려하고 다음 학습 가능일 보완안을 만들었습니다.");
    setFeedback("");
    const next = pending.find((submission) => submission.id !== selected.id);
    if (next) setSelectedId(next.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-bold text-violet-600">제출검수</p><h1 className="mt-1 text-3xl font-black tracking-tight">AI가 먼저 살펴봤어요</h1><p className="mt-2 text-sm text-slate-500">분석은 참고용이며 승인과 반려는 부모님이 결정합니다.</p></div><div className="flex gap-2"><Badge className="bg-amber-50 px-3 py-2 text-amber-700">대기 {pending.length}건</Badge><Badge className="bg-emerald-50 px-3 py-2 text-emerald-700">오늘 완료 {reviewedCount}건</Badge></div></div>
      {notice && <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><span className="flex items-center gap-2"><CheckCircle2 size={18} />{notice}</span><button onClick={() => setNotice("")}><X size={16} /></button></div>}

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <Card className="h-fit overflow-hidden"><div className="border-b border-slate-100 p-4"><h2 className="font-black">검수 대기 목록</h2><p className="mt-1 text-xs text-slate-400">오래된 제출 순서</p></div><div className="divide-y divide-slate-100">{pending.length ? pending.map((submission) => { const itemTask = tasks.find((item) => item.id === submission.taskId)!; const itemStudent = demoStudents.find((item) => item.id === submission.studentId)!; return <button key={submission.id} onClick={() => setSelectedId(submission.id)} className={`flex w-full items-center gap-3 p-4 text-left transition ${selectedId === submission.id ? "bg-violet-50" : "hover:bg-slate-50"}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-lg shadow-sm">{itemStudent.avatar}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="text-sm">{itemStudent.name}</strong><Badge className={subjectTone(itemTask.subject)}>{itemTask.subject}</Badge></div><p className="mt-1 truncate text-xs text-slate-500">{itemTask.title}</p><p className="mt-1 text-[10px] text-slate-400">AI 완성도 {submission.aiReview?.completionPercent}% · {submission.elapsedMinutes}분</p></div><ChevronRight size={16} className="text-slate-300" /></button>; }) : <div className="p-8 text-center text-sm text-slate-400">모든 제출물을 확인했어요.</div>}</div></Card>

        {selected && task && analysis ? <div className="space-y-5">
          <Card className="overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5"><div className="flex gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-xl">{student?.avatar}</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{task.title}</h2><Badge className={subjectTone(task.subject)}>{task.subject}</Badge></div><p className="mt-1 text-xs text-slate-400">{student?.name} · {task.detail} · {selected.elapsedMinutes}분 학습</p></div></div><div className="flex items-center gap-2 text-xs text-slate-400"><Clock3 size={15} /> 오늘 오전 10:42</div></div>
            <div className="grid lg:grid-cols-[1.15fr_.85fr]"><section className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r"><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black"><Camera size={17} /> 제출 사진</h3><Badge>1 / 3</Badge></div><div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f1dd] p-6 shadow-inner"><div className="absolute inset-y-0 left-10 w-px bg-rose-300/70" /><div className="absolute inset-0 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #a5b4fc 28px)" }} /><div className="relative ml-7 rotate-[-1deg] text-slate-700"><p className="text-xs font-bold text-violet-700">쎈 수학 2-1 · 91쪽</p><div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 text-sm"><span>① y = 2x + 3</span><span>② y = -x + 5</span><span>③ x절편 = -2</span><span>④ 기울기 = 3</span><span className="text-rose-500">7번 다시 보기</span><span>⑧ y = ½x - 1</span></div><div className="mt-8 space-y-2 text-xs text-slate-500"><p>풀이) 두 점 (1, 2), (3, 6)을 지나므로</p><p>기울기 = (6-2)/(3-1) = 2</p><p className="rounded bg-amber-100/70 px-2 py-1">7번: 식 세우기까지 완료</p></div></div><button className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-white/90 text-slate-600 shadow"><Eye size={18} /></button></div><div className="mt-3 flex gap-2">{[1, 2, 3].map((index) => <button key={index} className={`grid aspect-[4/3] w-20 place-items-center rounded-lg border text-xs font-bold ${index === 1 ? "border-violet-500 bg-violet-50 text-violet-600" : "border-slate-200 bg-slate-50 text-slate-400"}`}>{index}쪽</button>)}</div>{selected.note && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><strong className="mb-1 block text-xs text-slate-400">학생 메모</strong>{selected.note}</div>}</section>
              <section className="p-5"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-black"><span className="grid size-8 place-items-center rounded-xl bg-violet-100 text-violet-700"><Sparkles size={16} /></span>AI 1차 분석</h3><Badge className="bg-violet-50 text-violet-700">{analysis.provider} · {analysis.model}</Badge></div><p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm leading-6 text-violet-900">{analysis.summary}</p><div className="mt-5 space-y-4"><div><div className="mb-2 flex justify-between text-xs"><span className="font-bold">작성 감지</span><strong>{analysis.completionPercent}%</strong></div><Progress value={analysis.completionPercent} indicatorClassName="bg-emerald-500" /></div><div><div className="mb-2 flex justify-between text-xs"><span className="font-bold">분석 신뢰도</span><strong>{Math.round(analysis.confidence * 100)}%</strong></div><Progress value={analysis.confidence * 100} /></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-slate-50 p-3"><span className="text-[10px] font-bold text-slate-400">감지 페이지</span><strong className="mt-1 block text-sm">{analysis.detectedPages[0]}~{analysis.detectedPages.at(-1)}쪽</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-[10px] font-bold text-slate-400">흐림 지수</span><strong className="mt-1 block text-sm">{Math.round(analysis.blurScore * 100)}% · 양호</strong></div></div>{flags.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2 text-xs font-black text-amber-800"><AlertTriangle size={16} /> 확인할 부분</div><ul className="mt-2 space-y-1 text-xs leading-5 text-amber-700">{flags.map((flag) => <li key={flag}>• {flag}</li>)}</ul></div>}</div></section></div>
          </Card>

          <Card className="p-5"><label className="block"><span className="mb-2 block text-sm font-black">학생에게 남길 피드백</span><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="잘한 점이나 다시 확인할 부분을 적어주세요." className="min-h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400" /></label><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button variant="danger" className="flex-1" onClick={() => decide("rejected")}><RotateCcw size={17} /> 반려·보완 요청</Button><Button className="flex-1" onClick={() => decide("approved")}><Check size={17} /> 학습 승인</Button></div><p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><BrainCircuit size={13} /> AI는 승인하지 않으며 부모님의 결정이 최종 기록됩니다.</p></Card>

          <Card className="flex flex-col gap-4 border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm"><CalendarPlus size={20} /></span><div className="flex-1"><h3 className="text-sm font-black">반려 시 자동 보완안</h3><p className="mt-1 text-xs leading-5 text-slate-500">다음 학습 가능일인 8월 7일에 “91쪽 7번 다시 풀기” 15분 과제를 제안합니다.</p></div><Button variant="secondary" className="shrink-0">일정 미리보기</Button></Card>
        </div> : <Card className="grid min-h-96 place-items-center"><div className="text-center"><FileSearch size={40} className="mx-auto text-slate-300" /><p className="mt-3 font-bold text-slate-500">검수할 제출물이 없습니다.</p></div></Card>}
      </div>
    </div>
  );
}
