"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpenCheck,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  CheckSquare,
  ClipboardCheck,
  Home,
  LogOut,
  Menu,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ShellRole = "parent" | "student" | "admin";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

const parentNav: NavItem[] = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/planning", label: "학습계획", icon: CalendarDays },
  { href: "/reviews", label: "제출검수", icon: ClipboardCheck, badge: "2" },
  { href: "/tests", label: "테스트", icon: BrainCircuit },
  { href: "/reports", label: "리포트", icon: ChartNoAxesCombined },
];

const studentNav: NavItem[] = [
  { href: "/student", label: "오늘", icon: CheckSquare },
  { href: "/student/tests", label: "테스트", icon: BrainCircuit },
  { href: "/student/progress", label: "내 기록", icon: ChartNoAxesCombined },
];

const adminNav: NavItem[] = [
  { href: "/admin/ai", label: "AI 모델", icon: Sparkles },
];

interface ShellUser {
  name: string;
  detail: string;
  avatar?: string;
}

export function AppShell({ children, role = "parent", user: userProp }: { children: ReactNode; role?: ShellRole; user?: ShellUser }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = role === "student" ? studentNav : role === "admin" ? adminNav : parentNav;
  const sampleUser = role === "student" ? { name: "학생", detail: "학습 계정", avatar: "학" } : role === "admin" ? { name: "Sisters 운영자", detail: "시스템 관리자", avatar: "S" } : { name: "부모님", detail: "가족 학습매니저", avatar: "부" };
  const user = userProp ? { ...userProp, avatar: userProp.avatar ?? userProp.name.slice(0, 1) } : sampleUser;
  const showSampleSummary = role === "parent" && !userProp;
  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#edf0f4] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#dfe3e8] bg-[#f8f8f6] lg:flex">
        <Link href="/" className="flex h-20 items-center gap-3 border-b border-[#e5e7eb] px-6">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#6b59cc] text-white shadow-sm"><BookOpenCheck size={21} /></span>
          <div><strong className="block text-lg tracking-tight">Sisters</strong><span className="text-xs text-slate-400">우리 가족 학습 매니저</span></div>
        </Link>
        <nav className="flex-1 space-y-1 px-3 py-6" aria-label="주 메뉴">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition", active ? "bg-[#e9e6f7] text-[#5544a8]" : "text-slate-500 hover:bg-[#eff1f3] hover:text-slate-800")}>
                <item.icon size={19} /><span className="flex-1">{item.label}</span>{item.badge ? <Badge className="bg-rose-500 text-white">{item.badge}</Badge> : null}
              </Link>
            );
          })}
        </nav>
        {showSampleSummary ? <div className="m-4 rounded-2xl border border-[#dad5ef] bg-[#e9e6f7] p-4 text-[#4f438d]">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#7165a6]"><Sparkles size={14} /> 이번 주 가족 목표</div>
          <div className="text-2xl font-black">82%</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d4cfea]"><div className="h-full w-[82%] rounded-full bg-[#6b59cc]" /></div>
        </div> : null}
        <div className="flex items-center gap-3 border-t border-slate-100 p-4">
          <span className="grid size-10 place-items-center rounded-full bg-amber-100 font-bold text-amber-700">{user.avatar}</span>
          <div className="min-w-0 flex-1"><strong className="block truncate text-sm">{user.name}</strong><span className="block truncate text-xs text-slate-400">{user.detail}</span></div>
          <Link href="/login" aria-label="로그아웃" className="text-slate-400 hover:text-slate-700"><LogOut size={18} /></Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dfe3e8] bg-[#f8f8f6]/95 px-4 backdrop-blur md:px-8 lg:h-20">
          <div className="flex items-center gap-3"><button onClick={() => setMobileMenuOpen(true)} className="grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="메뉴" aria-expanded={mobileMenuOpen}><Menu size={21} /></button><div className="hidden sm:block"><span className="text-xs font-medium text-slate-400">{todayLabel}</span><p className="text-sm font-bold">Sisters 학습관리</p></div></div>
          <div className="flex items-center gap-2">
            {showSampleSummary ? <Link href="/reviews" className="hidden items-center gap-1.5 rounded-full bg-[#e9e6f7] px-3 py-2 text-xs font-bold text-[#5544a8] md:flex"><Sparkles size={14} /> AI 분석 2건</Link> : null}
            <button className="relative grid size-10 place-items-center rounded-xl border border-[#d9dee5] bg-[#fafaf7] text-slate-600 hover:bg-[#f1f2f0]" aria-label="알림"><Bell size={19} /><span className="absolute right-2 top-2 size-2 rounded-full bg-rose-500 ring-2 ring-[#fafaf7]" /></button>
            <Link href={role === "admin" ? "/admin/ai" : role === "parent" ? "/settings/privacy" : "/login"} className="grid size-10 place-items-center rounded-xl border border-[#d9dee5] bg-[#fafaf7] text-slate-600" aria-label="설정"><Settings size={19} /></Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-6 pb-28 md:px-8 md:py-8 lg:pb-10">{children}</main>
      </div>

      {mobileMenuOpen ? <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="모바일 메뉴"><button className="absolute inset-0 bg-slate-950/30" aria-label="메뉴 닫기" onClick={() => setMobileMenuOpen(false)} /><div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[#f8f8f6] p-4 shadow-2xl"><div className="mb-5 flex items-center justify-between"><Link href="/" className="flex items-center gap-2 font-black" onClick={() => setMobileMenuOpen(false)}><span className="grid size-9 place-items-center rounded-xl bg-[#6b59cc] text-white"><BookOpenCheck size={18} /></span>Sisters</Link><button onClick={() => setMobileMenuOpen(false)} className="grid size-9 place-items-center rounded-xl bg-[#eceeed]" aria-label="메뉴 닫기">×</button></div><nav className="space-y-1" aria-label="모바일 전체 메뉴">{nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold", pathname === item.href ? "bg-[#e9e6f7] text-[#5544a8]" : "text-slate-600")}><item.icon size={19} /><span className="flex-1">{item.label}</span>{item.badge ? <Badge className="bg-rose-500 text-white">{item.badge}</Badge> : null}</Link>)}</nav></div></div> : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-around border-t border-[#dfe3e8] bg-[#f8f8f6]/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="모바일 주 메뉴">
        {nav.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          return <Link key={item.href} href={item.href} className={cn("relative flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold", active ? "text-violet-700" : "text-slate-400")}><item.icon size={20} /><span>{item.label}</span>{item.badge ? <span className="absolute right-1 top-0 grid size-4 place-items-center rounded-full bg-rose-500 text-[9px] text-white">{item.badge}</span> : null}</Link>;
        })}
      </nav>
    </div>
  );
}
