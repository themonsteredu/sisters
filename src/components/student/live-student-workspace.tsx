import { BookOpen, CheckCircle2, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { StudentWorkspaceData } from "@/lib/auth/student-workspace";

export function LiveStudentWorkspace({ data, section }: { data: StudentWorkspaceData; section: "today" | "tests" | "progress" }) {
  const completionRate = data.allTaskCount ? Math.round((data.approvedTaskCount / data.allTaskCount) * 100) : 0;
  const title = section === "today" ? "오늘의 학습" : section === "tests" ? "예정된 테스트" : "내 학습 기록";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-slate-600">{data.student.name} 학생</p>
          <Badge className="bg-emerald-50 text-emerald-700">운영 데이터</Badge>
        </div>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">현재 학생 계정에 배정된 실제 학습 기록만 표시합니다.</p>
      </div>

      {section === "today" && <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h2 className="font-black">오늘 할 일 {data.tasks.length}건</h2></div>
        <div className="divide-y divide-slate-100">
          {data.tasks.length ? data.tasks.map((task) => <div key={task.id} className="flex items-center gap-3 p-4">
            <BookOpen size={18} className="text-blue-600" />
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{task.title}</strong><span className="text-xs text-slate-400">{task.detail || `${task.estimatedMinutes}분 학습`}</span></div>
            <Badge>{task.status}</Badge>
          </div>) : <p className="p-8 text-center text-sm text-slate-400">오늘 배정된 학습이 없습니다.</p>}
        </div>
      </Card>}

      {section === "tests" && <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h2 className="font-black">응시할 테스트 {data.tests.length}건</h2></div>
        <div className="divide-y divide-slate-100">
          {data.tests.length ? data.tests.map((test) => <div key={test.id} className="flex items-center gap-3 p-4">
            <FileQuestion size={18} className="text-blue-600" />
            <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{test.title}</strong><span className="text-xs text-slate-400">{test.scheduledDate} · 합격 {test.passScore}점</span></div>
            <Badge>{test.status}</Badge>
          </div>) : <p className="p-8 text-center text-sm text-slate-400">예정된 테스트가 없습니다.</p>}
        </div>
      </Card>}

      {section === "progress" && <Card className="p-6">
        <CheckCircle2 size={22} className="text-emerald-600" />
        <p className="mt-4 text-sm font-bold text-slate-500">승인된 학습</p>
        <strong className="mt-1 block text-3xl font-black">{data.approvedTaskCount}/{data.allTaskCount}개</strong>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} /></div>
      </Card>}
    </div>
  );
}
