"use client";

import { useMemo, useState } from "react";
import { BookCopy, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardPaste, Layers3, Plus, Sparkles, WandSparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoCourses, demoStudents, demoWorkbooks } from "@/lib/demo-data";
import { parseCourseOutline } from "@/lib/domain/course-parser";
import { distributeStudyUnits, type ScheduledUnit } from "@/lib/domain/scheduler";
import { subjectTone } from "@/lib/utils";

const calendarDays = Array.from({ length: 35 }, (_, index) => {
  const date = index - 4;
  return { date: date <= 0 ? 31 + date : date, muted: date <= 0 || date > 31, current: date === 6 };
});

const calendarTasks: Record<number, Array<{ title: string; subject: string; student: string }>> = {
  3: [{ title: "영어 10강", subject: "영어", student: "민서" }],
  4: [{ title: "쎈 80~85p", subject: "수학", student: "민서" }, { title: "국어 7강", subject: "국어", student: "지우" }],
  5: [{ title: "광합성 복습", subject: "과학", student: "민서" }],
  6: [{ title: "영어 12강", subject: "영어", student: "민서" }, { title: "개념원리 54~59p", subject: "수학", student: "지우" }, { title: "삼국의 성장", subject: "역사", student: "지우" }],
  7: [{ title: "영단어 재시험", subject: "영어", student: "민서" }],
  10: [{ title: "영어 13강", subject: "영어", student: "민서" }, { title: "국어 9강", subject: "국어", student: "지우" }],
  11: [{ title: "쎈 94~99p", subject: "수학", student: "민서" }],
};

