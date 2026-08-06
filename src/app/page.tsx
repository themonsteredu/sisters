import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, BookOpenCheck, BrainCircuit, Camera, CalendarCheck2, Check, ShieldCheck, Sparkles } from "lucide-react";
import { isDemoMode } from "@/lib/config";

const features = [
  { icon: CalendarCheck2, title: "월·주·일 계획", description: "강좌와 문제집 목표를 넣으면 가능한 날에 자동으로 나누고 직접 수정할 수 있어요.", color: "bg-violet-100 text-violet-700" },
  { icon: Camera, title: "학습 증빙과 검수", description: "사진·메모·시간·음성을 제출하고 AI 요약 뒤 부모님이 승인하거나 피드백해요.", color: "bg-rose-100 text-rose-700" },
  { icon: BrainCircuit, title: "맞춤 테스트", description: "영단어 4종과 과목별 암기 테스트로 배운 내용이 남았는지 확인해요.", color: "bg-emerald-100 text-emerald-700" },
  { icon: BarChart3, title: "성장 리포트", description: "완료율, 정시 수행, 과목별 점수와 취약 단원을 두 자녀별로 비교해요.", color: "bg-amber-100 text-amber-700" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[]; error?: string | string[]; error_description?: string | string[] }>;
}) {
  const query = await searchParams;
  const code = Array.isArray(query.code) ? query.code[0] : query.code;
  const authError = Array.isArray(query.error_description)
    ? query.error_description[0]
    : query.error_description ?? (Array.isArray(query.error) ? query.error[0] : query.error);

  if (code) {
    const callbackParams = new URLSearchParams({ code });
    redirect(`/api/auth/callback?${callbackParams.toString()}`);
  }
  if (authError) {
    const loginParams = new URLSearchParams({ error: authError });
    redirect(`/login?${loginParams.toString()}`);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaff]">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8"><Link href="/" className="flex items-center gap-3 text-xl font-black"><span className="grid size-10 place-items-center rounded-2xl bg-violet-600 text-white"><BookOpenCheck size={21} /></span>Sisters</Link><div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white">로그인</Link><Link href={isDemoMode ? "/dashboard" : "/login"} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-lg">{isDemoMode ? "무료 베타 체험" : "시작하기"}</Link></div></nav>

      <section className="soft-grid relative mx-auto max-w-7xl px-5 pb-24 pt-16 text-center md:px-8 md:pt-24">
        <div className="absolute left-0 top-24 -z-0 size-72 rounded-full bg-violet-200/50 blur-3xl" /><div className="absolute right-0 top-10 -z-0 size-72 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="relative z-10"><span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-700 shadow-sm"><Sparkles size={15} /> 두 딸을 위한 가장 따뜻한 학습 매니저</span><h1 className="mx-auto mt-7 max-w-4xl text-5xl font-black leading-[1.08] tracking-[-.05em] text-slate-950 md:text-7xl">계획만 세우지 말고,<br /><span className="bg-gradient-to-r from-violet-600 to-rose-500 bg-clip-text text-transparent">배운 것까지 확인하세요.</span></h1><p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">엠베스트 강좌와 문제집 계획부터 인증 사진, 부모 검수, 영단어·암기 테스트, 보완학습까지 가족의 공부 흐름을 한 곳에 담았습니다.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Link href={isDemoMode ? "/dashboard" : "/login"} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-7 text-sm font-bold text-white shadow-xl shadow-violet-200 hover:bg-violet-700">{isDemoMode ? "데모로 시작하기" : "로그인하고 시작하기"} <ArrowRight size={18} /></Link><Link href="/login" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 text-sm font-bold text-slate-700 hover:border-violet-300">가족 계정 로그인</Link></div><div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">{["설치 가능한 PWA", "부모 최종 승인", "가족별 데이터 분리"].map((item) => <span key={item} className="flex items-center gap-1.5"><Check size={14} className="text-emerald-500" />{item}</span>)}</div></div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 md:px-8"><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{features.map((feature) => <article key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><span className={`grid size-12 place-items-center rounded-2xl ${feature.color}`}><feature.icon size={23} /></span><h2 className="mt-5 text-lg font-black">{feature.title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p></article>)}</div></section>
      <section className="mx-auto mb-20 max-w-6xl px-5"><div className="flex flex-col items-center justify-between gap-8 rounded-[36px] bg-slate-950 px-8 py-12 text-white md:flex-row md:px-14"><div><div className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-300"><ShieldCheck size={18} /> 안전한 AI 학습 보조</div><h2 className="text-3xl font-black tracking-tight">AI가 살펴보고, 부모님이 결정해요.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">모델과 공급자를 관리자가 직접 선택하고, AI가 실패하거나 확신이 낮으면 자동으로 부모 검수로 전환합니다.</p></div><Link href="/admin/ai" className="shrink-0 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900">AI 설정 보기</Link></div></section>
    </main>
  );
}
