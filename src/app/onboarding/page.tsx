import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenCheck, Check } from "lucide-react";
import { FamilySetup } from "@/components/onboarding/family-setup";
import { GuardianConsent } from "@/components/onboarding/guardian-consent";
import { getParentActor } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { demoStudents } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function OnboardingFrame({ step, children }: { step: 1 | 2; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-7 md:py-12">
      <div className="mx-auto mb-7 flex max-w-3xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black"><span className="grid size-9 place-items-center rounded-xl bg-[#6b59cc] text-white"><BookOpenCheck size={19} /></span>Sisters</Link>
        <span className="text-xs font-bold text-slate-400">가족 설정</span>
      </div>
      <div className="mx-auto mb-6 grid max-w-3xl grid-cols-3 gap-2">
        {["가족·자녀 등록", "보호자 동의", "설정 완료"].map((label, index) => {
          const number = index + 1;
          const completed = number < step;
          const active = number === step;
          return <div key={label} className={`rounded-xl border px-3 py-3 text-center text-xs font-bold ${active ? "border-[#6b59cc] bg-[#ece9fa] text-[#5544a8]" : completed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400"}`}>{completed ? <Check size={14} className="mr-1 inline" /> : null}{label}</div>;
        })}
      </div>
      {children}
    </main>
  );
}

export default async function OnboardingPage() {
  if (isDemoMode) {
    return (
      <OnboardingFrame step={2}>
        <GuardianConsent
          students={demoStudents.map((student) => ({ id: student.id, name: student.name }))}
          demo
        />
      </OnboardingFrame>
    );
  }

  const actor = await getParentActor();
  if (!actor) redirect("/login");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=Supabase%20설정이%20필요합니다");

  const { data: membership } = await supabase
    .from("sisters_family_members")
    .select("family_id")
    .eq("user_id", actor.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.family_id) {
    return <OnboardingFrame step={1}><FamilySetup /></OnboardingFrame>;
  }

  const [familyResult, studentsResult, consentsResult] = await Promise.all([
    supabase.from("sisters_families").select("name").eq("id", membership.family_id).maybeSingle(),
    supabase
      .from("sisters_students")
      .select("id,name,birth_date")
      .eq("family_id", membership.family_id)
      .order("created_at"),
    supabase
      .from("sisters_consents")
      .select("student_id,consent_type")
      .eq("family_id", membership.family_id)
      .is("withdrawn_at", null),
  ]);
  const students = (studentsResult.data ?? []).map((student) => ({
    id: student.id,
    name: student.name,
    birthDate: student.birth_date,
  }));

  if (!students.length) {
    return <OnboardingFrame step={1}><FamilySetup initialFamilyName={familyResult.data?.name ?? ""} /></OnboardingFrame>;
  }

  const requiredTypes = new Set(["child_privacy", "ai_processing", "overseas_transfer"]);
  const consentTypesByStudent = new Map<string, Set<string>>();
  for (const consent of consentsResult.data ?? []) {
    const types = consentTypesByStudent.get(consent.student_id) ?? new Set<string>();
    types.add(consent.consent_type);
    consentTypesByStudent.set(consent.student_id, types);
  }
  const completedStudentIds = students
    .filter((student) => {
      const recorded = consentTypesByStudent.get(student.id) ?? new Set<string>();
      return [...requiredTypes].every((type) => recorded.has(type));
    })
    .map((student) => student.id);

  return (
    <OnboardingFrame step={2}>
      <GuardianConsent
        students={students}
        completedStudentIds={completedStudentIds}
        storeId={process.env.NEXT_PUBLIC_PORTONE_STORE_ID}
        channelKey={process.env.NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY}
        demo={false}
      />
    </OnboardingFrame>
  );
}
