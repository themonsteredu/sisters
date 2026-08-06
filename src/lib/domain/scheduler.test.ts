import { describe, expect, it } from "vitest";
import { distributeStudyUnits, proposeRemediationDate } from "./scheduler";

describe("distributeStudyUnits", () => {
  it("휴일과 불가능한 요일을 제외하고 균등 배정한다", () => {
    const result = distributeStudyUnits({
      startDate: "2026-08-03",
      endDate: "2026-08-07",
      totalUnits: 8,
      availableWeekdays: [1, 2, 3, 4, 5],
      holidays: ["2026-08-05"],
      maxUnitsPerDay: 2,
    });
    expect(result).toHaveLength(4);
    expect(result.every((item) => item.amount === 2)).toBe(true);
    expect(result.some((item) => item.date === "2026-08-05")).toBe(false);
  });

  it("반려 다음 학습 가능일을 제안한다", () => {
    expect(proposeRemediationDate("2026-08-07", [1, 2, 3, 4, 5])).toBe("2026-08-10");
  });
});
