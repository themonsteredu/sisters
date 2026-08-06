"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginPanel({ demo, initialMessage = "" }: { demo: boolean; initialMessage?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"parent" | "student">("parent");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState(demo ? "minseo" : "");
  const [pin, setPin] = useState(demo ? "123456" : "");
  const [message, setMessage] = useState(initialMessage);
  const [loading, setLoading] = useState(false);

  async function requestLogin(body: object) {
    setLoading(true);
    setMessage("");
    try {
      const endpoint = tab === "parent" ? "/api/auth/parent" : "/api/auth/student";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "로그인에 실패했습니다.");
      if (data.redirectTo) window.location.assign(data.redirectTo);
      else setMessage(data.message ?? "요청을 완료했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (tab === "parent") requestLogin({ method: "password", email, password });
    else requestLogin({ handle, pin });
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-2xl shadow-violet-900/10 backdrop-blur md:p-8">
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        {(["parent", "student"] as const).map((item) => (
          <button key={item} onClick={() => { setTab(item); setMessage(""); }} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${tab === item ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>
            {item === "parent" ? "부모 로그인" : "학생 로그인"}
          </button>
        ))}
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">{tab === "parent" ? "부모님, 반가워요" : "오늘 공부를 시작해볼까요?"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{tab === "parent" ? "이메일과 비밀번호로 바로 로그인하세요." : "부모님이 만들어 준 아이디와 6자리 PIN을 입력하세요."}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {tab === "parent" ? (
          <>
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">이메일</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-50"><Mail size={18} className="text-slate-400" /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="parent@example.com" className="h-12 min-w-0 flex-1 outline-none" /></span></label>
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">비밀번호</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-50"><LockKeyhole size={18} className="text-slate-400" /><input required type="password" minLength={8} maxLength={72} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8자 이상" className="h-12 min-w-0 flex-1 outline-none" /></span></label>
            <p className="text-xs leading-5 text-slate-400">관리자가 만든 부모 계정으로 로그인합니다. 인증 메일은 발송되지 않습니다.</p>
          </>
        ) : (
          <>
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">학생 아이디</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-violet-400"><UserRound size={18} className="text-slate-400" /><input required value={handle} onChange={(event) => setHandle(event.target.value)} className="h-12 min-w-0 flex-1 outline-none" /></span></label>
            <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">6자리 PIN</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-violet-400"><LockKeyhole size={18} className="text-slate-400" /><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))} className="h-12 min-w-0 flex-1 tracking-[.45em] outline-none" /></span></label>
          </>
        )}
        {message && <p className="rounded-xl bg-violet-50 p-3 text-sm font-medium text-violet-700" role="status">{message}</p>}
        <Button type="submit" className="h-12 w-full" disabled={loading}>{loading ? "확인 중…" : tab === "parent" ? "로그인" : "학습 시작하기"}<ArrowRight size={17} /></Button>
      </form>
      {demo ? <button onClick={() => router.push(tab === "parent" ? "/dashboard" : "/student")} className="mt-5 flex w-full items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-700"><CheckCircle2 size={14} /> 데모 계정으로 바로 둘러보기</button> : null}
      {demo && tab === "student" ? <p className="mt-3 text-center text-[11px] text-slate-400">데모: minseo 또는 jiwoo / PIN 123456</p> : null}
    </div>
  );
}
