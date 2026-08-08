import { describe, expect, it } from "vitest";
import { parsePlanIntent } from "./plan-intent";

const options = {
  students: [{ id: "s1", name: "민서" }, { id: "s2", name: "지우" }],
  subjects: [{ id: "sub1", name: "영어" }, { id: "sub2", name: "수학" }],
  today: "2026-08-07",
};

describe("parsePlanIntent", () => {
  it("한 줄에서 계획 전체를 뽑아낸다", () => {
    const intent = parsePlanIntent("민서 영어 문법 12강 8/10~8/28 평일 하루 2강", options);
    expect(intent.studentId).toBe("s1");
    expect(intent.subjectId).toBe("sub1");
    expect(intent.periodStart).toBe("2026-08-10");
    expect(intent.periodEnd).toBe("2026-08-28");
    expect(intent.totalUnits).toBe(12);
    expect(intent.unitLabel).toBe("강");
    expect(intent.maxUnitsPerDay).toBe(2);
    expect(intent.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(intent.taskType).toBe("lecture");
    expect(intent.title).toBe("문법");
    expect(intent.missing).toEqual([]);
  });

  it("하루 최대량을 총량으로 착각하지 않는다", () => {
    const intent = parsePlanIntent("지우 수학 80쪽 하루 5쪽 8/10~8/31", options);
    expect(intent.totalUnits).toBe(80);
    expect(intent.maxUnitsPerDay).toBe(5);
    expect(intent.taskType).toBe("workbook");
  });

  it("두 번째 달을 생략한 범위를 이해한다", () => {
    const intent = parsePlanIntent("민서 영어 10강 8/10~28", options);
    expect(intent.periodStart).toBe("2026-08-10");
    expect(intent.periodEnd).toBe("2026-08-28");
  });

  it("한글 날짜 표기를 이해한다", () => {
    const intent = parsePlanIntent("민서 수학 20쪽 9월 1일부터 9월 20일까지", options);
    expect(intent.periodStart).toBe("2026-09-01");
    expect(intent.periodEnd).toBe("2026-09-20");
  });

  it("상대 기간을 오늘 기준으로 계산한다", () => {
    const intent = parsePlanIntent("민서 영어 14강 내일부터 2주 매일 1강", options);
    expect(intent.periodStart).toBe("2026-08-08");
    expect(intent.periodEnd).toBe("2026-08-21");
    expect(intent.weekdays).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("쉬는 날을 기간과 분리해서 뽑는다", () => {
    const intent = parsePlanIntent("민서 영어 12강 8/10~8/28 평일 하루 2강, 8/15 빼고", options);
    expect(intent.holidays).toEqual(["2026-08-15"]);
    expect(intent.periodStart).toBe("2026-08-10");
    expect(intent.periodEnd).toBe("2026-08-28");
  });

  it("요일을 개별 지정할 수 있다", () => {
    const intent = parsePlanIntent("지우 수학 12쪽 9/1~9/30 월수금 하루 1쪽", options);
    expect(intent.weekdays).toEqual([1, 3, 5]);
  });

  it("단위당 소요 시간을 총량과 구분한다", () => {
    const intent = parsePlanIntent("민서 영어 12강 8/10~8/28 평일 하루 2강 1강 40분", options);
    expect(intent.minutesPerUnit).toBe(40);
    expect(intent.totalUnits).toBe(12);
  });

  it("빠진 항목을 알려준다", () => {
    const intent = parsePlanIntent("영어 공부 시켜줘", options);
    expect(intent.subjectId).toBe("sub1");
    expect(intent.missing).toContain("학생");
    expect(intent.missing).toContain("기간");
    expect(intent.missing).toContain("학습량");
  });

  it("빈 입력은 전부 빠진 것으로 처리한다", () => {
    const intent = parsePlanIntent("   ", options);
    expect(intent.missing.length).toBeGreaterThan(0);
    expect(intent.understood).toEqual([]);
  });

  it("제목이 없으면 과목명으로 채운다", () => {
    const intent = parsePlanIntent("민서 영어 12강 8/10~8/28", options);
    expect(intent.title).toBe("영어 학습");
  });

  it("존재하지 않는 날짜는 버린다", () => {
    const intent = parsePlanIntent("민서 영어 12강 2/30~3/10", options);
    expect(intent.periodStart).toBeUndefined();
    expect(intent.missing).toContain("기간");
  });

  it("단어 암기는 memorize 유형으로 본다", () => {
    const intent = parsePlanIntent("민서 영어 100단어 8/10~8/28 평일", options);
    expect(intent.taskType).toBe("memorize");
    expect(intent.unitLabel).toBe("단어");
  });
});
