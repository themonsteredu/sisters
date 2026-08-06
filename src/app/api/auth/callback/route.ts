import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data } = (await supabase?.auth.exchangeCodeForSession(code)) ?? { data: { user: null } };
    if (supabase && data.user) {
      const metadataName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name;
      await supabase.from("sisters_profiles").upsert(
        {
          id: data.user.id,
          display_name: typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : (data.user.email?.split("@")[0] ?? "Sisters 부모"),
          email: data.user.email ?? null,
          role: "parent",
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    }
  }
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/dashboard", url.origin));
}
