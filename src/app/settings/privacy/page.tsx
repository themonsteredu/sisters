import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { getParentActor } from "@/lib/auth/guard";

export const metadata: Metadata = { title: "개인정보 설정" };
export const dynamic = "force-dynamic";

export default async function PrivacySettingsPage() {
  // This page exposes data-export, consent-withdrawal and account-deletion
  // controls, so it must not render for an anonymous visitor.
  const actor = await getParentActor();
  if (!actor) redirect("/login");

  return (
    <AppShell role="parent">
      <PrivacySettings publicPushKey={process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY} />
    </AppShell>
  );
}
