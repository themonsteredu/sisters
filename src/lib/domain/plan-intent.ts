import { addDays, format, parseISO } from "date-fns";
import type { TaskType } from "./types";

export interface IntentStudent {
  id: string;
  name: string;
}

export interface IntentSubject {
  id: string;
  name: string;
}

export interface PlanIntent {
  studentId?: string;
  subjectId?: string;
  title?: string;
  periodStart?: string;
  periodEnd?: string;
  totalUnits?: number;
  unitLabel?: string;
  maxUnitsPerDay?: number;
  minutesPerUnit?: number;
  weekdays?: number[];
  holidays: string[];
  taskType?: TaskType;
  /** Field labels the text did not supply; the form still needs them. */
  missing: string[];
  /** Human-readable summary of what was understood, for the confirm step. */
  understood: string[];
}

const weekdayChars: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };

const unitToTaskType: Record<string, TaskType> = {
  강: "lecture",
  회: "lecture",
  교시: "lecture",
  쪽: "workbook",
  페이지: "workbook",
  p: "workbook",
  개: "custom",
  문제: "workbook",
  단어: "memorize",
};

/**
 * Turns a line of Korean like
 *   "민서 영어 문법 12강 8/10~8/28 평일 하루 2강, 8/15 빼고"
 * into the plan form's fields.
 *
 * Deliberately rule-based rather than an AI call: it runs instantly, costs
 * nothing, works before any provider key is configured, and is testable. The
 * result is a draft the parent confirms — it never creates anything by itself.
 */