export function PlanningWorkspace() {
  const [view, setView] = useState<"calendar" | "content">("calendar");
  const [showImport, setShowImport] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [outline, setOutline] = useState("1강 문장의 형식\n2강 문장의 종류\n3강 시제\n4강 조동사\n5강 수동태");
  const [preview, setPreview] = useState(() => parseCourseOutline(outline));
  const [generated, setGenerated] = useState<ScheduledUnit[]>([]);
  const [published, setPublished] = useState(false);

  function generatePlan() {
    setGenerated(distributeStudyUnits({
      startDate: "2026-08-07",
      endDate: "2026-08-21",
      totalUnits: 12,
      availableWeekdays: [1, 2, 3, 4, 5],
      holidays: ["2026-08-15"],
      maxUnitsPerDay: 2,
    }));
  }

  const completion = useMemo(() => {
    const total = demoCourses.reduce((sum, course) => sum + course.lessons.length, 0);
    const done = demoCourses.reduce((sum, course) => sum + course.completedLessonCount, 0);
    return Math.round((done / total) * 100);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-bold text-violet-600">학습계획</p><h1 className="mt-1 text-3xl font-black tracking-tight">월간 목표를 오늘의 할 일로</h1><p className="mt-2 text-sm text-slate-500">자동배분 후 달력에서 직접 옮기고 수정할 수 있어요.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setShowImport(true)}><ClipboardPaste size={17} /> 강좌 목차 가져오기</Button><Button onClick={() => setShowGenerate(true)}><WandSparkles size={17} /> 자동 계획 만들기</Button></div></div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Layers3 size={20} /></span><Badge className="bg-emerald-50 text-emerald-600">진행 중</Badge></div><p className="mt-4 text-xs font-semibold text-slate-400">등록 강좌</p><div className="mt-1 flex items-end gap-2"><strong className="text-2xl font-black">{demoCourses.length}개</strong><span className="pb-1 text-xs text-slate-400">총 진도 {completion}%</span></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><BookCopy size={20} /></span><Badge>8월 목표</Badge></div><p className="mt-4 text-xs font-semibold text-slate-400">등록 문제집</p><div className="mt-1 flex items-end gap-2"><strong className="text-2xl font-black">{demoWorkbooks.length}권</strong><span className="pb-1 text-xs text-slate-400">평균 46% 진행</span></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600"><CalendarDays size={20} /></span><Badge className={published ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"}>{published ? "학생 공개" : "계획 초안"}</Badge></div><p className="mt-4 text-xs font-semibold text-slate-400">8월 계획</p><div className="mt-1 flex items-end gap-2"><strong className="text-2xl font-black">42개</strong><button onClick={() => setPublished(true)} className="pb-1 text-xs font-bold text-violet-600">{published ? "공개 완료" : "확정·공개"}</button></div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 md:p-5"><div className="flex rounded-xl bg-slate-100 p-1"><button onClick={() => setView("calendar")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "calendar" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>달력</button><button onClick={() => setView("content")} className={`rounded-lg px-4 py-2 text-sm font-bold ${view === "content" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}>강좌·교재</button></div><div className="flex items-center gap-2"><button className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500"><ChevronLeft size={17} /></button><strong className="min-w-28 text-center text-sm">2026년 8월</strong><button className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500"><ChevronRight size={17} /></button></div></div>
        {view === "calendar" ? (
          <div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">{["일", "월", "화", "수", "목", "금", "토"].map((day, index) => <div key={day} className={`p-3 text-center text-xs font-bold ${index === 0 ? "text-rose-400" : index === 6 ? "text-blue-400" : "text-slate-400"}`}>{day}</div>)}</div><div className="grid grid-cols-7">{calendarDays.map((day, index) => <div key={index} className={`min-h-28 border-b border-r border-slate-100 p-2 ${day.current ? "bg-violet-50/40" : "bg-white"}`}><span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${day.current ? "bg-violet-600 text-white" : day.muted ? "text-slate-300" : "text-slate-600"}`}>{day.date}</span><div className="mt-1 space-y-1">{!day.muted && calendarTasks[day.date]?.map((task) => <button key={`${task.title}-${task.student}`} className={`block w-full truncate rounded-md px-2 py-1.5 text-left text-[10px] font-bold ${subjectTone(task.subject)}`} title={`${task.student} · ${task.title}`}><span className="opacity-60">{task.student}</span> · {task.title}</button>)}</div></div>)}</div></div></div>
        ) : (
          <div className="grid gap-5 p-5 lg:grid-cols-2"><section><div className="mb-3 flex items-center justify-between"><h2 className="font-black">등록 강좌</h2><Button variant="ghost" className="px-2"><Plus size={16} /> 추가</Button></div><div className="space-y-3">{demoCourses.map((course) => <div key={course.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><div><Badge className={subjectTone(course.subject)}>{course.subject}</Badge><h3 className="mt-2 font-bold">{course.title}</h3><p className="mt-1 text-xs text-slate-400">{demoStudents.find((student) => student.id === course.studentId)?.name} · {course.completedLessonCount}/{course.lessons.length}강</p></div><span className="text-lg">🎧</span></div><Progress value={(course.completedLessonCount / course.lessons.length) * 100} className="mt-4" /></div>)}</div></section><section><div className="mb-3 flex items-center justify-between"><h2 className="font-black">등록 문제집</h2><Button variant="ghost" className="px-2"><Plus size={16} /> 추가</Button></div><div className="space-y-3">{demoWorkbooks.map((book) => <div key={book.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between"><div><Badge className={subjectTone(book.subject)}>{book.subject}</Badge><h3 className="mt-2 font-bold">{book.title}</h3><p className="mt-1 text-xs text-slate-400">{book.unit} · {book.currentPage}~{book.endPage}쪽</p></div><span className="text-lg">📘</span></div><Progress value={(book.currentPage / book.endPage) * 100} className="mt-4" indicatorClassName="bg-blue-500" /></div>)}</div></section></div>
        )}
      </Card>

      {showImport && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-xl font-black">엠베스트 강좌 목차 가져오기</h2><p className="mt-1 text-xs text-slate-400">로그인 정보 없이 복사한 목차 텍스트만 정리합니다.</p></div><button onClick={() => setShowImport(false)} className="grid size-9 place-items-center rounded-lg bg-slate-100"><X size={18} /></button></div><div className="grid gap-5 p-5 md:grid-cols-2"><label><span className="mb-2 block text-sm font-bold">목차 붙여넣기</span><textarea value={outline} onChange={(event) => setOutline(event.target.value)} className="h-72 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm leading-7 outline-none focus:border-violet-400" /><Button variant="secondary" className="mt-3 w-full" onClick={() => setPreview(parseCourseOutline(outline))}><Sparkles size={16} /> 회차 자동 분리</Button></label><div><span className="mb-2 block text-sm font-bold">미리보기 · {preview.length}개 강의</span><div className="h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">{preview.map((lesson) => <div key={lesson.id} className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm shadow-sm"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-100 text-xs font-black text-violet-700">{lesson.index}</span><input defaultValue={lesson.title} className="min-w-0 flex-1 bg-transparent outline-none" /></div>)}</div><Button className="mt-3 w-full" onClick={() => setShowImport(false)}><Check size={16} /> 강좌로 저장</Button></div></div></div></div>}

      {showGenerate && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="text-xl font-black">AI/규칙 기반 자동 계획</h2><p className="mt-1 text-xs text-slate-400">생성 결과는 초안이며 부모님이 확인한 뒤 학생에게 공개됩니다.</p></div><button onClick={() => setShowGenerate(false)} className="grid size-9 place-items-center rounded-lg bg-slate-100"><X size={18} /></button></div><div className="grid gap-6 p-5 lg:grid-cols-[.8fr_1.2fr]"><div className="space-y-4"><label className="block"><span className="mb-2 block text-sm font-bold">학생</span><select className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option>민서 · 중2</option><option>지우 · 중1</option></select></label><label className="block"><span className="mb-2 block text-sm font-bold">목표</span><select className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"><option>중2 영어 문법 12~23강</option><option>쎈 수학 94~117쪽</option></select></label><div className="grid grid-cols-2 gap-3"><label><span className="mb-2 block text-sm font-bold">시작일</span><input type="date" defaultValue="2026-08-07" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label><label><span className="mb-2 block text-sm font-bold">완료일</span><input type="date" defaultValue="2026-08-21" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label></div><div><span className="mb-2 block text-sm font-bold">학습 요일</span><div className="flex gap-1">{["월", "화", "수", "목", "금", "토", "일"].map((day, index) => <button key={day} className={`grid size-9 place-items-center rounded-lg text-xs font-bold ${index < 5 ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}>{day}</button>)}</div></div><Button className="w-full" onClick={generatePlan}><WandSparkles size={17} /> 초안 생성</Button></div><div><div className="mb-3 flex items-center justify-between"><h3 className="font-black">계획 미리보기</h3>{generated.length > 0 && <Badge className="bg-violet-50 text-violet-700">{generated.length}일 · 12강</Badge>}</div>{generated.length ? <div className="space-y-2">{generated.map((item) => <div key={item.date} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className="rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-black text-slate-600">{item.date.slice(5).replace("-", ".")}</span><div className="flex-1"><strong className="text-sm">중2 영어 문법 {item.from}~{item.to}강</strong><p className="mt-1 text-xs text-slate-400">예상 {item.amount * 35}분 · 강의 완료 체크</p></div><button className="text-xs font-bold text-violet-600">수정</button></div>)}<div className="mt-4 flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => setGenerated([])}>다시 만들기</Button><Button className="flex-1" onClick={() => { setPublished(false); setShowGenerate(false); }}>초안 저장</Button></div></div> : <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center"><div><WandSparkles className="mx-auto text-slate-300" size={36} /><p className="mt-3 text-sm font-bold text-slate-500">조건을 확인하고 초안을 생성하세요.</p><p className="mt-1 text-xs text-slate-400">휴일과 하루 최대량을 자동으로 반영합니다.</p></div></div>}</div></div></div></div>}
    </div>
  );
}
