import { z } from "zod";
import { isDemoMode } from "@/lib/config";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("password"), email: z.email(), password: z.string().min(8).max(72) }),
  z.object({ method: z.enum(["google", "kakao"]) }),
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    if (isDemoMode) return Response.json({ ok: true, redirectTo: "/dashboard", demo: true });
    const supabase = await createSupabaseServerClient();
    if (!supabase) return Response.json({ error: "Supabase 인증 설정이 필요합니다." }, { status: 503 });
    const callback = new URL("/api/auth/callback", request.url);

    if (input.method === "password") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error || !data.user) {
        const message = error?.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : (error?.message ?? "로그인할 수 없습니다.");
        return Response.json({ error: message }, { status: 401 });
      }

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
      if (profileError) return Response.json({ error: `프로필 생성 실패: ${profileError.message}` }, { status: 500 });

      const { data: profile } = await supabase
        .from("sisters_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      return Response.json({ ok: true, redirectTo: profile?.role === "admin" ? "/admin/ai" : "/dashboard" });
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: input.method,
      options: { redirectTo: callback.toString(), skipBrowserRedirect: true },
    });
    if (error) throw error;
    return Response.json({ ok: true, redirectTo: data.url });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "로그인에 실패했습니다." }, { status: 400 });
  }
}
