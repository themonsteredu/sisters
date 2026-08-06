export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getPublicAppUrl() {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return process.env.NEXT_PUBLIC_APP_URL ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
}
