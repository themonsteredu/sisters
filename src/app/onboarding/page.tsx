import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { GuardianConsent } from "@/components/onboarding/guardian-consent";
import { getParentActor } from "@/lib/auth/guard";
import { isDemoMode } from "@/lib/config";
import { demoStudents } from "@/lib/demo-data";

export const dynamic = "force-dynamic";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  let students = demoStudents.map((student) => ({ id: student.id, name: student.name }));
  if (!isDemoMode) {
    const actor = await getParentActor();
    const supabase = await createSupabaseServerClient();
    if (actor && supabase) {
      const { data } = await supabase.from("sisters_students").select("id, name, birth_date").order("created_at");
      students = (data ?? []).map((student) => ({ id: student.id, name: student.name, birthDate: student.birth_date }));
    }
  }

  return <main className="min-h-screen bg-[#f7f7fb] px-4 py-8 md:py-14"><div className="mx-auto mb-7 flex max-w-2xl items-center justify-between"><Link href="/" className="flex items-center gap-2 font-black"><span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white"><BookOpenCheck size={19} /></span>Sisters</Link><Link href="/dashboard" className="text-sm font-bold text-violet-700">나중에 하기</Link></div><GuardianConsent students={students} storeId={process.env.NEXT_PUBLIC_PORTONE_STORE_ID} channelKey={process.env.NEXT_PUBLIC_PORTONE_IDENTITY_CHANNEL_KEY} demo={isDemoMode} /></main>;
}
