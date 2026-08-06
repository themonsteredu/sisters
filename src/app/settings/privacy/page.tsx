import { AppShell } from "@/components/shell/app-shell";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PrivacySettingsPage() {
  let familyId = "family-demo";
  if (!isDemoMode) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.from("sisters_family_members").select("family_id").limit(1).maybeSingle();
      familyId = data?.family_id ?? "";
    }
  }
  return <AppShell role="parent"><PrivacySettings familyId={familyId} publicPushKey={process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY} /></AppShell>;
}
