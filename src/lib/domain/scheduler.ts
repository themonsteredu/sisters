import { addDays, format, isAfter, parseISO } from "date-fns";

export interface ScheduleInput {
  startDate: string;
  endDate: string;
  totalUnits: number;
  availableWeekdays: number[];
  holidays?: string[];
  maxUnitsPerDay?: number;
}

export interface ScheduledUnit {
  date: string;
  from: number;
  to: number;
  amount: number;
}

export function distributeStudyUnits(input: ScheduleInput): ScheduledUnit[] {
  if (input.totalUnits <= 0) return [];
  if (!input.availableWeekdays.length) throw new Error("학습 가능 요일이 필요합니다.");

  const end = parseISO(input.endDate);
  const holidaySet = new Set(input.holidays ?? []);
  const validDates: string[] = [];
  let cursor = parseISO(input.startDate);

  while (!isAfter(cursor, end)) {
    const date = format(cursor, "yyyy-MM-dd");
    if (input.availableWeekdays.includes(cursor.getDay()) && !holidaySet.has(date)) {
      validDates.push(date);
    }
    cursor = addDays(cursor, 1);
  }

  if (!validDates.length) throw new Error("기간 안에 배정 가능한 날짜가 없습니다.");

  const maxPerDay = Math.max(1, input.maxUnitsPerDay ?? input.totalUnits);
  let remaining = input.totalUnits;
  let unitCursor = 1;
  const result: ScheduledUnit[] = [];

  validDates.forEach((date, index) => {
    if (remaining <= 0) return;
    const daysLeft = validDates.length - index;
    const amount = Math.min(maxPerDay, Math.max(1, Math.ceil(remaining / daysLeft)));
    result.push({ date, from: unitCursor, to: unitCursor + amount - 1, amount });
    unitCursor += amount;
    remaining -= amount;
  });

  if (remaining > 0) {
    throw new Error("하루 최대 학습량 안에서 목표를 완료할 수 없습니다.");
  }

  return result;
}

export function proposeRemediationDate(
  rejectedDate: string,
  availableWeekdays: number[],
  holidays: string[] = [],
) {
  const blocked = new Set(holidays);
  let cursor = addDays(parseISO(rejectedDate), 1);
  for (let i = 0; i < 30; i += 1) {
    const date = format(cursor, "yyyy-MM-dd");
    if (availableWeekdays.includes(cursor.getDay()) && !blocked.has(date)) return date;
    cursor = addDays(cursor, 1);
  }
  throw new Error("30일 안에 보완 일정을 배정할 수 없습니다.");
}
