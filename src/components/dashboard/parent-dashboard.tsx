"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  ImageIcon,
  MoreHorizontal,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { useDemo } from "@/components/providers/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoMetrics, demoStudents } from "@/lib/demo-data";
import { statusLabel, subjectTone } from "@/lib/utils";

const week = [
  { day: "월", minseo: 72, jiwoo: 54 },
  { day: "화", minseo: 88, jiwoo: 78 },
  { day: "수", minseo: 64, jiwoo: 83 },
  { day: "목", minseo: 82, jiwoo: 76 },
  { day: "금", minseo: 50, jiwoo: 48 },
  { day: "토", minseo: 36, jiwoo: 30 },
  { day: "일", minseo: 20, jiwoo: 18 },
];

export function ParentDashboard() {
  const { tasks, submissions, selectedStudentId, setSelectedStudentId } = useDemo();
  const selected = demoStudents.find((student) => student.id === selectedStudentId) ?? demoStudents[0];
  const studentTasks = tasks.filter((task) => task.studentId === selected.id);
  const completed = studentTasks.filter((task) => task.status === "approved").length;
  const metrics = demoMetrics[selected.id];
  const pending = submissions.filter((submission) => !submission.parentDecision);

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div><p className="text-sm font-bold text-[#6353b7]">부모 대시보드</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-800 md:text-[2rem]">좋은 아침이에요, 정윤님</h1><p className="mt-2 text-sm text-slate-500">두 아이의 오늘 학습 흐름을 한눈에 확인하세요.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/planning"><Button variant="secondary"><CalendarPlus size={17} /> 계획 만들기</Button></Link><Link href="/tests"><Button><Sparkles size={17} /> AI 테스트 만들기</Button></Link></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[{ label: "오늘 완료", value: `${completed}/${studentTasks.length}`, detail: "할 일", icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" }, { label: "검수 대기", value: String(pending.length), detail: "새 제출물", icon: ImageIcon, tone: "bg-rose-50 text-rose-600" }, { label: "이번 주 학습", value: `${Math.round(metrics.studyMinutes / 60)}h`, detail: `${metrics.studyMinutes % 60}분`, icon: Clock3, tone: "bg-blue-50 text-blue-600" }, { label: "평균 점수", value: `${metrics.averageScore}`, detail: "지난주 대비 +4", icon: TrendingUp, tone: "bg-violet-50 text-violet-600" }].map((stat) => <Card key={stat.label} className="flex items-center gap-4 p-5"><span className={`grid size-12 place-items-center rounded-2xl ${stat.tone}`}><stat.icon size={22} /></span><div><p className="text-xs font-semibold text-slate-400">{stat.label}</p><div className="mt-1 flex items-baseline gap-2"><strong className="text-2xl font-black">{stat.value}</strong><span className="text-xs text-slate-400">{stat.detail}</span></div></div></Card>)}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_.8fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 md:p-6"><div><h2 className="text-lg font-black">오늘의 학습 현황</h2><p className="mt-1 text-xs text-slate-400">학생을 선택해 상세 일정을 확인하세요.</p></div><div className="flex rounded-xl bg-[#eceeed] p-1">{demoStudents.map((student) => <button key={student.id} onClick={() => setSelectedStudentId(student.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${selectedStudentId === student.id ? "bg-[#fafaf7] text-slate-800 shadow-sm" : "text-slate-500"}`}><span>{student.avatar}</span>{student.name}</button>)}</div></div>
          <div className="divide-y divide-slate-100">
            {studentTasks.map((task) => <div key={task.id} className="group flex items-center gap-3 p-4 transition hover:bg-slate-50/70 md:px-6"><span className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-black ${subjectTone(task.subject)}`}>{task.subject.slice(0, 1)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm">{task.title}</strong>{task.priority === "high" && <Badge className="bg-rose-50 text-rose-600">중요</Badge>}</div><p className="mt-1 truncate text-xs text-slate-400">{task.detail}</p></div><div className="hidden text-right sm:block"><p className="text-xs font-bold text-slate-600">{task.dueTime}</p><p className="mt-1 text-[11px] text-slate-400">{task.estimatedMinutes}분</p></div><Badge className={task.status === "approved" ? "bg-emerald-50 text-emerald-600" : task.status === "submitted" || task.status === "parent_review" ? "bg-amber-50 text-amber-700" : task.status === "in_progress" ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500"}>{statusLabel(task.status)}</Badge><button className="text-slate-300 hover:text-slate-600" aria-label="더 보기"><MoreHorizontal size={18} /></button></div>)}
          </div>
          <Link href="/planning" className="flex items-center justify-center gap-1 border-t border-slate-100 p-4 text-sm font-bold text-violet-600 hover:bg-violet-50">전체 일정 보기 <ChevronRight size={16} /></Link>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">이번 주 목표</h2><p className="mt-1 text-xs text-slate-400">8월 3일 – 9일</p></div><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><Target size={20} /></span></div>
          <div className="mt-7 flex items-center gap-6"><div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${selected.color} ${metrics.completionRate}%, #e4e7eb 0)` }}><div className="grid size-20 place-items-center rounded-full bg-[#fafaf7] text-center"><div><strong className="text-2xl font-black">{metrics.completionRate}%</strong><span className="block text-[10px] font-semibold text-slate-400">달성률</span></div></div></div><div className="flex-1 space-y-3"><div><div className="mb-1.5 flex justify-between text-xs"><span className="font-bold">학습 시간</span><span className="text-slate-400">{metrics.studyMinutes}/{selected.weeklyGoalMinutes}분</span></div><Progress value={(metrics.studyMinutes / selected.weeklyGoalMinutes) * 100} /></div><div className="flex items-center gap-2 rounded-xl bg-orange-50/70 p-3 text-xs font-bold text-orange-700"><Flame size={17} /> {selected.streak}일 연속 학습 중!</div></div></div>
          <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3 text-center"><strong className="text-lg">{metrics.onTimeRate}%</strong><span className="block text-[10px] text-slate-400">정시 수행률</span></div><div className="rounded-xl bg-slate-50 p-3 text-center"><strong className="text-lg">{metrics.averageScore}점</strong><span className="block text-[10px] text-slate-400">테스트 평균</span></div></div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">주간 학습 리듬</h2><p className="mt-1 text-xs text-slate-400">두 자녀의 일별 완료율 비교</p></div><div className="flex gap-3 text-[11px] font-semibold text-slate-500"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-violet-500" />민서</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-rose-400" />지우</span></div></div><div className="mt-7 flex h-44 items-end justify-between gap-3">{week.map((item) => <div key={item.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex w-full flex-1 items-end justify-center gap-1"><div className="w-3 rounded-t-md bg-violet-500/90 md:w-5" style={{ height: `${item.minseo}%` }} /><div className="w-3 rounded-t-md bg-rose-400/80 md:w-5" style={{ height: `${item.jiwoo}%` }} /></div><span className="text-[11px] font-bold text-slate-400">{item.day}</span></div>)}</div></Card>
        <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-lg font-black">확인이 필요해요</h2><p className="mt-1 text-xs text-slate-400">AI 분석 후 부모 검수를 기다립니다.</p></div><Link href="/reviews" className="text-xs font-bold text-violet-600">모두 보기</Link></div><div className="divide-y divide-slate-100">{pending.map((submission) => { const task = tasks.find((item) => item.id === submission.taskId)!; const student = demoStudents.find((item) => item.id === submission.studentId)!; return <Link href="/reviews" key={submission.id} className="flex items-center gap-3 p-4 hover:bg-slate-50"><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-lg">{student.avatar}</span><div className="min-w-0 flex-1"><div className="flex gap-2"><strong className="text-sm">{student.name}</strong><Badge className={subjectTone(task.subject)}>{task.subject}</Badge></div><p className="mt-1 truncate text-xs text-slate-400">{task.title} · {submission.aiReview?.completionPercent}% 작성 감지</p></div><ArrowRight size={17} className="text-slate-300" /></Link>; })}</div><div className="m-4 flex items-start gap-3 rounded-xl bg-violet-50 p-3"><TimerReset size={18} className="mt-0.5 shrink-0 text-violet-600" /><p className="text-xs leading-5 text-violet-700"><strong>보완 제안 1건</strong><br />민서의 과학 테스트 오답 3문항을 금요일에 다시 배정할 수 있어요.</p></div></Card>
      </section>
      <div className="sr-only"><BookOpen /></div>
    </div>
  );
}
