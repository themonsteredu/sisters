import { redirect } from "next/navigation";
import { AdminPinForm } from "@/components/settings/admin-pin-form";
import { AppShell } from "@/components/shell/app-shell";
import { canConfigureAdminPin } from "@/lib/auth/admin-pin";
import { getParentActor, getParentSession } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function AdminPinSettingsPage() {
  const actor = await getParentActor();
  if (!actor) redirect("/login?reason=admin-setup");

  // The session is request-cached and already carries display_name, so this
  // page no longer issues its own sisters_profiles query.
  const [permission, session] = await Promise.all([
    canConfigureAdminPin(actor.id),
    isDemoMode ? Promise.resolve(null) : getParentSession(),
  ]);

  return (
    <AppShell role="parent" user={{ name: session?.displayName ?? "부모님", detail: "가족 학습 관리자" }}>
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
