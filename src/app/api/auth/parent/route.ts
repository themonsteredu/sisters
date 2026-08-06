import { z } from "zod";
import { getPublicAppUrl, isDemoMode } from "@/lib/config";
import { assertSameOrigin } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("magic_link"), email: z.email() }),
  z.object({ method: z.enum(["google", "kakao"]) }),
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await request.json());
    if (isDemoMode) return Response.json({ ok: true, redirectTo: "/dashboard", demo: true });
    const supabase = await createSupabaseServerClient();
    if (!supabase) return Response.json({ error: "Supabase 인증 설정이 필요합니다." }, { status: 503 });
    const callback = `${getPublicAppUrl()}/api/auth/callback?next=/dashboard`;

    if (input.method === "magic_link") {
      const { error } = await supabase.auth.signInWithOtp({
        email: input.email,
        options: { emailRedirectTo: callback },
      });
      if (error) throw error;
      return Response.json({ ok: true, message: "로그인 링크를 이메일로 보냈습니다." });
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: input.method,
      options: { redirectTo: callback, skipBrowserRedirect: true },
    });
    if (error) throw error;
    return Response.json({ ok: true, redirectTo: data.url });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "로그인에 실패했습니다." }, { status: 400 });
  }
}
