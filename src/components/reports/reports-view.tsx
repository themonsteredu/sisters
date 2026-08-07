import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Timer, Trophy, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ReportsData } from "@/lib/data/reports";
import { subjectTone } from "@/lib/utils";

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Trophy; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <Icon size={18} className={tone} />
      <p className="mt-2 text-[10px] font-bold text-slate-400">{label}</p>
      <strong className="mt-0.5 block text-lg font-black">{value}</strong>
    </div>
  );
}

export function ReportsView({ data }: { data: ReportsData }) {
  if (!data.hasFamily) {
    return (
      <Card className="mx-auto max-w-2xl p-7 md:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-600"><UserPlus size={22} /></span>
        <h1 className="mt-5 text-2xl font-black">가족 공간을 먼저 만들어 주세요</h1>
        <Link href="/onboarding" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">가족 설정 시작</Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-violet-600">학습 리포트</p>
          {data.demo ? <Badge className="bg-amber-50 text-amber-700">데모</Badge> : <Badge className="bg-emerald-50 text-emerald-700">운영 데이터</Badge>}
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight">자녀별 학습 기록</h1>
        <p className="mt-2 text-sm text-slate-500">승인된 과제와 응시 기록을 기준으로 집계합니다.</p>
      </div>

      {data.students.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.students.map((student) => (
            <Card key={student.studentId} className="p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black">{student.name}</h2>
                <Badge>{student.totalTasks}개 과제</Badge>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="font-bold">완료율</span>
                  <strong>{student.completionRate}%</strong>
                </div>
                <Progress value={student.completionRate} indicatorClassName="bg-emerald-500" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric icon={Clock3} label="정시율" value={`${student.onTimeRate}%`} tone="text-blue-500" />
                <Metric icon={Timer} label="학습시간" value={`${student.studyMinutes}분`} tone="text-violet-500" />
                <Metric icon={Trophy} label="평균 점수" value={student.averageScore === null ? "—" : `${student.averageScore}점`} tone="text-amber-500" />
                <Metric icon={CheckCircle2} label="검수 대기" value={`${student.pendingReviews}건`} tone="text-slate-500" />
              </div>

              {student.weakSubjects.length ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-800">
                    <AlertTriangle size={15} /> 보완이 필요한 과목
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {student.weakSubjects.map((subject) => (
                      <Badge key={subject} className={subjectTone(subject)}>{subject}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {student.rejectionRate > 0 ? (
                <p className="mt-4 text-xs text-slate-400">반려·보완 비율 {student.rejectionRate}%</p>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-10 text-center text-sm text-slate-400">등록된 학생이 없습니다.</Card>
      )}
    </div>
  );
}
