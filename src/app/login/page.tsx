import Link from "next/link";
import { BookOpenCheck, ShieldCheck } from "lucide-react";
import { LoginPanel } from "@/components/login-panel";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#f4f1ff] lg:grid-cols-2">
      <div className="soft-grid relative hidden flex-col justify-between overflow-hidden bg-violet-700 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <Link href="/" className="relative flex items-center gap-3 text-xl font-black"><span className="grid size-11 place-items-center rounded-2xl bg-white text-violet-700"><BookOpenCheck /></span>Sisters</Link>
        <div className="relative max-w-lg"><span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold"><ShieldCheck size={15} /> 가족별 안전한 학습공간</span><h2 className="text-5xl font-black leading-[1.15] tracking-tight">계획한 공부가<br />진짜 성장으로<br />이어지도록.</h2><p className="mt-6 max-w-md text-lg leading-8 text-violet-100">오늘 할 일, 학습 증빙, 부모 검수, 테스트와 보완학습까지 한 흐름으로 연결합니다.</p></div>
        <p className="relative text-xs text-violet-200">AI는 1차 분석만 담당하고 최종 판단은 언제나 부모님이 합니다.</p>
      </div>
      <div className="flex items-center justify-center p-5 md:p-10"><LoginPanel /></div>
    </main>
  );
}
