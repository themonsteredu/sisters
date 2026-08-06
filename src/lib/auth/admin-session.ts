import "server-only";

import { createHash, createHmac } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const cookieName = "sisters_admin_session";
const issuer = "sisters-admin";
const audience = "sisters-admin-console";
export const adminPinHashMetadataKey = "sisters_admin_pin_hash";

function sessionKey() {
  const secret = process.env.STUDENT_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("STUDENT_SESSION_SECRET가 필요합니다.");
    }
    return createHmac("sha256", "sisters-local-development-secret")
      .update("admin-session-v1")
      .digest();
  }
  return createHmac("sha256", secret).update("admin-session-v1").digest();
}

function pinVersion(pinHash: string) {
  return createHash("sha256").update(pinHash).digest("hex").slice(0, 24);
}

export async function signAdminSession(userId: string, pinHash: string) {
  return new SignJWT({ role: "admin", pinVersion: pinVersion(pinHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(sessionKey());
}

export async function verifyActiveAdminSession(token: string) {
  const { payload } = await jwtVerify(token, sessionKey(), { issuer, audience });
  if (payload.role !== "admin" || !payload.sub || typeof payload.pinVersion !== "string") {
    throw new Error("유효하지 않은 관리자 세션입니다.");
  }

  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("관리자 인증 저장소가 설정되지 않았습니다.");
  const [{ data: profile }, { data: authData }] = await Promise.all([
    admin.from("sisters_profiles").select("role").eq("id", payload.sub).maybeSingle(),
    admin.auth.admin.getUserById(payload.sub),
  ]);
  const storedHash = authData.user?.app_metadata?.[adminPinHashMetadataKey];
  if (profile?.role !== "admin" || typeof storedHash !== "string" || pinVersion(storedHash) !== payload.pinVersion) {
    throw new Error("만료되었거나 해제된 관리자 세션입니다.");
  }
  return { userId: payload.sub };
}

export function hashAdminLoginClient(value: string) {
  return createHmac("sha256", sessionKey()).update(value).digest("hex");
}

export const adminSessionCookie = {
  name: cookieName,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  },
};
