import Link from "next/link";
import { BookOpenCheck, ShieldCheck } from "lucide-react";
import { LoginPanel } from "@/components/login-panel";
import { isDemoMode } from "@/lib/config";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; reason?: string | string[] }>;
}) {
  const query = await searchParams;
  const authError = Array.isArray(query.error) ? query.error[0] : query.error;
  const reason = Array.isArray(query.reason) ? query.reason[0] : query.reason;
  const initialMessage = authError
    ? `로그인 실패: ${authError}`
    : reason === "admin"
      ? "관리자 로그인이 필요합니다. 로그인 후에도 이 문구가 나오면 Supabase에서 관리자 권한을 지정해주세요."
      : "";

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f5f6f8] lg:grid-cols-2">
      <div className="soft-grid relative hidden flex-col justify-between overflow-hidden bg-[#596273] p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-2xl" />
        <Link href="/" className="relative flex items-center gap-3 text-xl font-black"><span className="grid size-11 place-items-center rounded-2xl bg-white text-[#596273]"><BookOpenCheck /></span>Sisters</Link>
        <div className="relative max-w-lg"><span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold"><ShieldCheck size={15} /> 가족별 안전한 학습공간</span><h2 className="text-5xl font-black leading-[1.15] tracking-tight">계획한 공부가<br />진짜 성장으로<br />이어지도록.</h2><p className="mt-6 max-w-md text-lg leading-8 text-slate-100">오늘 할 일, 학습 증빙, 부모 검수, 테스트와 보완학습까지 한 흐름으로 연결합니다.</p></div>
        <p className="relative text-xs text-slate-200">AI는 1차 분석만 담당하고 최종 판단은 언제나 부모님이 합니다.</p>
      </div>
      <div className="flex items-center justify-center p-5 md:p-10"><LoginPanel demo={isDemoMode} initialMessage={initialMessage} /></div>
    </main>
  );
}
