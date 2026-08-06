import { describe, expect, it } from "vitest";
import { parseCourseOutline } from "./course-parser";

describe("parseCourseOutline", () => {
  it("강, 차시, 번호 목록을 회차로 변환한다", () => {
    const result = parseCourseOutline("1강 문장의 형식\n2차시 시제\n3. 조동사");
    expect(result.map(({ index, title }) => ({ index, title }))).toEqual([
      { index: 1, title: "문장의 형식" },
      { index: 2, title: "시제" },
      { index: 3, title: "조동사" },
    ]);
  });

  it("번호 없는 목록도 순서를 부여한다", () => {
    const result = parseCourseOutline("개념 정리\n문제 풀이");
    expect(result).toHaveLength(2);
    expect(result[1].index).toBe(2);
  });
});
