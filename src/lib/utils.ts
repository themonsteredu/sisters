import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function subjectTone(subject: string) {
  const tones: Record<string, string> = {
    영어: "bg-violet-100 text-violet-700",
    수학: "bg-blue-100 text-blue-700",
    국어: "bg-rose-100 text-rose-700",
    과학: "bg-emerald-100 text-emerald-700",
    역사: "bg-amber-100 text-amber-700",
  };
  return tones[subject] ?? "bg-slate-100 text-slate-700";
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: "예정",
    in_progress: "진행 중",
    submitted: "제출 완료",
    ai_review: "AI 분석 중",
    parent_review: "부모 검수",
    approved: "승인",
    rejected: "반려",
    remediation: "보완 학습",
    overdue: "기한 지남",
  };
  return labels[status] ?? status;
}
