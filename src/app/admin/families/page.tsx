import type { Metadata } from "next";
import { Users } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { loadAdminFamilies } from "@/lib/data/admin";

export const metadata: Metadata = { title: "가족 현황" };
export const dynamic = "force-dynamic";

export default async function AdminFamiliesPage() {
  const families = await loadAdminFamilies();

  return (
    <AppShell role="admin">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-bold text-violet-600">운영</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">가족 현황</h1>
          <p className="mt-2 text-sm text-slate-500">전체 {families.length}개 가족 · 읽기 전용</p>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="p-4 text-left font-bold">가족</th>
                  <th className="p-4 text-left font-bold">플랜</th>
                  <th className="p-4 text-right font-bold">학생</th>
                  <th className="p-4 text-right font-bold">보호자</th>
                  <th className="p-4 text-left font-bold">생성일</th>
                  <th className="p-4 text-left font-bold">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {families.length ? families.map((family) => (
                  <tr key={family.id}>
                    <td className="p-4 font-bold">{family.name}</td>
                    <td className="p-4 text-slate-500">{family.plan}</td>
                    <td className="p-4 text-right">{family.studentCount}</td>
                    <td className="p-4 text-right">{family.memberCount}</td>
                    <td className="p-4 text-slate-400">{family.createdAt.slice(0, 10)}</td>
                    <td className="p-4">
                      {family.suspended
                        ? <Badge className="bg-rose-50 text-rose-700">정지</Badge>
                        : <Badge className="bg-emerald-50 text-emerald-700">사용 중</Badge>}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="p-10 text-center text-slate-400"><Users size={28} className="mx-auto text-slate-300" /><p className="mt-2">등록된 가족이 없습니다.</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-xs text-slate-400">
          정지 상태는 현재 어떤 화면에서도 접근을 막지 않습니다. 차단이 필요하면 별도 구현이 필요합니다.
        </p>
      </div>
    </AppShell>
  );
}
