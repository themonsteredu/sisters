import { describe, expect, it } from "vitest";
import { buildPlanTasks } from "./plan-tasks";
import { distributeStudyUnits } from "./scheduler";

const base = { title: "중2 영어 문법", unitLabel: "강", minutesPerUnit: 35, taskType: "lecture" as const };

describe("buildPlanTasks", () => {
  it("names a single-unit day without a range", () => {
    const [task] = buildPlanTasks({ ...base, units: [{ date: "2026-08-10", from: 3, to: 3, amount: 1 }] });
    expect(task.title).toBe("중2 영어 문법 3강");
    expect(task.estimatedMinutes).toBe(35);
  });

  it("names a multi-unit day as a range and scales the duration", () => {
    const [task] = buildPlanTasks({ ...base, units: [{ date: "2026-08-10", from: 1, to: 2, amount: 2 }] });
    expect(task.title).toBe("중2 영어 문법 1~2강");
    expect(task.detail).toBe("2강 분량");
    expect(task.estimatedMinutes).toBe(70);
  });

  it("carries the unit label through for non-lecture plans", () => {
    const [task] = buildPlanTasks({
      ...base,
      title: "쎈 수학",
      unitLabel: "쪽",
      taskType: "workbook",
      units: [{ date: "2026-08-10", from: 80, to: 85, amount: 6 }],
    });
    expect(task.title).toBe("쎈 수학 80~85쪽");
    expect(task.taskType).toBe("workbook");
  });

  it("covers every scheduled unit exactly once, skipping holidays and non-study weekdays", () => {
    const units = distributeStudyUnits({
      startDate: "2026-08-10",
      endDate: "2026-08-28",
      totalUnits: 12,
      availableWeekdays: [1, 2, 3, 4, 5],
      holidays: ["2026-08-17"],
      maxUnitsPerDay: 2,
    });
    const tasks = buildPlanTasks({ ...base, units });

    expect(tasks).toHaveLength(units.length);
    expect(tasks.some((task) => task.scheduledDate === "2026-08-17")).toBe(false);
    // 8/15 and 8/16 are a weekend and were never candidates.
    expect(tasks.some((task) => task.scheduledDate === "2026-08-15")).toBe(false);
    expect(units.reduce((sum, unit) => sum + unit.amount, 0)).toBe(12);
    expect(tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)).toBe(12 * 35);
  });
});
