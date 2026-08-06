"use client";

import { useState } from "react";
import { Bell, CheckCircle2, Clock3, Mail, MessageCircleMore, Send, Smartphone } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const initialChannels = [
  { id: "in_app", name: "앱 알림함", icon: Bell, active: true, status: "기본 채널", detail: "모든 사용자에게 제공" },
  { id: "web_push", name: "웹푸시", icon: Smartphone, active: true, status: "VAPID 준비", detail: "PWA 설치 기기" },
  { id: "email", name: "이메일", icon: Mail, active: true, status: "Resend 연결", detail: "주간 리포트·중요 알림" },
  { id: "kakao", name: "카카오 알림톡", icon: MessageCircleMore, active: false, status: "템플릿 승인 전", detail: "SOLAPI · 승인 후 자동 활성화" },
];

export default function AdminNotificationsPage() {
  const [channels, setChannels] = useState(initialChannels);
  return <AppShell role="admin"><div className="space-y-6"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-bold text-violet-600">알림 채널</p><h1 className="mt-1 text-3xl font-black">알림·템플릿 운영</h1><p className="mt-2 text-sm text-slate-500">조용한 시간과 중복 방지를 적용하고 실패 시 다른 채널로 보완합니다.</p></div><Button><Send size={17} /> 테스트 알림 보내기</Button></div><div className="grid gap-4 md:grid-cols-2">{channels.map((channel) => <Card key={channel.id} className="flex items-center gap-4 p-5"><span className={`grid size-12 place-items-center rounded-2xl ${channel.active ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-400"}`}><channel.icon size={22} /></span><div className="flex-1"><div className="flex items-center gap-2"><h2 className="font-black">{channel.name}</h2><Badge className={channel.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>{channel.status}</Badge></div><p className="mt-1 text-xs text-slate-400">{channel.detail}</p></div><button onClick={() => setChannels((current) => current.map((item) => item.id === channel.id ? { ...item, active: !item.active } : item))} className={`relative h-7 w-12 rounded-full transition ${channel.active ? "bg-violet-600" : "bg-slate-200"}`} aria-label={`${channel.name} 활성화`}><span className={`absolute top-1 size-5 rounded-full bg-white shadow transition ${channel.active ? "left-6" : "left-1"}`} /></button></Card>)}</div><Card className="overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="text-lg font-black">이벤트별 발송 정책</h2><p className="mt-1 text-xs text-slate-400">동일 dedupe_key는 한 번만 발송됩니다.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-400"><tr><th className="px-5 py-3">이벤트</th><th className="px-5 py-3">대상</th><th className="px-5 py-3">채널</th><th className="px-5 py-3">발송 시점</th><th className="px-5 py-3">상태</th></tr></thead><tbody className="divide-y divide-slate-100">{[{ event: "아침 학습계획", target: "학생", channels: "앱 · 푸시", timing: "매일 07:30" }, { event: "마감 30분 전", target: "학생", channels: "앱 · 푸시", timing: "마감 기준" }, { event: "새 제출물", target: "부모", channels: "앱 · 푸시", timing: "즉시" }, { event: "승인·반려", target: "학생", channels: "앱 · 푸시", timing: "즉시" }, { event: "테스트 결과", target: "부모·학생", channels: "앱 · 이메일 · 카카오", timing: "채점 완료" }, { event: "주간 리포트", target: "부모", channels: "앱 · 이메일", timing: "월요일 08:00" }].map((row) => <tr key={row.event}><td className="px-5 py-4 font-bold">{row.event}</td><td className="px-5 py-4 text-slate-500">{row.target}</td><td className="px-5 py-4"><Badge>{row.channels}</Badge></td><td className="px-5 py-4 text-slate-500"><Clock3 size={14} className="mr-1 inline" />{row.timing}</td><td className="px-5 py-4"><span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={15} />활성</span></td></tr>)}</tbody></table></div></Card></div></AppShell>;
}
