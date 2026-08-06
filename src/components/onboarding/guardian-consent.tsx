"use client";

import Script from "next/script";
import { useState } from "react";
import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ConsentStudent {
  id: string;
  name: string;
  birthDate?: string;
}

interface PortOneResponse {
  code?: string;
  message?: string;
}

declare global {
  interface Window {
    PortOne?: {
      requestIdentityVerification: (options: Record<string, string>) => Promise<PortOneResponse>;
    };
  }
}

const requiredConsents = [
  { id: "child_privacy", label: "만 14세 미만 아동 개인정보 수집·이용", required: true },
  { id: "ai_processing", label: "AI 학습 분석 및 자동 생성 기능 이용", required: true },
  { id: "overseas_transfer", label: "AI 공급자 국외 처리·위탁 고지 확인", required: true },
  { id: "notifications", label: "학습 알림 수신", required: false },
] as const;

export function GuardianConsent({
  students,
  storeId,
  channelKey,
  demo,
}: {
  students: ConsentStudent[];
  storeId?: string;
  channelKey?: string;
  demo: boolean;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [checked, setChecked] = useState<string[]>(requiredConsents.map((item) => item.id));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  const canContinue = Boolean(studentId) && requiredConsents.filter((item) => item.required).every((item) => checked.includes(item.id));

  async function verifyAndSave() {
    if (!canContinue) return;
    setBusy(true);
    setMessage("");
    try {
      const identityVerificationId = `sisters-guardian-${crypto.randomUUID()}`;
      if (!demo) {
        if (!storeId || !channelKey || !window.PortOne) throw new Error("PortOne 본인인증 설정이 아직 완료되지 않았습니다.");
        const result = await window.PortOne.requestIdentityVerification({
          storeId,
          channelKey,
          identityVerificationId,
          redirectUrl: `${window.location.origin}/onboarding`,
        });
        if (result.code) throw new Error(result.message ?? "본인인증이 취소되었습니다.");
      }

      const response = await fetch("/api/consent/guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, identityVerificationId, consentTypes: checked }),
      });
      const data = (await response.json()) as { error?: string; guardianName?: string };
      if (!response.ok) throw new Error(data.error ?? "동의를 저장하지 못했습니다.");
      setCompleted(true);
      const guardianLabel = data.guardianName ?? "보호자";
      setMessage(`${guardianLabel}${guardianLabel.endsWith("님") ? "" : "님"}의 확인과 동의가 기록되었습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "본인인증을 완료하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!demo ? <Script src="https://cdn.portone.io/v2/browser-sdk.js" strategy="afterInteractive" /> : null}
      <Card className="mx-auto max-w-2xl p-6 md:p-8">
        <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><ShieldCheck /></span><div><h1 className="text-2xl font-black">보호자 확인 및 동의</h1><p className="mt-2 text-sm leading-6 text-slate-500">아동 계정을 만들기 전에 법정대리인의 동의와 본인확인 기록을 남깁니다.</p></div></div>

        <label className="mt-7 block text-sm font-bold">동의할 학생</label>
        <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-violet-400">
          {students.map((student) => <option key={student.id} value={student.id}>{student.name}{student.birthDate ? ` · ${student.birthDate}` : ""}</option>)}
        </select>

        <fieldset className="mt-7 space-y-3"><legend className="mb-3 text-sm font-bold">동의 항목</legend>{requiredConsents.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={checked.includes(item.id)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} className="mt-1 size-4 accent-violet-600" /><span className="flex-1 text-sm font-semibold">{item.required ? "[필수]" : "[선택]"} {item.label}</span><ExternalLink size={15} className="text-slate-400" /></label>)}</fieldset>

        {message ? <p role="status" className={`mt-5 rounded-xl p-4 text-sm font-semibold ${completed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{completed ? <CheckCircle2 size={17} className="mr-2 inline" /> : null}{message}</p> : null}
        <Button onClick={verifyAndSave} disabled={!canContinue || busy || completed} className="mt-6 w-full">{completed ? "동의 완료" : busy ? "확인 중…" : demo ? "데모 보호자 동의 기록" : "휴대폰 본인인증 후 동의"}</Button>
        <p className="mt-4 text-center text-xs leading-5 text-slate-400">인증 제공자의 원본 개인정보는 저장하지 않고 인증 참조값과 동의 시각만 보관합니다.</p>
      </Card>
    </>
  );
}
