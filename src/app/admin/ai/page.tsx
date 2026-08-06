import type { Metadata } from "next";
import { AISettings } from "@/components/admin/ai-settings";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = { title: "AI 모델 설정" };

export default function AdminAIPage() {
  return <AppShell role="admin"><AISettings /></AppShell>;
}
