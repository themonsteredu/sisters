import { describe, expect, it } from "vitest";
import { calculateScore, gradeDeterministicAnswer } from "./grading";

describe("grading", () => {
  it("대소문자와 공백을 정규화해 철자를 채점한다", () => {
    const result = gradeDeterministicAnswer(
      { id: "q1", type: "spelling", prompt: "성취하다", answer: "achieve", points: 10 },
      " Achieve ",
    );
    expect(result).toEqual({ correct: true, earnedPoints: 10, needsParentReview: false });
  });

  it("서술형은 부모 검수로 보낸다", () => {
    const result = gradeDeterministicAnswer(
      { id: "q2", type: "essay", prompt: "광합성 설명", answer: "", points: 20 },
      "식물이 빛을 이용한다",
    );
    expect(result.needsParentReview).toBe(true);
  });

  it("총점 비율을 계산한다", () => {
    expect(calculateScore([{ earnedPoints: 8 }, { earnedPoints: 12 }], 25)).toBe(80);
  });
});
