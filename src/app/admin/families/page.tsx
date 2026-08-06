import type { Metadata } from "next";
import { Ban, Eye, MoreHorizontal, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "가족 관리" };

const families = [
  { name: "정윤님의 가족", parent: "jeongyun@example.com", students: "민서, 지우", joined: "2026.08.01", usage: "AI 84/200", status: "활성" },
  { name: "김하늘님의 가족", parent: "haneul@example.com", students: "서연", joined: "2026.08.02", usage: "AI 41/200", status: "활성" },
  { name: "이현우님의 가족", parent: "hyunwoo@example.com", students: "도윤, 시우", joined: "2026.08.03", usage: "AI 132/200", status: "활성" },
  { name: "박소영님의 가족", parent: "soyoung@example.com", students: "예린", joined: "2026.08.04", usage: "AI 18/200", status: "확인 필요" },
];

export default function AdminFamiliesPage() {
  return <AppShell role="admin"><div className="space-y-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-bold text-violet-600">가족 관리</p><h1 className="mt-1 text-3xl font-black">베타 가족과 학생</h1><p className="mt-2 text-sm text-slate-500">가족별 데이터, 동의 기록, 사용량과 계정 상태를 관리합니다.</p></div><Button><UserPlus size={17} /> 베타 초대</Button></div><div className="grid gap-4 md:grid-cols-3"><Card className="p-5"><Users className="text-violet-600" /><strong className="mt-4 block text-2xl">24가족</strong><span className="text-xs text-slate-400">학생 47명</span></Card><Card className="p-5"><ShieldCheck className="text-emerald-600" /><strong className="mt-4 block text-2xl">31건</strong><span className="text-xs text-slate-400">법정대리인 동의</span></Card><Card className="p-5"><Ban className="text-rose-500" /><strong className="mt-4 block text-2xl">0건</strong><span className="text-xs text-slate-400">정지된 가족</span></Card></div><Card className="overflow-hidden"><div className="flex flex-wrap gap-3 border-b border-slate-100 p-4"><label className="flex min-w-64 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={17} className="text-slate-400" /><input placeholder="가족, 부모 이메일, 학생 검색" className="h-10 flex-1 outline-none" /></label><Button variant="secondary">필터</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-400"><tr><th className="px-5 py-3">가족</th><th className="px-5 py-3">학생</th><th className="px-5 py-3">가입일</th><th className="px-5 py-3">사용량</th><th className="px-5 py-3">상태</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{families.map((family) => <tr key={family.name}><td className="px-5 py-4"><strong>{family.name}</strong><span className="mt-1 block text-xs text-slate-400">{family.parent}</span></td><td className="px-5 py-4 text-slate-600">{family.students}</td><td className="px-5 py-4 text-slate-500">{family.joined}</td><td className="px-5 py-4"><Badge>{family.usage}</Badge></td><td className="px-5 py-4"><Badge className={family.status === "활성" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>{family.status}</Badge></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button className="grid size-8 place-items-center rounded-lg bg-slate-50"><Eye size={16} /></button><button className="grid size-8 place-items-center rounded-lg bg-slate-50"><MoreHorizontal size={16} /></button></div></td></tr>)}</tbody></table></div></Card></div></AppShell>;
}
