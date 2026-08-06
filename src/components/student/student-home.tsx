"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Camera, Check, CheckCircle2, ChevronRight, FileText, Flame, Headphones, Mic, Play, Send, Sparkles, Square, Timer, Trophy, Upload, X } from "lucide-react";
import { useDemo } from "@/components/providers/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoStudents, demoTests } from "@/lib/demo-data";
import type { StudyTask } from "@/lib/domain/types";
import { statusLabel, subjectTone } from "@/lib/utils";
import { sanitizeImage } from "@/lib/uploads/image";

const typeIcons = { lecture: Headphones, workbook: BookOpen, memorize: Sparkles, review: FileText, test: Trophy, custom: CheckCircle2 };

export function StudentHome() {
  const { tasks, updateTaskStatus } = useDemo();
  const student = demoStudents[0];
  const studentTasks = tasks.filter((task) => task.studentId === student.id);
  const [activeTask, setActiveTask] = useState<StudyTask | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const completed = studentTasks.filter((task) => task.status === "approved" || task.status === "submitted" || task.status === "parent_review").length;
  const nextTest = demoTests.find((test) => test.studentId === student.id && test.status === "published");

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const time = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`, [seconds]);

  function openTask(task: StudyTask) {
    setActiveTask(task);
    setSeconds(0);
    setRunning(false);
    setNote("");
    setFiles([]);
  }

  async function submitTask() {
    if (!activeTask) return;
    setUploading(true);
    try {
      for (const original of files) {
        const file = await sanitizeImage(original);
        const formData = new FormData();
        formData.set("file", file);
        formData.set("taskId", activeTask.id);
        const response = await fetch("/api/submissions/upload", { method: "POST", body: formData });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error ?? "사진 업로드에 실패했습니다.");
        }
      }
      updateTaskStatus(activeTask.id, activeTask.evidence.includes("photo") ? "submitted" : "parent_review");
      setRunning(false);
      setActiveTask(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-700 p-6 text-white shadow-xl shadow-violet-200 md:p-8"><div className="absolute -right-10 -top-16 size-56 rounded-full bg-white/10" /><div className="absolute -bottom-20 right-28 size-48 rounded-full bg-fuchsia-300/10" /><div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center"><div><div className="flex items-center gap-2 text-sm font-bold text-violet-100"><span className="grid size-9 place-items-center rounded-full bg-white/15 text-lg">{student.avatar}</span>{student.name}의 오늘</div><h1 className="mt-4 text-3xl font-black tracking-tight">오늘도 잘 해낼 수 있어! 💪</h1><p className="mt-2 text-sm text-violet-100">할 일을 하나씩 끝내면 오늘 목표가 완성돼요.</p></div><div className="flex items-center gap-5 rounded-2xl bg-white/10 p-4 backdrop-blur"><div className="relative grid size-20 place-items-center rounded-full" style={{ background: `conic-gradient(white ${(completed / studentTasks.length) * 100}%, rgba(255,255,255,.18) 0)` }}><div className="grid size-14 place-items-center rounded-full bg-violet-600 text-center"><strong className="text-xl">{completed}/{studentTasks.length}</strong></div></div><div><span className="text-xs text-violet-100">오늘 달성률</span><strong className="mt-1 block text-xl">{Math.round((completed / studentTasks.length) * 100)}%</strong><span className="mt-1 flex items-center gap-1 text-xs text-amber-200"><Flame size={14} /> {student.streak}일 연속</span></div></div></div></section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">오늘 할 일</h2><p className="mt-1 text-xs text-slate-400">마감이 빠른 순서로 보여요.</p></div><Badge className="bg-violet-50 text-violet-700">남은 학습 {studentTasks.reduce((sum, task) => sum + (task.status === "approved" ? 0 : task.estimatedMinutes), 0)}분</Badge></div>{studentTasks.map((task, index) => { const Icon = typeIcons[task.type]; const done = task.status === "approved"; const waiting = ["submitted", "parent_review", "ai_review"].includes(task.status); return <Card key={task.id} className={`group overflow-hidden transition ${done ? "bg-slate-50/70 opacity-75" : "hover:border-violet-200 hover:shadow-md"}`}><div className="flex items-center gap-3 p-4 md:p-5"><div className="relative"><span className={`grid size-12 place-items-center rounded-2xl ${subjectTone(task.subject)}`}><Icon size={21} /></span><span className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full bg-slate-900 text-[10px] font-black text-white">{index + 1}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge className={subjectTone(task.subject)}>{task.subject}</Badge><span className="text-[11px] font-semibold text-slate-400">{task.dueTime}까지 · {task.estimatedMinutes}분</span></div><h3 className={`mt-2 truncate font-black ${done ? "line-through" : ""}`}>{task.title}</h3><p className="mt-1 truncate text-xs text-slate-400">{task.detail}</p><div className="mt-2 flex flex-wrap gap-1.5">{task.evidence.map((item) => <span key={item} className="rounded-md bg-slate-100 px-1.5 py-1 text-[9px] font-bold text-slate-500">{item === "photo" ? "📷 사진" : item === "timer" ? "⏱ 시간" : item === "test" ? "✍️ 테스트" : item === "memo" ? "📝 메모" : "✓ 체크"}</span>)}</div></div>{done ? <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={21} /></span> : waiting ? <div className="text-right"><Badge className="bg-amber-50 text-amber-700">{statusLabel(task.status)}</Badge><p className="mt-1 text-[10px] text-slate-400">부모님 확인 전</p></div> : task.type === "test" || task.evidence.includes("test") ? <Link href="/student/tests" className="grid size-10 place-items-center rounded-xl bg-violet-600 text-white" aria-label="테스트 시작"><ChevronRight size={20} /></Link> : <button onClick={() => openTask(task)} className="grid size-11 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-200 transition group-hover:scale-105" aria-label={`${task.title} 시작`}><Play size={19} fill="currentColor" /></button>}</div></Card>; })}</div>
        <aside className="space-y-5">
          {nextTest && <Card className="overflow-hidden border-violet-200"><div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><Trophy size={20} /></span><Badge className="bg-white text-violet-700">오늘 20:00</Badge></div><h3 className="mt-4 font-black">{nextTest.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{nextTest.questions.length}문항 · {nextTest.timeLimitMinutes}분 · 합격 {nextTest.passScore}점</p><Link href="/student/tests" className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white">테스트 시작 <ChevronRight size={17} /></Link></div></Card>}
          <Card className="p-5"><div className="flex items-center justify-between"><h3 className="font-black">이번 주 나의 기록</h3><Trophy size={19} className="text-amber-500" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-orange-50 p-3 text-center"><Flame size={20} className="mx-auto text-orange-500" /><strong className="mt-2 block text-xl">{student.streak}일</strong><span className="text-[10px] text-slate-400">연속 학습</span></div><div className="rounded-xl bg-emerald-50 p-3 text-center"><CheckCircle2 size={20} className="mx-auto text-emerald-500" /><strong className="mt-2 block text-xl">84%</strong><span className="text-[10px] text-slate-400">완료율</span></div></div><div className="mt-4"><div className="mb-2 flex justify-between text-xs"><span className="font-bold">주간 시간 목표</span><span className="text-slate-400">612/720분</span></div><Progress value={85} /></div></Card>
          <Card className="flex items-start gap-3 bg-amber-50 p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white">💡</span><div><strong className="text-sm text-amber-900">오늘의 팁</strong><p className="mt-1 text-xs leading-5 text-amber-800">25분 집중하고 5분 쉬면 기억이 더 오래 남아요.</p></div></Card>
        </aside>
      </section>

      {activeTask && <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 p-5"><div><div className="flex items-center gap-2"><Badge className={subjectTone(activeTask.subject)}>{activeTask.subject}</Badge><Badge>{activeTask.estimatedMinutes}분</Badge></div><h2 className="mt-3 text-xl font-black">{activeTask.title}</h2><p className="mt-1 text-sm text-slate-400">{activeTask.detail}</p></div><button onClick={() => { setActiveTask(null); setRunning(false); }} className="grid size-9 place-items-center rounded-lg bg-slate-100"><X size={18} /></button></div><div className="space-y-5 p-5"><div className="flex items-center justify-between rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white/10"><Timer size={22} /></span><div><span className="text-[10px] uppercase tracking-widest text-slate-400">학습 타이머</span><strong className="block font-mono text-2xl tracking-wider">{time}</strong></div></div><button onClick={() => { setRunning((value) => !value); updateTaskStatus(activeTask.id, "in_progress"); }} className={`grid size-12 place-items-center rounded-full ${running ? "bg-rose-500" : "bg-emerald-500"}`}>{running ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button></div>{activeTask.evidence.includes("photo") && <div><h3 className="flex items-center gap-2 text-sm font-black"><Camera size={17} /> 학습 사진 <span className="text-xs font-medium text-slate-400">필수</span></h3><label className="mt-3 grid min-h-36 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-violet-300 hover:bg-violet-50"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /><div><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm"><Upload size={20} /></span><p className="mt-3 text-sm font-bold">사진 촬영 또는 선택</p><p className="mt-1 text-xs text-slate-400">JPG · PNG · WEBP, 장당 최대 10MB</p></div></label>{files.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{files.map((file) => <Badge key={`${file.name}-${file.lastModified}`} className="bg-violet-50 text-violet-700">📷 {file.name}</Badge>)}</div>}</div>}{activeTask.evidence.includes("memo") && <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-black"><FileText size={17} /> 학습 메모</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="어려웠던 문제나 기억할 내용을 적어보세요." className="min-h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400" /></label>}{activeTask.evidence.includes("audio") && <Button variant="secondary" className="w-full"><Mic size={17} /> 음성 녹음 시작</Button>}<div className="rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-700"><Sparkles size={15} className="mr-1 inline" /> 사진은 AI가 흐림·페이지·작성량을 먼저 확인한 뒤 부모님이 최종 승인해요.</div><Button className="h-12 w-full" onClick={submitTask} disabled={uploading || (activeTask.evidence.includes("photo") && files.length === 0)}><Send size={17} /> {uploading ? "사진 처리·업로드 중…" : "학습 제출하기"}</Button></div></div></div>}
    </div>
  );
}
