import {
  courseOutlineSchema,
  freeResponseGradeSchema,
  generatedPlanSchema,
  generatedTestSchema,
  submissionAnalysisSchema,
} from "./schemas";
import { runStructuredAI } from "./router";

const safetyBoundary =
  "학생의 최종 성취 판정은 하지 말고, 근거와 신뢰도를 제공해 부모가 검수할 수 있게 하세요.";

export function parseOutlineWithAI(outline: string, familyId?: string) {
  return runStructuredAI({
    capability: "parseCourseOutline",
    schema: courseOutlineSchema,
    familyId,
    prompt: `다음 강좌 목차를 회차 순서대로 구조화하세요. 없는 내용을 만들지 마세요.\n\n${outline}`,
  });
}

export function generatePlanWithAI(context: string, familyId?: string) {
  return runStructuredAI({
    capability: "generateStudyPlan",
    schema: generatedPlanSchema,
    familyId,
    prompt: `중학생의 현실적인 학습 계획을 만드세요. 휴일, 가능한 요일, 마감일과 하루 최대량을 지키세요. ${safetyBoundary}\n\n${context}`,
  });
}

export function analyzeSubmissionWithAI(context: string, familyId?: string) {
  return runStructuredAI({
    capability: "analyzeSubmission",
    schema: submissionAnalysisSchema,
    familyId,
    prompt: `제출 사진에서 확인된 사실만 분석하세요. 페이지, 작성량, 빈칸, 흐림, 의심 항목을 요약하세요. ${safetyBoundary}\n\n${context}`,
  });
}

export function generateTestWithAI(context: string, familyId?: string) {
  return runStructuredAI({
    capability: "generateTest",
    schema: generatedTestSchema,
    familyId,
    prompt: `제공된 학습 범위 안에서만 중학생용 테스트를 생성하세요. 정답과 간단한 해설을 포함하세요. ${safetyBoundary}\n\n${context}`,
  });
}

export function gradeFreeResponseWithAI(context: string, familyId?: string) {
  return runStructuredAI({
    capability: "gradeFreeResponse",
    schema: freeResponseGradeSchema,
    familyId,
    prompt: `모범답안과 학생 답변을 비교해 근거 중심으로 평가하세요. 애매하면 needsParentReview를 true로 설정하세요. ${safetyBoundary}\n\n${context}`,
  });
}
