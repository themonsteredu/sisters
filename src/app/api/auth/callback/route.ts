import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function loginErrorRedirect(origin: string, message: string) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) return loginErrorRedirect(url.origin, providerError);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";
  if (!code) return loginErrorRedirect(url.origin, "로그인 코드가 없습니다. 이메일의 최신 로그인 링크를 다시 눌러주세요.");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return loginErrorRedirect(url.origin, "Supabase 인증 환경변수가 연결되지 않았습니다.");

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return loginErrorRedirect(url.origin, error?.message ?? "로그인 세션을 만들지 못했습니다.");

  const metadataName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name;
  const { error: profileError } = await supabase.from("sisters_profiles").upsert(
    {
      id: data.user.id,
      display_name: typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : (data.user.email?.split("@")[0] ?? "Sisters 부모"),
      email: data.user.email ?? null,
      role: "parent",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (profileError) return loginErrorRedirect(url.origin, `프로필 생성 실패: ${profileError.message}`);

  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/dashboard", url.origin));
}
