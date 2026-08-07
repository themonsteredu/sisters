import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ParentWorkspaceData } from "@/lib/auth/parent-workspace";

// Only the dashboard and reports still fall back here; planning, reviews and
// tests render their real workspaces against src/lib/data/*. This shrinks by
// one section per slice and is deleted once reports gains its own loader.
export type ParentSection = "dashboard" | "reports";

const sectionCopy: Record<ParentSection, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "부모 대시보드",
    title: "오늘 학습 현황",
    description: "현재 가족 공간에 저장된 실제 데이터만 표시합니다.",
  },
  reports: {
    eyebrow: "학습 리포트",
    title: "우리 가족의 학습 기록",
    description: "승인된 과제와 전체 과제를 기준으로 집계합니다.",
  },
};

function studentName(data: ParentWorkspaceData, studentId: string) {
  return data.students.find((student) => student.id === studentId)?.name ?? "학생";
}

function EmptyFamily({ data }: { data: ParentWorkspaceData }) {
  return (
    <Card className="mx-auto max-w-2xl p-7 md:p-10">
      <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-600">
        <UserPlus size={22} />
      </span>
      <Badge className="mt-5 bg-emerald-50 text-emerald-700">실제 계정 로그인됨</Badge>
      <h2 className="mt-4 text-2xl font-black">가족 공간을 먼저 만들어 주세요</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">
        {data.profile.email ?? data.profile.displayName} 계정에는 아직 연결된 가족과 학생이 없습니다.
        샘플 학생이나 가짜 학습 기록은 표시하지 않습니다.
      </p>
      <Link
        href="/onboarding"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
      >
        가족 설정 시작
      </Link>
    </Card>
  );
}

export function LiveParentWorkspace({ section, data }: { section: ParentSection; data: ParentWorkspaceData }) {
  const copy = sectionCopy[section];
  const completionRate = data.counts.allTasks
    ? Math.round((data.counts.approvedTasks / data.counts.allTasks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-600">{copy.eyebrow}</p>
            <Badge className="bg-emerald-50 text-emerald-700">운영 데이터</Badge>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{copy.description}</p>
        </div>
        <div className="text-sm text-slate-500">
          <strong className="text-slate-800">{data.profile.displayName}</strong>
          {data.family ? ` · ${data.family.name}` : " · 가족 미설정"}
        </div>
      </div>

      {!data.family ? <EmptyFamily data={data} /> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5">
              <Users className="text-slate-600" size={21} />
              <p className="mt-4 text-xs font-bold text-slate-400">학생</p>
              <strong className="mt-1 block text-2xl font-black">{data.students.length}명</strong>
            </Card>
            <Card className="p-5">
              <CalendarDays className="text-blue-600" size={21} />
              <p className="mt-4 text-xs font-bold text-slate-400">오늘 과제</p>
              <strong className="mt-1 block text-2xl font-black">{data.todayTasks.length}건</strong>
            </Card>
            <Card className="p-5">
              <ClipboardCheck className="text-amber-600" size={21} />
              <p className="mt-4 text-xs font-bold text-slate-400">검수 대기</p>
              <strong className="mt-1 block text-2xl font-black">{data.pendingSubmissions.length}건</strong>
            </Card>
            <Card className="p-5">
              <CheckCircle2 className="text-emerald-600" size={21} />
              <p className="mt-4 text-xs font-bold text-slate-400">전체 승인율</p>
              <strong className="mt-1 block text-2xl font-black">{completionRate}%</strong>
            </Card>
          </section>

          {section === "dashboard" && (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
              <Card className="overflow-hidden">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="font-black">오늘 할 일</h2>
                  <p className="mt-1 text-xs text-slate-400">오늘 날짜로 등록된 과제입니다.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {data.todayTasks.length ? data.todayTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-4">
                      <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <BookOpen size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-sm">{task.title}</strong>
                        <span className="text-xs text-slate-400">
                          {studentName(data, task.studentId)} · {task.estimatedMinutes}분
                        </span>
                      </div>
                      <Badge>{task.status}</Badge>
                    </div>
                  )) : <p className="p-8 text-center text-sm text-slate-400">오늘 등록된 과제가 없습니다.</p>}
                </div>
              </Card>
              <Card className="overflow-hidden">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="font-black">등록 학생</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {data.students.length ? data.students.map((student) => (
                    <div key={student.id} className="flex items-center gap-3 p-4">
                      <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600">
                        <GraduationCap size={18} />
                      </span>
                      <strong className="flex-1 text-sm">{student.name}</strong>
                      <span className="text-xs text-slate-400">{student.grade}학년</span>
                    </div>
                  )) : <p className="p-8 text-center text-sm text-slate-400">등록된 학생이 없습니다.</p>}
                </div>
              </Card>
            </div>
          )}

          {section === "reports" && (
            <Card className="p-6">
              <h2 className="font-black">실제 학습 누계</h2>
              <p className="mt-2 text-sm text-slate-500">총 {data.counts.allTasks}개 과제 중 {data.counts.approvedTasks}개가 승인되었습니다.</p>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
