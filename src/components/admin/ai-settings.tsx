"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, Eye, EyeOff, KeyRound, LockKeyhole, RefreshCcw, Save, ServerCog, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { capabilityLabels, defaultModelSelections, modelCatalog } from "@/lib/ai/catalog";
import type { AICapability, AIModelSelection, AIProviderName } from "@/lib/domain/types";

interface ProviderStatus {
  configured: boolean;
  lastFour: string | null;
}

const emptyStatus: Record<AIProviderName, ProviderStatus> = {
  openai: { configured: false, lastFour: null },
  google: { configured: false, lastFour: null },
};

export function AISettings() {
  const [selections, setSelections] = useState<AIModelSelection[]>(() => defaultModelSelections.map((selection) => ({ ...selection })));
  const [providerStatus, setProviderStatus] = useState(emptyStatus);
  const [keys, setKeys] = useState<Record<AIProviderName, string>>({ openai: "", google: "" });
  const [visible, setVisible] = useState<Record<AIProviderName, boolean>>({ openai: false, google: false });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  function updateSelection(selection: AIModelSelection) {
    setSelections((current) => current.map((item) => (item.capability === selection.capability ? selection : item)));
  }

  useEffect(() => {
    fetch("/api/admin/ai-settings")
      .then((response) => response.json())
      .then((data) => {
        setProviderStatus((current) => ({ ...current, ...(data.providers ?? {}) }));
        if (Array.isArray(data.selections)) setSelections(data.selections);
      })
      .catch(() => undefined);
  }, []);

  const grouped = useMemo(() => ({
    openai: modelCatalog.filter((item) => item.provider === "openai"),
    google: modelCatalog.filter((item) => item.provider === "google"),
  }), []);

  function updateModel(capability: AICapability, slot: "primary" | "fallback", value: string) {
    const [provider, ...modelParts] = value.split(":");
    const model = modelParts.join(":");
    const current = selections.find((item) => item.capability === capability)!;
    updateSelection(slot === "primary" ? { ...current, primaryProvider: provider as AIProviderName, primaryModel: model } : { ...current, fallbackProvider: provider as AIProviderName, fallbackModel: model });
  }

  function updateCustom(capability: AICapability, slot: "primary" | "fallback", model: string) {
    const current = selections.find((item) => item.capability === capability)!;
    updateSelection(slot === "primary" ? { ...current, primaryModel: model } : { ...current, fallbackModel: model });
  }

  async function saveProvider(provider: AIProviderName) {
    if (!keys[provider]) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: keys[provider] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProviderStatus((current) => ({ ...current, [provider]: { configured: true, lastFour: keys[provider].slice(-4) } }));
      setKeys((current) => ({ ...current, [provider]: "" }));
      setMessage(`${provider === "openai" ? "OpenAI" : "Gemini"} 키를 안전하게 저장했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "키를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSelections() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(data.persisted === false ? "데모 모델 선택을 이 세션에 적용했습니다." : "모델 라우팅 설정을 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-bold text-violet-600">관리자 · AI 모델</p><h1 className="mt-1 text-3xl font-black tracking-tight">공급자와 모델 선택</h1><p className="mt-2 text-sm text-slate-500">API 키는 암호화 저장되고 브라우저에 다시 표시되지 않습니다.</p></div><Button onClick={saveSelections} disabled={saving}><Save size={17} /> 모델 설정 저장</Button></div>
      {message && <div className={`flex items-center gap-2 rounded-xl p-3 text-sm font-bold ${message.includes("필요") || message.includes("못") ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{message.includes("필요") ? <TriangleAlert size={18} /> : <Check size={18} />}{message}</div>}

      <section className="grid gap-5 lg:grid-cols-2">
        {(["openai", "google"] as const).map((provider) => {
          const label = provider === "openai" ? "OpenAI" : "Google Gemini";
          const status = providerStatus[provider];
          return <Card key={provider} className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div className="flex items-center gap-3"><span className={`grid size-11 place-items-center rounded-2xl ${provider === "openai" ? "bg-slate-900 text-white" : "bg-blue-50 text-blue-600"}`}>{provider === "openai" ? <Sparkles size={21} /> : <Bot size={21} />}</span><div><h2 className="font-black">{label}</h2><p className="mt-1 text-xs text-slate-400">{provider === "openai" ? "계획·문제·사진·음성" : "텍스트·이미지 대체 공급자"}</p></div></div><Badge className={status.configured ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}>{status.configured ? `연결됨 · ••••${status.lastFour ?? "환경키"}` : "연결 안 됨"}</Badge></div><div className="p-5"><label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-bold"><KeyRound size={16} /> API 키</span><div className="flex gap-2"><div className="relative flex-1"><input type={visible[provider] ? "text" : "password"} autoComplete="new-password" value={keys[provider]} onChange={(event) => setKeys((current) => ({ ...current, [provider]: event.target.value }))} placeholder={provider === "openai" ? "sk-proj-…" : "AIza…"} className="h-11 w-full rounded-xl border border-slate-200 px-3 pr-10 text-sm outline-none focus:border-violet-400" /><button onClick={() => setVisible((current) => ({ ...current, [provider]: !current[provider] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="키 표시 전환">{visible[provider] ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><Button onClick={() => saveProvider(provider)} disabled={!keys[provider] || saving}>저장</Button></div></label><div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500"><LockKeyhole size={15} className="mt-0.5 shrink-0" /> AES-256-GCM으로 서버에서 암호화하며 저장 후에는 마지막 네 자리만 확인할 수 있습니다.</div><div className="mt-4 flex flex-wrap gap-2">{grouped[provider].map((model) => <Badge key={model.id}>{model.label}</Badge>)}</div></div></Card>;
        })}
      </section>

      <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-lg font-black">기능별 모델 라우팅</h2><p className="mt-1 text-xs text-slate-400">기본 모델을 한 번 재시도한 뒤 실패하면 대체 모델로 전환합니다.</p></div><Badge className="bg-violet-50 text-violet-700"><RefreshCcw size={13} className="mr-1" /> 자동 장애 전환</Badge></div><div className="divide-y divide-slate-100">{selections.map((selection) => { const availablePrimary = modelCatalog.filter((item) => item.capabilities.includes(selection.capability)); const primaryKnown = availablePrimary.some((item) => item.provider === selection.primaryProvider && item.id === selection.primaryModel); const fallbackKnown = availablePrimary.some((item) => item.provider === selection.fallbackProvider && item.id === selection.fallbackModel); return <div key={selection.capability} className="grid gap-4 p-5 lg:grid-cols-[220px_1fr_1fr]"><div><strong className="text-sm">{capabilityLabels[selection.capability]}</strong><p className="mt-1 text-xs text-slate-400">{selection.capability === "analyzeSubmission" ? "사진 품질·작성량·OCR" : selection.capability === "transcribeSpeech" ? "영어 말하기 전사" : "구조화된 JSON 출력"}</p></div><label><span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">기본 모델</span><select value={primaryKnown ? `${selection.primaryProvider}:${selection.primaryModel}` : "custom"} onChange={(event) => event.target.value !== "custom" && updateModel(selection.capability, "primary", event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><option value="custom">직접 입력한 모델</option>{availablePrimary.map((model) => <option key={`${model.provider}:${model.id}`} value={`${model.provider}:${model.id}`}>{model.label} · {model.provider}</option>)}</select>{!primaryKnown && <input value={selection.primaryModel} onChange={(event) => updateCustom(selection.capability, "primary", event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs" placeholder="모델 ID 직접 입력" />}</label><label><span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">대체 모델</span><select value={fallbackKnown ? `${selection.fallbackProvider}:${selection.fallbackModel}` : selection.fallbackModel ? "custom" : "none"} onChange={(event) => { if (event.target.value === "none") updateSelection({ ...selection, fallbackProvider: undefined, fallbackModel: undefined }); else if (event.target.value !== "custom") updateModel(selection.capability, "fallback", event.target.value); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"><option value="none">대체 모델 없음</option><option value="custom">직접 입력한 모델</option>{availablePrimary.map((model) => <option key={`${model.provider}:${model.id}`} value={`${model.provider}:${model.id}`}>{model.label} · {model.provider}</option>)}</select>{selection.fallbackModel && !fallbackKnown && <input value={selection.fallbackModel} onChange={(event) => updateCustom(selection.capability, "fallback", event.target.value)} className="mt-2 h-10 w-full rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs" placeholder="대체 모델 ID 직접 입력" />}</label></div>; })}</div></Card>

      <section className="grid gap-4 md:grid-cols-3"><Card className="flex items-start gap-3 p-4"><span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={19} /></span><div><strong className="text-sm">부모 최종 승인</strong><p className="mt-1 text-xs leading-5 text-slate-400">AI 결과로 제출물을 자동 승인하지 않습니다.</p></div></Card><Card className="flex items-start gap-3 p-4"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><ServerCog size={19} /></span><div><strong className="text-sm">서버 전용 호출</strong><p className="mt-1 text-xs leading-5 text-slate-400">키와 서비스 권한은 브라우저 번들에 포함되지 않습니다.</p></div></Card><Card className="flex items-start gap-3 p-4"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><RefreshCcw size={19} /></span><div><strong className="text-sm">실패 시 수동 검수</strong><p className="mt-1 text-xs leading-5 text-slate-400">두 공급자가 실패하면 부모 검수 대기로 전환됩니다.</p></div></Card></section>
    </div>
  );
}