export function parsePlanIntent(
  raw: string,
  options: { students: IntentStudent[]; subjects: IntentSubject[]; today: string },
): PlanIntent {
  const text = raw.replace(/\s+/g, " ").trim();
  const intent: PlanIntent = { holidays: [], missing: [], understood: [] };
  if (!text) {
    intent.missing = ["학생", "과목", "제목", "기간", "학습량"];
    return intent;
  }

  let rest = text;
  const consume = (pattern: RegExp) => {
    rest = rest.replace(pattern, " ");
  };

  // --- student -------------------------------------------------------------
  const student = options.students.find((item) => item.name && text.includes(item.name));
  if (student) {
    intent.studentId = student.id;
    intent.understood.push(`학생: ${student.name}`);
    consume(new RegExp(escapeRegExp(student.name), "g"));
  }

  // --- subject -------------------------------------------------------------
  const subject = options.subjects.find((item) => item.name && text.includes(item.name));
  if (subject) {
    intent.subjectId = subject.id;
    intent.understood.push(`과목: ${subject.name}`);
    consume(new RegExp(escapeRegExp(subject.name), "g"));
  }

  // --- holidays (before the general date sweep, which would eat them) ------
  const holidayBlock = text.match(/([\d월일./ ,~]+?)\s*(?:은|는)?\s*(?:빼고|제외|쉬고|휴일)/);
  if (holidayBlock) {
    for (const match of holidayBlock[1].matchAll(/(\d{1,2})\s*[./월]\s*(\d{1,2})/g)) {
      const date = toIsoDate(Number(match[1]), Number(match[2]), options.today);
      if (date) intent.holidays.push(date);
    }
    if (intent.holidays.length) {
      intent.understood.push(`쉬는 날: ${intent.holidays.join(", ")}`);
      consume(new RegExp(escapeRegExp(holidayBlock[0]), "g"));
    }
  }

  // --- period --------------------------------------------------------------
  const range = rest.match(
    /(\d{1,2})\s*[./월]\s*(\d{1,2})\s*일?\s*(?:~|-|부터|에서)\s*(?:(\d{1,2})\s*[./월]\s*)?(\d{1,2})\s*일?\s*(?:까지)?/,
  );
  if (range) {
    const start = toIsoDate(Number(range[1]), Number(range[2]), options.today);
    // "8/10~28" omits the second month; it repeats the first.
    const endMonth = range[3] ? Number(range[3]) : Number(range[1]);
    const end = toIsoDate(endMonth, Number(range[4]), options.today);
    if (start && end) {
      intent.periodStart = start;
      intent.periodEnd = end;
      intent.understood.push(`기간: ${start} ~ ${end}`);
      consume(new RegExp(escapeRegExp(range[0]), "g"));
    }
  } else {
    // Relative: "오늘부터 2주", "내일부터 10일간", "다음주부터 3주간"
    const relative = rest.match(/(오늘|내일|모레|다음\s*주)\s*부터\s*(\d{1,2})\s*(주|일)/);
    if (relative) {
      const offset = relative[1].startsWith("내일") ? 1 : relative[1].startsWith("모레") ? 2 : relative[1].includes("다음") ? 7 : 0;
      const start = addDays(parseISO(options.today), offset);
      const span = Number(relative[2]) * (relative[3] === "주" ? 7 : 1);
      intent.periodStart = format(start, "yyyy-MM-dd");
      intent.periodEnd = format(addDays(start, span - 1), "yyyy-MM-dd");
      intent.understood.push(`기간: ${intent.periodStart} ~ ${intent.periodEnd}`);
      consume(new RegExp(escapeRegExp(relative[0]), "g"));
    }
  }

  // --- per-day cap (before total, so "하루 2강" is not read as the total) ---
  const perDay = rest.match(/(하루|매일|1일)\s*(?:에)?\s*(\d{1,2})\s*(강|회|쪽|페이지|개|문제|단어|교시)?/);
  // "매일 1강" doubles as a weekday instruction; remember it before the phrase
  // is consumed, or the weekday sweep below would never see the word.
  let everyDayFromPerDay = false;
  if (perDay) {
    intent.maxUnitsPerDay = Number(perDay[2]);
    intent.understood.push(`하루 최대: ${perDay[2]}${perDay[3] ?? ""}`);
    everyDayFromPerDay = perDay[1] === "매일";
    consume(new RegExp(escapeRegExp(perDay[0]), "g"));
  }

  // --- minutes per unit ----------------------------------------------------
  const minutes = rest.match(/(\d{1,3})\s*분/);
  if (minutes) {
    intent.minutesPerUnit = Number(minutes[1]);
    intent.understood.push(`단위당 ${minutes[1]}분`);
    consume(new RegExp(escapeRegExp(minutes[0]), "g"));
  }

  // --- total amount --------------------------------------------------------
  const total = rest.match(/(\d{1,3})\s*(강|회|쪽|페이지|개|문제|단어|교시)/);
  if (total) {
    intent.totalUnits = Number(total[1]);
    intent.unitLabel = total[2];
    intent.taskType = unitToTaskType[total[2]] ?? "custom";
    intent.understood.push(`학습량: ${total[1]}${total[2]}`);
    consume(new RegExp(escapeRegExp(total[0]), "g"));
  }

  // --- weekdays ------------------------------------------------------------
  if (/평일/.test(rest)) {
    intent.weekdays = [1, 2, 3, 4, 5];
    intent.understood.push("학습 요일: 평일");
    consume(/평일/g);
  } else if (/매일/.test(rest) || everyDayFromPerDay) {
    intent.weekdays = [0, 1, 2, 3, 4, 5, 6];
    intent.understood.push("학습 요일: 매일");
    consume(/매일/g);
  } else if (/주말/.test(rest)) {
    intent.weekdays = [0, 6];
    intent.understood.push("학습 요일: 주말");
    consume(/주말/g);
  } else {
    // "월수금", "화·목", "월, 수, 금"
    const explicit = rest.match(/([일월화수목금토])\s*[,·/]?\s*([일월화수목금토])(?:\s*[,·/]?\s*([일월화수목금토]))?(?:\s*[,·/]?\s*([일월화수목금토]))?\s*(?:요일)?/);
    if (explicit) {
      const days = explicit.slice(1).filter(Boolean).map((day) => weekdayChars[day]);
      if (days.length >= 2) {
        intent.weekdays = [...new Set(days)].sort();
        intent.understood.push(`학습 요일: ${intent.weekdays.map((d) => "일월화수목금토"[d]).join("")}`);
        consume(new RegExp(escapeRegExp(explicit[0]), "g"));
      }
    }
  }

  // --- title: whatever survived -------------------------------------------
  const title = rest
    .replace(/[,·]/g, " ")
    .replace(/\b(부터|까지|씩|정도|공부|학습|계획|해줘|해|을|를|로|으로)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (title.length >= 2) {
    intent.title = title;
    intent.understood.push(`제목: ${title}`);
  } else if (subject) {
    intent.title = `${subject.name} 학습`;
    intent.understood.push(`제목: ${intent.title} (과목명에서 자동)`);
  }

  if (!intent.studentId) intent.missing.push("학생");
  if (!intent.subjectId) intent.missing.push("과목");
  if (!intent.title) intent.missing.push("제목");
  if (!intent.periodStart || !intent.periodEnd) intent.missing.push("기간");
  if (!intent.totalUnits) intent.missing.push("학습량");

  return intent;
}

/**
 * Month/day with the year inferred: a month already past this year is read as
 * next year, so "1/5" typed in December means the coming January.
 */
function toIsoDate(month: number, day: number, today: string): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const reference = parseISO(today);
  const year = month < reference.getMonth() + 1 - 6 ? reference.getFullYear() + 1 : reference.getFullYear();
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Reject impossible days like 2/31 rather than letting Date roll them over.
  const parsed = parseISO(iso);
  if (Number.isNaN(parsed.getTime()) || parsed.getDate() !== day) return null;
  return iso;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
