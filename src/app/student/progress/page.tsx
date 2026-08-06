import type { Metadata } from "next";
import { Flame, Star, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = { title: "내 학습 기록" };

export default function StudentProgressPage() {
  return <AppShell role="student"><div className="space-y-6"><div><p className="text-sm font-bold text-violet-600">내 학습 기록</p><h1 className="mt-1 text-3xl font-black">조금씩 쌓인 멋진 성장</h1><p className="mt-2 text-sm text-slate-500">민서가 스스로 만든 이번 달 기록이에요.</p></div><div className="grid gap-4 md:grid-cols-4">{[{ icon: Flame, label: "연속 학습", value: "12일", tone: "bg-orange-50 text-orange-600" }, { icon: Target, label: "완료한 할 일", value: "48개", tone: "bg-violet-50 text-violet-600" }, { icon: Trophy, label: "테스트 평균", value: "87점", tone: "bg-amber-50 text-amber-600" }, { icon: Star, label: "받은 칭찬", value: "16개", tone: "bg-rose-50 text-rose-600" }].map((item) => <Card key={item.label} className="p-5"><span className={`grid size-10 place-items-center rounded-xl ${item.tone}`}><item.icon size={20} /></span><p className="mt-4 text-xs font-bold text-slate-400">{item.label}</p><strong className="mt-1 block text-2xl font-black">{item.value}</strong></Card>)}</div><Card className="p-5 md:p-7"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">과목별 성장</h2><p className="mt-1 text-xs text-slate-400">8월 학습 완료율과 테스트 점수</p></div><Badge>2026년 8월</Badge></div><div className="mt-6 space-y-5">{[{ name: "영어", value: 91, color: "bg-violet-500", note: "단어가 가장 많이 늘었어요" }, { name: "수학", value: 84, color: "bg-blue-500", note: "일차함수 2문제 더 연습" }, { name: "국어", value: 78, color: "bg-rose-400", note: "설명문 구조 복습 필요" }, { name: "과학", value: 72, color: "bg-emerald-500", note: "광합성 재시험 예정" }, { name: "역사", value: 86, color: "bg-amber-500", note: "사건 순서가 좋아졌어요" }].map((subject) => <div key={subject.name}><div className="mb-2 flex items-center justify-between"><div><strong className="text-sm">{subject.name}</strong><span className="ml-2 text-xs text-slate-400">{subject.note}</span></div><strong className="text-sm">{subject.value}%</strong></div><Progress value={subject.value} indicatorClassName={subject.color} /></div>)}</div></Card></div></AppShell>;
}
