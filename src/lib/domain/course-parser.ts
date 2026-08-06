import type { CourseLesson } from "./types";

const lessonPattern = /^(?:제\s*)?(\d+)\s*(?:강|차시|회|\.|\)|:|-)?\s*(.*)$/i;

export function parseCourseOutline(raw: string): CourseLesson[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const lessons: CourseLesson[] = [];

  for (const line of lines) {
    const normalized = line.replace(/^[•·*-]\s*/, "").trim();
    const match = normalized.match(lessonPattern);

    if (match) {
      const index = Number(match[1]);
      const title = match[2].trim() || `${index}강`;
      lessons.push({ id: `lesson-${index}-${lessons.length + 1}`, index, title });
      continue;
    }

    lessons.push({
      id: `lesson-${lessons.length + 1}`,
      index: lessons.length + 1,
      title: normalized,
    });
  }

  return lessons
    .sort((a, b) => a.index - b.index)
    .filter((lesson, index, all) => index === 0 || lesson.index !== all[index - 1].index);
}
