"use client";

import Link from "next/link";
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
  completedStudentIds = [],
}: {
  students: ConsentStudent[];
  storeId?: string;
  channelKey?: string;
  demo: boolean;
  completedStudentIds?: string[];
}) {
  const [completedIds, setCompletedIds] = useState(completedStudentIds);
  const [studentId, setStudentId] = useState(students.find((student) => !completedStudentIds.includes(student.id))?.id ?? students[0]?.id ?? "");
  const [checked, setChecked] = useState<string[]>(requiredConsents.map((item) => item.id));
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [busy, setBusy] = useState(false);

  const allCompleted = students.length > 0 && students.every((student) => completedIds.includes(student.id));
  const identityConfigured = demo || Boolean(storeId && channelKey);
  const canContinue = Boolean(studentId)
    && !completedIds.includes(studentId)
    && requiredConsents.filter((item) => item.required).every((item) => checked.includes(item.id));

  async function verifyAndSave() {
    if (!canContinue) return;
    setBusy(true);
    setMessage("");
    setMessageType("success");
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
      const nextCompletedIds = [...new Set([...completedIds, studentId])];
      setCompletedIds(nextCompletedIds);
      const guardianLabel = data.guardianName ?? "보호자";
      const nextStudent = students.find((student) => !nextCompletedIds.includes(student.id));
      if (nextStudent) {
        setStudentId(nextStudent.id);
        setMessage(`${guardianLabel}${guardianLabel.endsWith("님") ? "" : "님"}의 동의가 기록되었습니다. ${nextStudent.name} 학생의 동의도 이어서 진행해 주세요.`);
      } else {
        setMessage("모든 자녀의 보호자 확인과 동의가 기록되었습니다.");
      }
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "본인인증을 완료하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!demo && identityConfigured ? <Script src="https://cdn.portone.io/v2/browser-sdk.js" strategy="afterInteractive" /> : null}
      <Card className="mx-auto max-w-2xl p-6 md:p-8">
        <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700"><ShieldCheck /></span><div><p className="text-xs font-bold text-slate-400">2단계</p><h1 className="mt-1 text-2xl font-black">보호자 확인 및 동의</h1><p className="mt-2 text-sm leading-6 text-slate-500">등록한 자녀별로 법정대리인의 동의와 본인확인 기록을 남깁니다.</p></div></div>

        <label className="mt-7 block text-sm font-bold">동의할 학생</label>
        <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-violet-400">
          {students.map((student) => <option key={student.id} value={student.id} disabled={completedIds.includes(student.id)}>{student.name}{student.birthDate ? ` · ${student.birthDate}` : ""}{completedIds.includes(student.id) ? " · 동의 완료" : ""}</option>)}
        </select>

        <fieldset className="mt-7 space-y-3"><legend className="mb-3 text-sm font-bold">동의 항목</legend>{requiredConsents.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" checked={checked.includes(item.id)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} className="mt-1 size-4 accent-violet-600" /><span className="flex-1 text-sm font-semibold">{item.required ? "[필수]" : "[선택]"} {item.label}</span><ExternalLink size={15} className="text-slate-400" /></label>)}</fieldset>

        {!identityConfigured ? <p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">휴대폰 본인인증 연동이 아직 설정되지 않았습니다. 관리자에게 PortOne 설정을 요청해 주세요.</p> : null}
        {message ? <p role="status" className={`mt-5 rounded-xl p-4 text-sm font-semibold ${messageType === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{messageType === "success" ? <CheckCircle2 size={17} className="mr-2 inline" /> : null}{message}</p> : null}
        {allCompleted ? <Link href="/dashboard" className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">설정 완료하고 대시보드로</Link> : <Button onClick={verifyAndSave} disabled={!canContinue || busy || !identityConfigured} className="mt-6 w-full">{busy ? "확인 중…" : !identityConfigured ? "본인인증 설정 필요" : demo ? "데모 보호자 동의 기록" : "휴대폰 본인인증 후 동의"}</Button>}
        <p className="mt-4 text-center text-xs leading-5 text-slate-400">인증 제공자의 원본 개인정보는 저장하지 않고 인증 참조값과 동의 시각만 보관합니다.</p>
      </Card>
    </>
  );
}
