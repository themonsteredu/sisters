"use client";

import Link from "next/link";
import { BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, GraduationCap, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardData } from "@/lib/data/dashboard";
import { statusLabel, subjectTone } from "@/lib/utils";

export function ParentDashboard({ data }: { data: DashboardData }) {
  if (!data.hasFamily) {
    return (
      <Card className="mx-auto max-w-2xl p-7 md:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-600"><UserPlus size={22} /></span>
        <h1 className="mt-5 text-2xl font-black">가족 공간을 먼저 만들어 주세요</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          아직 연결된 가족과 학생이 없습니다. 샘플 학생이나 가짜 학습 기록은 표시하지 않습니다.
        </p>
        <Link href="/onboarding" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">가족 설정 시작</Link>
      </Card>
    );
  }

  const completionRate = data.allTasks ? Math.round((data.approvedTasks / data.allTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-violet-600">부모 대시보드</p>
            {data.demo ? <Badge className="bg-amber-50 text-amber-700">데모</Badge> : <Badge className="bg-emerald-50 text-emerald-700">운영 데이터</Badge>}
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">오늘 학습 현황</h1>
          <p className="mt-2 text-sm text-slate-500">{data.today}</p>
        </div>
        {data.pendingReviews > 0 ? (
          <Link href="/reviews" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-4 text-sm font-bold text-amber-800">
            <ClipboardCheck size={17} /> 검수 대기 {data.pendingReviews}건
          </Link>
        ) : null}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <Users className="text-slate-600" size={21} />
          <p className="mt-4 text-xs font-bold text-slate-400">학생</p>
          <strong className="mt-1 block text-2xl font-black">{data.students.length}명</strong>
        </Card>
        <Card className="p-5">
          <CalendarDays className="text-blue-600" size={21} />
          <p className="mt-4 text-xs font-bold text-slate-400">오늘 과제</p>
          <strong className="mt-1 block text-2xl font-black">{data.tasks.length}건</strong>
        </Card>
        <Card className="p-5">
          <ClipboardCheck className="text-amber-600" size={21} />
          <p className="mt-4 text-xs font-bold text-slate-400">검수 대기</p>
          <strong className="mt-1 block text-2xl font-black">{data.pendingReviews}건</strong>
        </Card>
        <Card className="p-5">
          <CheckCircle2 className="text-emerald-600" size={21} />
          <p className="mt-4 text-xs font-bold text-slate-400">전체 승인율</p>
          <strong className="mt-1 block text-2xl font-black">{completionRate}%</strong>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-black">오늘 할 일</h2>
            <p className="mt-1 text-xs text-slate-400">오늘 날짜로 배정된 과제입니다.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {data.tasks.length ? data.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-4">
                <span className={`grid size-10 place-items-center rounded-xl ${subjectTone(task.subject)}`}><BookOpen size={18} /></span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{task.title}</strong>
                  <span className="text-xs text-slate-400">
                    {data.students.find((s) => s.id === task.studentId)?.name ?? "학생"} · {task.estimatedMinutes}분
                    {task.dueTime ? ` · ${task.dueTime}까지` : ""}
                  </span>
                </div>
                <Badge>{statusLabel(task.status)}</Badge>
              </div>
            )) : <p className="p-8 text-center text-sm text-slate-400">오늘 배정된 과제가 없습니다.</p>}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 p-5"><h2 className="font-black">자녀별 오늘 진도</h2></div>
          <div className="divide-y divide-slate-100">
            {data.students.length ? data.students.map((student) => (
              <div key={student.id} className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><GraduationCap size={18} /></span>
                  <strong className="flex-1 text-sm">{student.name}</strong>
                  <span className="text-xs text-slate-400">{student.todayDone}/{student.todayTotal}</span>
                </div>
                <Progress
                  value={student.todayTotal ? (student.todayDone / student.todayTotal) * 100 : 0}
                  className="mt-3"
                  indicatorClassName="bg-emerald-500"
                />
              </div>
            )) : <p className="p-8 text-center text-sm text-slate-400">등록된 학생이 없습니다.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
