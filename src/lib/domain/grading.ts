import type { TestQuestion } from "./types";

export function normalizeAnswer(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export interface GradeResult {
  correct: boolean;
  earnedPoints: number;
  needsParentReview: boolean;
}

export function gradeDeterministicAnswer(question: TestQuestion, response: string | string[]): GradeResult {
  if (["essay", "oral", "speaking"].includes(question.type)) {
    return { correct: false, earnedPoints: 0, needsParentReview: true };
  }

  const expected = Array.isArray(question.answer) ? question.answer : [question.answer];
  const accepted = [...expected, ...(question.acceptedAnswers ?? [])].map(normalizeAnswer);
  const provided = Array.isArray(response) ? response.map(normalizeAnswer) : [normalizeAnswer(response)];
  const correct =
    question.type === "ordering"
      ? provided.length === accepted.length && provided.every((value, index) => value === accepted[index])
      : provided.every((value) => accepted.includes(value));

  return {
    correct,
    earnedPoints: correct ? question.points : 0,
    needsParentReview: false,
  };
}

export function calculateScore(results: Array<{ earnedPoints: number }>, totalPoints: number) {
  if (totalPoints <= 0) return 0;
  return Math.round((results.reduce((sum, result) => sum + result.earnedPoints, 0) / totalPoints) * 100);
}
