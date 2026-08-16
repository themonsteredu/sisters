"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Archive,
  BookCopy,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  ExternalLink,
  Layers3,
  Link2,
  Paperclip,
  Sparkles,
  UserPlus,
  WandSparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { archivePlanAction, createCourseAction, createPlanAction, createWorkbookAction, updateCourseUrlAction } from "@/app/planning/actions";
import { idleState, type ActionState } from "@/lib/forms/action-state";
import { useFields } from "@/lib/forms/use-fields";
import { QuickPlan } from "./quick-plan";
import { TaskMaterials } from "./task-materials";
import { parseCourseOutline } from "@/lib/domain/course-parser";
import type { PlanIntent } from "@/lib/domain/plan-intent";
import type { PlanningWorkspaceData } from "@/lib/data/planning";
import { subjectDot, subjectTone } from "@/lib/utils";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

const planStatusBadge: Record<string, { label: string; tone: string }> = {
  draft: { label: "임시", tone: "bg-slate-100 text-slate-600" },
  confirmed: { label: "확정", tone: "bg-blue-50 text-blue-700" },
  published: { label: "진행 중", tone: "bg-emerald-50 text-emerald-700" },
  archived: { label: "보관됨", tone: "bg-slate-100 text-slate-400" },
};

function monthShift(month: string, delta: number) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildCalendar(month: string) {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, index - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, index, 0)).getUTCDate();
  const leading = first.getUTCDay();
  const cells: Array<{ date: string | null; day: number | null }> = [];

  for (let i = 0; i < leading; i += 1) cells.push({ date: null, day: null });
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: `${month}-${String(day).padStart(2, "0")}`, day });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`rounded-xl p-3 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
    >
      {state.message}
    </p>
  );
}

function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass = "h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400";

type FieldProps = { name: string; value: string; onChange: (event: { target: { value: string } }) => void };

function StudentSubjectFields({
  data,
  student,
  subject,
}: {
  data: PlanningWorkspaceData;
  student: FieldProps;
  subject: FieldProps;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className="mb-2 block text-sm font-bold">학생</span>
        <select {...student} required className={inputClass}>
          {data.students.map((item) => (
            <option key={item.id} value={item.id}>{item.name} · {item.grade}학년</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-bold">과목</span>
        <select {...subject} required className={inputClass}>
          {data.subjects.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function PlanningWorkspace({ data }: { data: PlanningWorkspaceData }) {
  const [view, setView] = useState<"calendar" | "plans" | "content">("calendar");
  const [openModal, setOpenModal] = useState<null | "course" | "workbook" | "plan">(null);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [notice, setNotice] = useState<ActionState>(idleState);
  // Archiving removes the plan's remaining tasks, so the button arms first and
  // only a second press on the same plan actually submits.
  const [armedPlanId, setArmedPlanId] = useState<string | null>(null);
  // "" = free-form plan; "course:<id>" / "workbook:<id>" = built from a
  // registered source, which also links the tasks back to it via sourceId.
  const [planSource, setPlanSource] = useState("");
  // Inline lecture-link editor on a course card; one course at a time.
  const [linkCourseId, setLinkCourseId] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  // Phones show one day at a time. Defaults to the earliest day with work so
  // the panel is not empty on arrival.
  const [materialTask, setMaterialTask] = useState<PlanningWorkspaceData["tasks"][number] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => [...data.tasks].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]?.scheduledDate ?? null,
  );

  const firstStudent = data.students[0]?.id ?? "";
  const firstSubject = data.subjects[0]?.id ?? "";

  const course = useFields({ studentId: firstStudent, subjectId: firstSubject, title: "", teacher: "", url: "", outline: "" });
  const workbook = useFields({ studentId: firstStudent, subjectId: firstSubject, title: "", unit: "", currentPage: "1", endPage: "", targetDate: "" });
  const plan = useFields({
    studentId: firstStudent,
    subjectId: firstSubject,
    title: "",
    periodStart: "",
    periodEnd: "",
    totalUnits: "12",
    unitLabel: "강",
    maxUnitsPerDay: "2",
    minutesPerUnit: "35",
    taskType: "lecture",
    holidays: "",
  });

  // Close and clear only when the save actually succeeded; on failure the modal
  // stays open with the user's input intact. This lives in the action wrapper
  // rather than an effect so it runs once per submit, not once per render.
  function onSuccess(state: ActionState, form: { reset: () => void }) {
    if (state.ok) {
      form.reset();
      setPlanSource("");
      setOpenModal(null);
      // The modal is gone, so the page banner has to carry the confirmation.
      // It holds the latest result only — failures stay in the open modal.
      setNotice(state);
    }
    return state;
  }

  const [courseState, submitCourse, coursePending] = useActionState(
    async (previous: ActionState, formData: FormData) => onSuccess(await createCourseAction(previous, formData), course),
    idleState,
  );
  const [workbookState, submitWorkbook, workbookPending] = useActionState(
    async (previous: ActionState, formData: FormData) => onSuccess(await createWorkbookAction(previous, formData), workbook),
    idleState,
  );
  const [planState, submitPlan, planPending] = useActionState(
    async (previous: ActionState, formData: FormData) => onSuccess(await createPlanAction(previous, formData), plan),
    idleState,
  );
  const [courseUrlState, submitCourseUrl, courseUrlPending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await updateCourseUrlAction(previous, formData);
      if (result.ok) {
        setLinkCourseId(null);
        setNotice(result);
      }
      return result;
    },
    idleState,
  );
  const [archiveState, submitArchive, archivePending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await archivePlanAction(previous, formData);
      setArmedPlanId(null);
      if (result.ok) setNotice(result);
      return result;
    },
    idleState,
  );

  // Picking a registered course fills everything the parent used to retype:
  // student, subject, title and the lesson count straight from the outline.
  function applyCourse(item: PlanningWorkspaceData["courses"][number]) {
    plan.setValues((current) => ({
      ...current,
      studentId: item.studentId,
      subjectId: item.subjectId,
      title: item.title,
      totalUnits: item.lessonCount ? String(item.lessonCount) : current.totalUnits,
      unitLabel: "강",
      taskType: "lecture",
    }));
    setPlanSource(`course:${item.id}`);
    setOpenModal("plan");
  }

  function applyWorkbook(item: PlanningWorkspaceData["workbooks"][number]) {
    plan.setValues((current) => ({
      ...current,
      studentId: item.studentId,
      subjectId: item.subjectId,
      title: item.unit ? `${item.title} ${item.unit}` : item.title,
      totalUnits: String(Math.max(1, item.endPage - item.currentPage + 1)),
      unitLabel: "쪽",
      taskType: "workbook",
      minutesPerUnit: "10",
      periodEnd: item.targetDate || current.periodEnd,
    }));
    setPlanSource(`workbook:${item.id}`);
    setOpenModal("plan");
  }

  function applyPlanSource(value: string) {
    setPlanSource(value);
    if (!value) return;
    const [kind, id] = value.split(":");
    if (kind === "course") {
      const item = data.courses.find((course) => course.id === id);
      if (item) applyCourse(item);
    } else {
      const item = data.workbooks.find((book) => book.id === id);
      if (item) applyWorkbook(item);
    }
  }

  // The quick-plan box hands over a parsed draft; we fill the real form with it
  // and open the modal so nothing is created without the parent seeing it.
  function applyIntent(intent: PlanIntent) {
    setPlanSource("");
    plan.setValues((current) => ({
      ...current,
      studentId: intent.studentId ?? current.studentId,
      subjectId: intent.subjectId ?? current.subjectId,
      title: intent.title ?? current.title,
      periodStart: intent.periodStart ?? current.periodStart,
      periodEnd: intent.periodEnd ?? current.periodEnd,
      totalUnits: intent.totalUnits ? String(intent.totalUnits) : current.totalUnits,
      unitLabel: intent.unitLabel ?? current.unitLabel,
      maxUnitsPerDay: intent.maxUnitsPerDay ? String(intent.maxUnitsPerDay) : current.maxUnitsPerDay,
      minutesPerUnit: intent.minutesPerUnit ? String(intent.minutesPerUnit) : current.minutesPerUnit,
      taskType: intent.taskType ?? current.taskType,
      holidays: intent.holidays.length ? intent.holidays.join(", ") : current.holidays,
    }));
    if (intent.weekdays?.length) setWeekdays(intent.weekdays);
    setOpenModal("plan");
  }

  const outlinePreview = useMemo(
    () => (course.values.outline.trim() ? parseCourseOutline(course.values.outline) : []),
    [course.values.outline],
  );
  const calendar = useMemo(() => buildCalendar(data.month), [data.month]);
  const tasksByDate = useMemo(() => {
    const map = new Map<string, PlanningWorkspaceData["tasks"]>();
    for (const task of data.tasks) {
      const bucket = map.get(task.scheduledDate);
      if (bucket) bucket.push(task);
      else map.set(task.scheduledDate, [task]);
    }
    return map;
  }, [data.tasks]);

  const studentName = (id: string) => data.students.find((student) => student.id === id)?.name ?? "학생";
  const [year, monthIndex] = data.month.split("-");
  const canRegister = data.students.length > 0 && data.subjects.length > 0;

  if (!data.hasFamily) {
    return (
      <Card className="mx-auto max-w-2xl p-7 md:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-600"><UserPlus size={22} /></span>
        <h1 className="mt-5 text-2xl font-black">가족 공간을 먼저 만들어 주세요</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          학생을 등록해야 강좌와 학습계획을 만들 수 있습니다.
        </p>
        <Link href="/onboarding" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">
          가족 설정 시작
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-violet-600">학습계획</p>
            {data.demo ? <Badge className="bg-amber-50 text-amber-700">데모 · 저장 안 됨</Badge> : <Badge className="bg-emerald-50 text-emerald-700">운영 데이터</Badge>}
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">월간 목표를 오늘의 할 일로</h1>
          <p className="mt-2 text-sm text-slate-500">강좌와 문제집을 등록하고, 기간·요일을 정하면 과제가 자동으로 배분됩니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setOpenModal("course")} disabled={!canRegister}><ClipboardPaste size={17} /> 강좌 등록</Button>
          <Button variant="secondary" onClick={() => setOpenModal("workbook")} disabled={!canRegister}><BookCopy size={17} /> 문제집 등록</Button>
          <Button onClick={() => setOpenModal("plan")} disabled={!canRegister}><WandSparkles size={17} /> 학습계획 만들기</Button>
        </div>
      </div>

      {!canRegister ? (
        <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          등록된 학생 또는 과목이 없습니다. <Link href="/onboarding" className="underline">가족 설정</Link>에서 학생을 먼저 추가해 주세요.
        </p>
      ) : null}

      <Feedback state={notice} />

      {canRegister ? <QuickPlan data={data} today={data.today} onApply={applyIntent} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Layers3 size={20} /></span>
          <p className="mt-4 text-xs font-semibold text-slate-400">등록 강좌</p>
          <strong className="mt-1 block text-2xl font-black">{data.courses.length}개</strong>
          <span className="text-xs text-slate-400">총 {data.courses.reduce((sum, course) => sum + course.lessonCount, 0)}강</span>
        </Card>
        <Card className="p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><BookCopy size={20} /></span>
          <p className="mt-4 text-xs font-semibold text-slate-400">등록 문제집</p>
          <strong className="mt-1 block text-2xl font-black">{data.workbooks.length}권</strong>
        </Card>
        <Card className="p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><CalendarDays size={20} /></span>
          <p className="mt-4 text-xs font-semibold text-slate-400">{Number(monthIndex)}월 과제</p>
          <strong className="mt-1 block text-2xl font-black">{data.tasks.length}개</strong>
          <span className="text-xs text-slate-400">학습계획 {data.plans.length}개</span>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 md:p-5">
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => setView("calendar")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "calendar" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>달력</button>
            <button type="button" onClick={() => setView("plans")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "plans" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>계획</button>
            <button type="button" onClick={() => setView("content")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "content" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>강좌·교재</button>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/planning?month=${monthShift(data.month, -1)}`} aria-label="이전 달" className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500"><ChevronLeft size={17} /></Link>
            <strong className="min-w-28 text-center text-sm">{year}년 {Number(monthIndex)}월</strong>
            <Link href={`/planning?month=${monthShift(data.month, 1)}`} aria-label="다음 달" className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500"><ChevronRight size={17} /></Link>
          </div>
        </div>

        {view === "calendar" ? (
          <div>
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
              {weekdayLabels.map((day, index) => (
                <div key={day} className={`p-2 text-center text-[11px] font-bold md:p-3 md:text-xs ${index === 0 ? "text-rose-400" : index === 6 ? "text-blue-400" : "text-slate-400"}`}>{day}</div>
              ))}
            </div>

            {/*
              Phones get a compact grid of day numbers with subject dots; tapping
              a day lists it below. The previous single layout was locked to
              min-w-[760px] inside overflow-x-auto, so a 360px screen could only
              scroll sideways through it.
            */}
            <div className="grid grid-cols-7 md:hidden">
              {calendar.map((cell, index) => {
                const dayTasks = cell.date ? tasksByDate.get(cell.date) ?? [] : [];
                const isSelected = cell.date !== null && cell.date === selectedDate;
                if (!cell.day) return <div key={index} className="min-h-14 border-b border-r border-slate-100 bg-slate-50/40" />;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedDate(cell.date)}
                    aria-pressed={isSelected}
                    aria-label={`${cell.day}일, 과제 ${dayTasks.length}개`}
                    className={`min-h-14 border-b border-r border-slate-100 p-1 text-center ${isSelected ? "bg-violet-50" : "bg-white"}`}
                  >
                    <span className={`mx-auto grid size-7 place-items-center rounded-full text-xs font-bold ${isSelected ? "bg-violet-600 text-white" : "text-slate-600"}`}>
                      {cell.day}
                    </span>
                    <span className="mt-1 flex flex-wrap justify-center gap-0.5">
                      {dayTasks.slice(0, 4).map((task) => (
                        <span key={task.id} className={`size-1.5 rounded-full ${subjectDot(task.subject)}`} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected-day detail, phones only. */}
            <div className="border-t border-slate-100 p-4 md:hidden">
              {selectedDate ? (
                <>
                  <h3 className="text-sm font-black">{Number(selectedDate.slice(8))}일 과제 {(tasksByDate.get(selectedDate) ?? []).length}개</h3>
                  <div className="mt-3 space-y-2">
                    {(tasksByDate.get(selectedDate) ?? []).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setMaterialTask(task)}
                        className="flex w-full items-center gap-2 rounded-xl border border-slate-200 p-3 text-left"
                      >
                        <Badge className={subjectTone(task.subject)}>{task.subject}</Badge>
                        <div className="min-w-0 flex-1">
                          <strong className="block truncate text-sm">{task.title}</strong>
                          <span className="text-xs text-slate-400">{studentName(task.studentId)} · {task.estimatedMinutes}분</span>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-400">
                          <Paperclip size={13} />{task.materials.length}
                        </span>
                      </button>
                    ))}
                    {(tasksByDate.get(selectedDate) ?? []).length === 0 ? (
                      <p className="py-4 text-center text-sm text-slate-400">이 날은 배정된 과제가 없습니다.</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="py-2 text-center text-sm text-slate-400">날짜를 선택하면 과제를 볼 수 있어요.</p>
              )}
            </div>

            {/* Full grid from md up, where the columns have room for chips. */}
            <div className="hidden grid-cols-7 md:grid">
              {calendar.map((cell, index) => (
                <div key={index} className="min-h-28 border-b border-r border-slate-100 bg-white p-2">
                  {cell.day ? <span className="grid size-7 place-items-center rounded-full text-xs font-bold text-slate-600">{cell.day}</span> : null}
                  <div className="mt-1 space-y-1">
                    {cell.date ? tasksByDate.get(cell.date)?.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setMaterialTask(task)}
                        className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-[10px] font-bold ${subjectTone(task.subject)}`}
                        title={`${studentName(task.studentId)} · ${task.title} · 자료 ${task.materials.length}개`}
                      >
                        {task.materials.length ? "📎 " : ""}<span className="opacity-60">{studentName(task.studentId)}</span> · {task.title}
                      </button>
                    )) : null}
                  </div>
                </div>
              ))}
            </div>

            {data.tasks.length === 0 ? (
              <p className="hidden p-8 text-center text-sm text-slate-400 md:block">이 달에 배정된 과제가 없습니다. 학습계획을 만들어 보세요.</p>
            ) : null}
          </div>
        ) : view === "plans" ? (
          <div className="p-5">
            <p className="mb-4 text-xs text-slate-400">
              끝났거나 잘못 만든 계획은 보관하세요. 아직 시작 전인 과제는 학생 화면에서 사라지고, 이미 제출·승인된 기록은 그대로 남습니다.
            </p>
            <div className="space-y-3">
              {data.plans.length ? data.plans.map((item) => {
                const badge = planStatusBadge[item.status] ?? { label: item.status, tone: "bg-slate-100 text-slate-600" };
                const armed = armedPlanId === item.id;
                return (
                  <div key={item.id} className={`rounded-xl border p-4 ${item.status === "archived" ? "border-slate-100 bg-slate-50/50" : "border-slate-200"}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={badge.tone}>{badge.label}</Badge>
                          <strong className={`truncate text-sm ${item.status === "archived" ? "text-slate-400" : ""}`}>{item.title}</strong>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">
                          {studentName(item.studentId)} · {item.periodStart} ~ {item.periodEnd} · 과제 {item.taskCount}개
                        </p>
                      </div>
                      {item.status !== "archived" ? (
                        armed ? (
                          <form action={submitArchive} className="flex flex-wrap items-center gap-2">
                            <input type="hidden" name="planId" value={item.id} />
                            <span className="text-xs font-bold text-rose-600">시작 전 과제도 함께 삭제돼요</span>
                            <Button type="submit" variant="danger" disabled={archivePending}>
                              {archivePending ? "보관 중…" : "정말 보관"}
                            </Button>
                            <Button variant="ghost" onClick={() => setArmedPlanId(null)} disabled={archivePending}>취소</Button>
                          </form>
                        ) : (
                          <Button variant="secondary" onClick={() => setArmedPlanId(item.id)} disabled={archivePending}>
                            <Archive size={15} /> 보관
                          </Button>
                        )
                      ) : null}
                    </div>
                  </div>
                );
              }) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
                  아직 만든 학습계획이 없습니다. 위의 한 줄 입력이나 “학습계획 만들기”로 시작해 보세요.
                </p>
              )}
            </div>
            {archiveState.message && !archiveState.ok ? (
              <p role="status" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{archiveState.message}</p>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <section>
              <h2 className="mb-3 font-black">등록 강좌</h2>
              <div className="space-y-3">
                {data.courses.length ? data.courses.map((course) => (
                  <div key={course.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge className={subjectTone(course.subject)}>{course.subject}</Badge>
                        <h3 className="mt-2 font-bold">{course.title}</h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {studentName(course.studentId)} · {course.lessonCount}강{course.teacher ? ` · ${course.teacher}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {course.url ? (
                            <a
                              href={course.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:underline"
                            >
                              <ExternalLink size={12} /> 강의실 열기
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setLinkCourseId(linkCourseId === course.id ? null : course.id);
                              setLinkUrl(course.url ?? "");
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-violet-600"
                          >
                            <Link2 size={12} /> {course.url ? "링크 수정" : "강의 링크 붙이기"}
                          </button>
                        </div>
                      </div>
                      <Button variant="secondary" className="shrink-0" onClick={() => applyCourse(course)}>
                        <WandSparkles size={15} /> 계획 만들기
                      </Button>
                    </div>
                    {linkCourseId === course.id ? (
                      <form action={submitCourseUrl} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        <input type="hidden" name="courseId" value={course.id} />
                        <div className="flex gap-2">
                          <input
                            type="url"
                            name="url"
                            value={linkUrl}
                            onChange={(event) => setLinkUrl(event.target.value)}
                            placeholder="https://www.mbest.co.kr/…"
                            aria-label="강의 주소"
                            className={`${inputClass} flex-1`}
                          />
                          <Button type="submit" disabled={courseUrlPending}>{courseUrlPending ? "저장 중…" : "저장"}</Button>
                          <Button variant="ghost" onClick={() => setLinkCourseId(null)} disabled={courseUrlPending}>취소</Button>
                        </div>
                        <p className="text-xs text-slate-400">엠베스트 강의실 주소를 붙여넣으세요. 비우고 저장하면 링크가 지워져요.</p>
                        {courseUrlState.message && !courseUrlState.ok ? (
                          <p role="status" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{courseUrlState.message}</p>
                        ) : null}
                      </form>
                    ) : null}
                  </div>
                )) : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">등록된 강좌가 없습니다.</p>}
              </div>
            </section>
            <section>
              <h2 className="mb-3 font-black">등록 문제집</h2>
              <div className="space-y-3">
                {data.workbooks.length ? data.workbooks.map((book) => (
                  <div key={book.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge className={subjectTone(book.subject)}>{book.subject}</Badge>
                        <h3 className="mt-2 font-bold">{book.title}</h3>
                        <p className="mt-1 text-xs text-slate-400">{book.unit ? `${book.unit} · ` : ""}{book.currentPage}~{book.endPage}쪽 · {book.targetDate}까지</p>
                      </div>
                      <Button variant="secondary" className="shrink-0" onClick={() => applyWorkbook(book)}>
                        <WandSparkles size={15} /> 계획 만들기
                      </Button>
                    </div>
                    <Progress value={Math.min(100, (book.currentPage / Math.max(1, book.endPage)) * 100)} className="mt-4" indicatorClassName="bg-blue-500" />
                  </div>
                )) : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">등록된 문제집이 없습니다.</p>}
              </div>
            </section>
          </div>
        )}
      </Card>

      {materialTask ? (
        <TaskMaterials
          task={materialTask}
          studentName={studentName(materialTask.studentId)}
          onClose={() => setMaterialTask(null)}
          onRescheduled={(state) => {
            setMaterialTask(null);
            setNotice(state);
          }}
        />
      ) : null}

      {openModal === "course" && (
        <Modal title="강좌 등록" description="엠베스트 등 강의 목차를 붙여넣으면 회차로 자동 분리합니다." onClose={() => setOpenModal(null)}>
          <form action={submitCourse} className="grid gap-5 p-5 md:grid-cols-2">
            <div className="space-y-4">
              <StudentSubjectFields data={data} student={course.field("studentId")} subject={course.field("subjectId")} />
              <label className="block">
                <span className="mb-2 block text-sm font-bold">강좌 이름</span>
                <input {...course.field("title")} required maxLength={120} placeholder="중2 영어 문법" className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold">선생님 (선택)</span>
                <input {...course.field("teacher")} maxLength={60} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold">강의 주소 (선택)</span>
                <input {...course.field("url")} type="url" maxLength={500} placeholder="https://www.mbest.co.kr/…" className={inputClass} />
                <span className="mt-1 block text-xs text-slate-400">엠베스트 강의실 주소를 넣어 두면 아이가 할 일에서 바로 강의를 열 수 있어요.</span>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold">목차 붙여넣기</span>
                <textarea
                  {...course.field("outline")}
                  required
                  placeholder={"1강 문장의 형식\n2강 문장의 종류\n3강 시제"}
                  className="h-48 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm leading-7 outline-none focus:border-violet-400"
                />
              </label>
              <input type="hidden" name="source" value="mbest" />
            </div>
            <div className="flex flex-col">
              <span className="mb-2 block text-sm font-bold"><Sparkles size={14} className="inline" /> 미리보기 · {outlinePreview.length}강</span>
              <div className="h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
                {outlinePreview.length ? outlinePreview.map((lesson) => (
                  <div key={lesson.id} className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm shadow-sm">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-100 text-xs font-black text-violet-700">{lesson.index}</span>
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                  </div>
                )) : <p className="p-6 text-center text-xs text-slate-400">목차를 붙여넣으면 회차가 여기에 표시됩니다.</p>}
              </div>
              <Button type="submit" className="mt-3 w-full" disabled={coursePending || !outlinePreview.length}>
                {coursePending ? "저장 중…" : `강좌로 저장 (${outlinePreview.length}강)`}
              </Button>
              <Feedback state={courseState} />
            </div>
          </form>
        </Modal>
      )}

      {openModal === "workbook" && (
        <Modal title="문제집 등록" description="목표 쪽수와 완료일을 정해 두면 계획에서 바로 사용할 수 있습니다." onClose={() => setOpenModal(null)}>
          <form action={submitWorkbook} className="space-y-4 p-5">
            <StudentSubjectFields data={data} student={workbook.field("studentId")} subject={workbook.field("subjectId")} />
            <label className="block">
              <span className="mb-2 block text-sm font-bold">문제집 이름</span>
              <input {...workbook.field("title")} required maxLength={120} placeholder="쎈 중2 수학(상)" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">단원 (선택)</span>
              <input {...workbook.field("unit")} maxLength={60} placeholder="이차방정식" className={inputClass} />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label><span className="mb-2 block text-sm font-bold">시작 쪽</span><input {...workbook.field("currentPage")} type="number" min={1} required className={inputClass} /></label>
              <label><span className="mb-2 block text-sm font-bold">마지막 쪽</span><input {...workbook.field("endPage")} type="number" min={1} required className={inputClass} /></label>
              <label><span className="mb-2 block text-sm font-bold">완료일</span><input {...workbook.field("targetDate")} type="date" required className={inputClass} /></label>
            </div>
            <Button type="submit" className="w-full" disabled={workbookPending}>{workbookPending ? "저장 중…" : "문제집 저장"}</Button>
            <Feedback state={workbookState} />
          </form>
        </Modal>
      )}

      {openModal === "plan" && (
        <Modal title="학습계획 만들기" description="등록한 강좌·문제집을 고르면 아래가 자동으로 채워집니다." onClose={() => setOpenModal(null)}>
          <form action={submitPlan} className="space-y-4 p-5">
            {data.courses.length || data.workbooks.length ? (
              <label className="block rounded-xl bg-violet-50/60 p-3">
                <span className="mb-2 block text-sm font-bold">무엇을 공부하나요</span>
                <select
                  value={planSource}
                  onChange={(event) => applyPlanSource(event.target.value)}
                  aria-label="계획의 강좌 또는 문제집"
                  className={inputClass}
                >
                  <option value="">직접 입력할게요</option>
                  {data.courses.length ? (
                    <optgroup label="등록한 강좌">
                      {data.courses.map((item) => (
                        <option key={item.id} value={`course:${item.id}`}>
                          {item.subject} · {item.title} ({item.lessonCount}강) · {studentName(item.studentId)}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {data.workbooks.length ? (
                    <optgroup label="등록한 문제집">
                      {data.workbooks.map((item) => (
                        <option key={item.id} value={`workbook:${item.id}`}>
                          {item.subject} · {item.title} ({Math.max(1, item.endPage - item.currentPage + 1)}쪽) · {studentName(item.studentId)}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                <span className="mt-1.5 block text-xs text-slate-500">엠베스트 강좌를 고르면 제목·강 수까지 자동으로 채워져요. 기간과 요일만 정하면 끝.</span>
              </label>
            ) : null}
            <input type="hidden" name="sourceId" value={planSource.split(":")[1] ?? ""} />
            <StudentSubjectFields data={data} student={plan.field("studentId")} subject={plan.field("subjectId")} />
            <label className="block">
              <span className="mb-2 block text-sm font-bold">계획 이름</span>
              <input {...plan.field("title")} required maxLength={120} placeholder="중2 영어 문법" className={inputClass} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="mb-2 block text-sm font-bold">시작일</span><input {...plan.field("periodStart")} type="date" required className={inputClass} /></label>
              <label><span className="mb-2 block text-sm font-bold">완료일</span><input {...plan.field("periodEnd")} type="date" required className={inputClass} /></label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label><span className="mb-2 block text-sm font-bold">총 학습량</span><input {...plan.field("totalUnits")} type="number" min={1} max={400} required className={inputClass} /></label>
              <label><span className="mb-2 block text-sm font-bold">단위</span><input {...plan.field("unitLabel")} maxLength={20} className={inputClass} /></label>
              <label><span className="mb-2 block text-sm font-bold">하루 최대</span><input {...plan.field("maxUnitsPerDay")} type="number" min={1} max={20} required className={inputClass} /></label>
              <label><span className="mb-2 block text-sm font-bold">단위당 분</span><input {...plan.field("minutesPerUnit")} type="number" min={5} max={240} required className={inputClass} /></label>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">과제 유형</span>
              <select {...plan.field("taskType")} className={inputClass}>
                <option value="lecture">강의</option>
                <option value="workbook">문제집</option>
                <option value="memorize">암기</option>
                <option value="review">복습</option>
                <option value="custom">기타</option>
              </select>
            </label>
            <div>
              <span className="mb-2 block text-sm font-bold">학습 요일</span>
              <div className="flex gap-1">
                {weekdayLabels.map((day, index) => {
                  const active = weekdays.includes(index);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setWeekdays((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])}
                      className={`grid size-9 place-items-center rounded-lg text-xs font-bold ${active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <input type="hidden" name="weekdays" value={weekdays.join(",")} />
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-bold">쉬는 날 (선택)</span>
              <input {...plan.field("holidays")} placeholder="2026-08-15, 2026-08-17" className={inputClass} />
              <span className="mt-1 block text-xs text-slate-400">쉼표로 구분해 YYYY-MM-DD 형식으로 입력합니다.</span>
            </label>
            <Button type="submit" className="w-full" disabled={planPending || !weekdays.length}>
              {planPending ? "만드는 중…" : "계획 만들고 학생에게 공개"}
            </Button>
            <Feedback state={planState} />
          </form>
        </Modal>
      )}
    </div>
  );
}
