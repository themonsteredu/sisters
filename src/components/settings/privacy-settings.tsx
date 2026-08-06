"use client";

import Link from "next/link";
import { useState } from "react";
import { BellRing, DatabaseBackup, FileArchive, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RequestType = "export" | "delete" | "withdraw_consent";

export function PrivacySettings({ familyId, publicPushKey }: { familyId: string; publicPushKey?: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function requestData(requestType: RequestType) {
    setBusy(requestType);
    setMessage("");
    try {
      const response = await fetch("/api/account/data-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId, requestType }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "요청을 접수하지 못했습니다.");
      setMessage(requestType === "export" ? "가족 데이터 내보내기 요청이 접수되었습니다." : requestType === "delete" ? "탈퇴 및 삭제 요청이 접수되었습니다. 운영자 확인 전에는 삭제되지 않습니다." : "동의 철회 요청이 접수되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청을 접수하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function enablePush() {
    setBusy("push");
    setMessage("");
    try {
      if (!publicPushKey) throw new Error("웹푸시 공개키가 아직 설정되지 않았습니다.");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("이 브라우저는 웹푸시를 지원하지 않습니다.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("알림 권한이 허용되지 않았습니다.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicPushKey) });
      const json = subscription.toJSON();
      const response = await fetch("/api/notifications/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId, endpoint: json.endpoint, keys: json.keys }),
      });
      if (!response.ok) throw new Error("푸시 구독을 저장하지 못했습니다.");
      setMessage("이 기기에서 학습 알림을 받을 수 있습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "웹푸시를 켜지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return <div className="space-y-6"><div><p className="text-sm font-bold text-violet-600">계정과 개인정보</p><h1 className="mt-1 text-3xl font-black">내 가족 데이터 관리</h1><p className="mt-2 text-sm text-slate-500">알림, 보호자 동의, 내보내기와 삭제 요청을 한곳에서 관리합니다.</p></div>
    {message ? <p role="status" className="rounded-xl bg-violet-50 p-4 text-sm font-semibold text-violet-800">{message}</p> : null}
    <div className="grid gap-4 md:grid-cols-3"><Card className="p-6"><BellRing className="text-violet-600" /><h2 className="mt-4 text-lg font-black">이 기기 웹푸시</h2><p className="mt-2 text-sm leading-6 text-slate-500">마감 임박, 제출 검수와 시험 결과를 설치된 PWA에서 받습니다.</p><Button onClick={enablePush} disabled={busy !== null} className="mt-5">{busy === "push" ? "설정 중…" : "웹푸시 켜기"}</Button></Card>
      <Card className="p-6"><ShieldCheck className="text-emerald-600" /><h2 className="mt-4 text-lg font-black">보호자 동의</h2><p className="mt-2 text-sm leading-6 text-slate-500">학생별 본인확인과 AI 처리 동의 상태를 관리합니다.</p><Link href="/onboarding" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-700">동의 화면 열기</Link></Card>
      <Card className="p-6"><LockKeyhole className="text-slate-700" /><h2 className="mt-4 text-lg font-black">관리자 PIN</h2><p className="mt-2 text-sm leading-6 text-slate-500">관리자 화면에 사용할 6자리 PIN을 만들거나 변경합니다.</p><Link href="/settings/admin-pin" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-slate-100 px-4 text-sm font-bold text-slate-700">관리자 PIN 설정</Link></Card></div>
    <Card className="divide-y divide-slate-100 overflow-hidden"><SettingRow icon={FileArchive} title="가족 데이터 내보내기" detail="계획, 제출 분석, 점수와 승인 기록을 파일로 요청합니다."><Button variant="secondary" onClick={() => requestData("export")} disabled={busy !== null}>{busy === "export" ? "접수 중…" : "내보내기 요청"}</Button></SettingRow><SettingRow icon={DatabaseBackup} title="동의 철회" detail="철회 범위를 운영자가 확인한 뒤 관련 처리를 진행합니다."><Button variant="secondary" onClick={() => requestData("withdraw_consent")} disabled={busy !== null}>철회 요청</Button></SettingRow><SettingRow icon={Trash2} title="회원 탈퇴 및 데이터 삭제" detail="복구할 수 있는 확인 기간을 거쳐 안전하게 처리합니다." danger><Button variant="danger" onClick={() => requestData("delete")} disabled={busy !== null}>{busy === "delete" ? "접수 중…" : "삭제 요청"}</Button></SettingRow></Card>
    <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-500"><Link href="/legal/privacy" className="hover:text-violet-700">개인정보 처리방침</Link><Link href="/legal/terms" className="hover:text-violet-700">이용약관</Link></div>
  </div>;
}

function SettingRow({ icon: Icon, title, detail, children, danger = false }: { icon: typeof ShieldCheck; title: string; detail: string; children: React.ReactNode; danger?: boolean }) {
  return <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${danger ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}><Icon size={20} /></span><div className="flex-1"><h2 className={`font-black ${danger ? "text-rose-700" : ""}`}>{title}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p></div>{children}</div>;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}
