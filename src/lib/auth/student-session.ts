import { SignJWT, jwtVerify } from "jose";
import { createHash } from "node:crypto";
import { isDemoMode } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const cookieName = "sisters_student_session";

function sessionKey() {
  const secret = process.env.STUDENT_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("STUDENT_SESSION_SECRET가 필요합니다.");
    return new TextEncoder().encode("sisters-demo-student-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function signStudentSession(payload: { studentId: string; familyId: string }) {
  return new SignJWT({ familyId: payload.familyId, role: "student" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.studentId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(sessionKey());
}

export async function verifyStudentSession(token: string) {
  const { payload } = await jwtVerify(token, sessionKey());
  if (payload.role !== "student" || !payload.sub || typeof payload.familyId !== "string") {
    throw new Error("유효하지 않은 학생 세션입니다.");
  }
  return { studentId: payload.sub, familyId: payload.familyId };
}

export async function verifyActiveStudentSession(token: string) {
  const session = await verifyStudentSession(token);
  if (isDemoMode) return session;
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("학생 세션 저장소가 설정되지 않았습니다.");
  const { data } = await admin.from("sisters_student_sessions").select("id")
    .eq("token_hash", hashSessionToken(token))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) throw new Error("만료되었거나 해제된 학생 세션입니다.");
  return session;
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const studentSessionCookie = {
  name: cookieName,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  },
};
