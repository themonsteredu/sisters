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

  it("총점이 0이면 0점으로 처리한다", () => {
    expect(calculateScore([{ earnedPoints: 5 }], 0)).toBe(0);
  });

  it("빈칸을 일부만 채우면 오답이다", () => {
    // 빠진 답이 vacuous truth로 만점 처리되던 회귀.
    const question = {
      id: "q3",
      type: "fill_blank" as const,
      prompt: "두 칸을 채우세요",
      answer: ["빛", "물"],
      points: 10,
    };
    expect(gradeDeterministicAnswer(question, ["빛"]).correct).toBe(false);
    expect(gradeDeterministicAnswer(question, ["빛", "물"]).correct).toBe(true);
  });

  it("acceptedAnswers는 대체 정답일 뿐 순서 문항의 길이를 늘리지 않는다", () => {
    const question = {
      id: "q4",
      type: "ordering" as const,
      prompt: "순서대로",
      answer: ["a", "b", "c"],
      acceptedAnswers: ["d"],
      points: 10,
    };
    expect(gradeDeterministicAnswer(question, ["a", "b", "c"]).correct).toBe(true);
    expect(gradeDeterministicAnswer(question, ["a", "c", "b"]).correct).toBe(false);
    expect(gradeDeterministicAnswer(question, ["a", "b"]).correct).toBe(false);
  });

  it("대체 정답을 인정한다", () => {
    const result = gradeDeterministicAnswer(
      { id: "q5", type: "short_answer", prompt: "광합성 산물", answer: "포도당", acceptedAnswers: ["글루코스"], points: 10 },
      "글루코스",
    );
    expect(result.correct).toBe(true);
  });

  it("빈 응답은 오답이다", () => {
    const result = gradeDeterministicAnswer(
      { id: "q6", type: "spelling", prompt: "성취하다", answer: "achieve", points: 10 },
      "",
    );
    expect(result.correct).toBe(false);
  });
});
