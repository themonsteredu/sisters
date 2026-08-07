import type { ScheduledUnit } from "./scheduler";
import type { TaskType } from "./types";

export interface PlanTaskDraft {
  title: string;
  detail: string;
  scheduledDate: string;
  estimatedMinutes: number;
  taskType: TaskType;
}

export interface BuildPlanTasksInput {
  units: ScheduledUnit[];
  title: string;
  unitLabel: string;
  minutesPerUnit: number;
  taskType: TaskType;
}

/**
 * Turns the scheduler's day-by-day allocation into task rows.
 *
 * Kept separate from the server action so the naming and duration maths can be
 * tested without a request, a session or a database.
 */
export function buildPlanTasks(input: BuildPlanTasksInput): PlanTaskDraft[] {
  const { units, title, unitLabel, minutesPerUnit, taskType } = input;

  return units.map((unit) => ({
    title: unit.from === unit.to
      ? `${title} ${unit.from}${unitLabel}`
      : `${title} ${unit.from}~${unit.to}${unitLabel}`,
    detail: `${unit.amount}${unitLabel} 분량`,
    scheduledDate: unit.date,
    estimatedMinutes: unit.amount * minutesPerUnit,
    taskType,
  }));
}
