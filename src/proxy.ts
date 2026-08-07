import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next 16 renamed the `middleware` convention to `proxy`. This runs on the edge
// before rendering, so it deliberately imports nothing from `src/lib/auth/*` —
// those modules are `server-only` and pull Node/Supabase code into the bundle.
// The cookie names below are duplicated from student-session.ts / admin-session.ts.
const studentSessionCookie = "sisters_student_session";
const adminSessionCookie = "sisters_admin_session";

// Presence check only. Signature verification, revocation and expiry still run
// in the page loaders — the edge must not hit Postgres on every request.
const parentPaths = ["/dashboard", "/planning", "/reviews", "/tests", "/reports", "/onboarding", "/settings"];
// /notifications serves both roles, so it is gated on either session cookie.
const studentPaths = ["/student"];
const adminPaths = ["/admin"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hasSupabaseAuthCookie(request: NextRequest) {
  // @supabase/ssr writes `sb-<project-ref>-auth-token`, sometimes chunked
  // into `.0`, `.1` … suffixes.
  return request.cookies.getAll().some((cookie) => /^sb-.+-auth-token(\.\d+)?$/.test(cookie.name));
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const url = new URL("/login", request.url);
  if (reason) url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  // Demo mode intentionally bypasses every guard so the whole app is browsable
  // without accounts; see src/lib/auth/guard.ts.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (matches(pathname, adminPaths)) {
    if (!request.cookies.has(adminSessionCookie)) return redirectToLogin(request, "admin");
    return NextResponse.next();
  }

  if (matches(pathname, studentPaths)) {
    if (!request.cookies.has(studentSessionCookie)) return redirectToLogin(request);
    return NextResponse.next();
  }

  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    if (!hasSupabaseAuthCookie(request) && !request.cookies.has(studentSessionCookie)) return redirectToLogin(request);
    return NextResponse.next();
  }

  if (matches(pathname, parentPaths)) {
    if (!hasSupabaseAuthCookie(request)) return redirectToLogin(request);
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/planning/:path*",
    "/reviews/:path*",
    "/tests/:path*",
    "/reports/:path*",
    "/onboarding/:path*",
    "/settings/:path*",
    "/student/:path*",
    "/notifications/:path*",
    "/notifications",
    "/admin/:path*",
  ],
};
