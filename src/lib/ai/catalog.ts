import type { AICapability, AIModelSelection, AIProviderName } from "@/lib/domain/types";

export interface ModelCatalogItem {
  provider: AIProviderName;
  id: string;
  label: string;
  strengths: string;
  capabilities: AICapability[];
}

const textVisionCapabilities: AICapability[] = [
  "parseCourseOutline",
  "generateStudyPlan",
  "analyzeSubmission",
  "generateTest",
  "gradeFreeResponse",
];

export const modelCatalog: ModelCatalogItem[] = [
  {
    provider: "openai",
    id: "gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    strengths: "복잡한 계획과 높은 정확도",
    capabilities: textVisionCapabilities,
  },
  {
    provider: "openai",
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    strengths: "품질과 비용의 균형",
    capabilities: textVisionCapabilities,
  },
  {
    provider: "openai",
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    strengths: "빠른 대량 처리",
    capabilities: textVisionCapabilities,
  },
  {
    provider: "openai",
    id: "gpt-4o-mini-transcribe",
    label: "GPT-4o mini Transcribe",
    strengths: "영어 말하기 받아쓰기",
    capabilities: ["transcribeSpeech"],
  },
  {
    provider: "google",
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    strengths: "빠른 이미지·문서 분석",
    capabilities: textVisionCapabilities,
  },
  {
    provider: "google",
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    strengths: "정교한 추론과 긴 자료",
    capabilities: textVisionCapabilities,
  },
];

export const defaultModelSelections: AIModelSelection[] = [
  ["parseCourseOutline", "gpt-5.6-luna", "gemini-2.5-flash"],
  ["generateStudyPlan", "gpt-5.6-terra", "gemini-2.5-flash"],
  ["analyzeSubmission", "gpt-5.6-terra", "gemini-2.5-flash"],
  ["generateTest", "gpt-5.6-terra", "gemini-2.5-pro"],
  ["gradeFreeResponse", "gpt-5.6-terra", "gemini-2.5-pro"],
].map(([capability, primaryModel, fallbackModel]) => ({
  capability: capability as AICapability,
  primaryProvider: "openai",
  primaryModel,
  fallbackProvider: "google",
  fallbackModel,
}));

defaultModelSelections.push({
  capability: "transcribeSpeech",
  primaryProvider: "openai",
  primaryModel: "gpt-4o-mini-transcribe",
});

export const capabilityLabels: Record<AICapability, string> = {
  parseCourseOutline: "강좌 목차 정리",
  generateStudyPlan: "학습 계획 생성",
  analyzeSubmission: "제출 사진 분석",
  generateTest: "테스트 문제 생성",
  gradeFreeResponse: "서술형 채점",
  transcribeSpeech: "말하기 음성 인식",
};
