import { redirect } from "next/navigation";
import { AdminPinForm } from "@/components/settings/admin-pin-form";
import { AppShell } from "@/components/shell/app-shell";
import { canConfigureAdminPin } from "@/lib/auth/admin-pin";
import { getParentActor } from "@/lib/auth/guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPinSettingsPage() {
  const actor = await getParentActor();
  if (!actor) redirect("/login?reason=admin-setup");

  const [permission, supabase] = await Promise.all([
    canConfigureAdminPin(actor.id),
    createSupabaseServerClient(),
  ]);
  const { data: profile } = supabase
    ? await supabase.from("sisters_profiles").select("display_name").eq("id", actor.id).maybeSingle()
    : { data: null };

  return (
    <AppShell role="parent" user={{ name: profile?.display_name ?? "부모님", detail: "가족 학습 관리자" }}>
      {permission.allowed ? (
        <AdminPinForm configured={permission.configured} />
      ) : (
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-7">
          <h1 className="text-xl font-black text-amber-900">관리자 PIN을 변경할 수 없습니다</h1>
          <p className="mt-3 text-sm leading-6 text-amber-800">{permission.reason}</p>
        </div>
      )}
    </AppShell>
  );
}
