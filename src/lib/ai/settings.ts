import type { AICapability, AIModelSelection, AIProviderName } from "@/lib/domain/types";
import { defaultModelSelections } from "./catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { decryptCredential } from "@/lib/security/credentials";

export async function getProviderKey(provider: AIProviderName, familyId?: string) {
  const envKey = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const admin = createSupabaseAdminClient();
  if (!admin) return envKey;

  if (familyId) {
    const { data } = await admin
      .from("sisters_ai_provider_configs")
      .select("encrypted_api_key")
      .eq("family_id", familyId)
      .eq("provider", provider)
      .eq("enabled", true)
      .maybeSingle();
    if (data?.encrypted_api_key) return decryptCredential(data.encrypted_api_key);
  }

  const { data: globalConfig } = await admin
    .from("sisters_ai_provider_configs")
    .select("encrypted_api_key")
    .is("family_id", null)
    .eq("provider", provider)
    .eq("enabled", true)
    .maybeSingle();
  return globalConfig?.encrypted_api_key ? decryptCredential(globalConfig.encrypted_api_key) : envKey;
}

export async function getModelSelection(capability: AICapability, familyId?: string): Promise<AIModelSelection> {
  const fallback = defaultModelSelections.find((item) => item.capability === capability)!;
  const admin = createSupabaseAdminClient();
  if (!admin) return fallback;

  const baseQuery = admin
    .from("sisters_ai_model_assignments")
    .select("capability,primary_provider,primary_model,fallback_provider,fallback_model")
    .eq("capability", capability);
  const { data } = familyId
    ? await baseQuery.eq("family_id", familyId).maybeSingle()
    : await baseQuery.is("family_id", null).maybeSingle();
  if (!data) return fallback;

  return {
    capability: data.capability as AICapability,
    primaryProvider: data.primary_provider as AIProviderName,
    primaryModel: data.primary_model,
    fallbackProvider: (data.fallback_provider as AIProviderName | null) ?? undefined,
    fallbackModel: data.fallback_model ?? undefined,
  };
}
