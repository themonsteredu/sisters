"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen, Camera, Check, CheckCircle2, ChevronRight, FileText, Flame, Headphones,
  FileDown, Lightbulb, Play, Send, Sparkles, Square, Timer, Trophy, Upload, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { submitTaskAction } from "@/app/student/actions";
import { idleState, type ActionState } from "@/lib/forms/action-state";
import type { StudentHomeData, StudentTask } from "@/lib/data/student";
import { statusLabel, subjectTone } from "@/lib/utils";
import { sanitizeImage } from "@/lib/uploads/image";

const typeIcons = {
  lecture: Headphones,
  workbook: BookOpen,
  memorize: Sparkles,
  review: FileText,
  test: Trophy,
  custom: CheckCircle2,
};

const evidenceLabels: Record<string, string> = {
  photo: "사진", timer: "시간", test: "테스트", memo: "메모", audio: "음성", check: "체크",
};

const waitingStatuses = ["submitted", "parent_review", "ai_review"];

export function StudentHome({ data }: { data: StudentHomeData }) {
  const [activeTask, setActiveTask] = useState<StudentTask | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [notice, setNotice] = useState<ActionState>(idleState);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, submit, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      // Re-encode photos client-side (webp, max 2000px) before they travel.
      setPreparing(true);
      try {
        formData.delete("files");
        for (const original of files) {
          formData.append("files", original.type.startsWith("image/") ? await sanitizeImage(original) : original);
        }
      } finally {
        setPreparing(false);
      }

      const result = await submitTaskAction(previous, formData);
      if (result.ok) {
        setNotice(result);
        setActiveTask(null);
        setRunning(false);
        setFiles([]);
        setNote("");
      }
      return result;
    },
    idleState,
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const time = useMemo(
    () => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    [seconds],
  );

  const tasks = data.tasks;
  const completed = tasks.filter((task) => ["approved", "submitted", "parent_review"].includes(task.status)).length;
  // Guard the divide: a student with no tasks used to render NaN%.
  const completionPercent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const remainingMinutes = tasks.reduce((sum, task) => sum + (task.status === "approved" ? 0 : task.estimatedMinutes), 0);

  function openTask(task: StudentTask) {
    setActiveTask(task);
    setSeconds(0);
    setRunning(false);
    setNote("");
    setFiles([]);
  }

  if (!data.signedIn) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-black">로그인이 필요해요</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">학생 아이디와 PIN으로 다시 로그인해 주세요.</p>
        <Link href="/login" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-bold text-white">
          로그인하기
        </Link>
      </Card>
    );
  }

  const requiresPhoto = activeTask?.evidence.includes("photo") ?? false;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-700 p-6 text-white shadow-xl shadow-violet-200 md:p-8">
        <div className="absolute -right-10 -top-16 size-56 rounded-full bg-white/10" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-violet-100">
              <span className="grid size-9 place-items-center rounded-full bg-white/15 text-lg">{data.student?.avatar}</span>
              {data.student?.name}의 오늘
              {data.demo ? <Badge className="bg-white/20 text-white">데모</Badge> : null}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight">오늘도 잘 해낼 수 있어!</h1>
            <p className="mt-2 text-sm text-violet-100">할 일을 하나씩 끝내면 오늘 목표가 완성돼요.</p>
          </div>
          <div className="flex items-center gap-5 rounded-2xl bg-white/10 p-4 backdrop-blur">
            <div
              className="relative grid size-20 place-items-center rounded-full"
              style={{ background: `conic-gradient(white ${completionPercent}%, rgba(255,255,255,.18) 0)` }}
            >
              <div className="grid size-14 place-items-center rounded-full bg-violet-600 text-center">
                <strong className="text-xl">{completed}/{tasks.length}</strong>
              </div>
            </div>
            <div>
              <span className="text-xs text-violet-100">오늘 달성률</span>
              <strong className="mt-1 block text-xl">{completionPercent}%</strong>
            </div>
          </div>
        </div>
      </section>

      {notice.message ? (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice.message}</p>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">오늘 할 일</h2>
              <p className="mt-1 text-xs text-slate-400">마감이 빠른 순서로 보여요.</p>
            </div>
            <Badge className="bg-violet-50 text-violet-700">남은 학습 {remainingMinutes}분</Badge>
          </div>

          {tasks.length ? tasks.map((task, index) => {
            const Icon = typeIcons[task.type] ?? CheckCircle2;
            const done = task.status === "approved";
            const waiting = waitingStatuses.includes(task.status);
            return (
              <Card key={task.id} className={`group overflow-hidden transition ${done ? "bg-slate-50/70 opacity-75" : "hover:border-violet-200 hover:shadow-md"}`}>
                <div className="flex items-center gap-3 p-4 md:p-5">
                  <div className="relative">
                    <span className={`grid size-12 place-items-center rounded-2xl ${subjectTone(task.subject)}`}><Icon size={21} /></span>
                    <span className="absolute -left-1 -top-1 grid size-5 place-items-center rounded-full bg-slate-900 text-[10px] font-black text-white">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={subjectTone(task.subject)}>{task.subject}</Badge>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {task.dueTime ? `${task.dueTime}까지 · ` : ""}{task.estimatedMinutes}분
                      </span>
                    </div>
                    <h3 className={`mt-2 truncate font-black ${done ? "line-through" : ""}`}>{task.title}</h3>
                    <p className="mt-1 truncate text-xs text-slate-400">{task.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {task.evidence.map((item) => (
                        <span key={item} className="rounded-md bg-slate-100 px-1.5 py-1 text-[9px] font-bold text-slate-500">
                          {evidenceLabels[item] ?? item}
                        </span>
                      ))}
                    </div>
                    {task.materials.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {task.materials.map((material) => (
                          material.url ? (
                            <a
                              key={material.id}
                              href={material.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 hover:bg-violet-100"
                            >
                              <FileDown size={11} /> {material.title}
                            </a>
                          ) : null
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {done ? (
                    <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Check size={21} /></span>
                  ) : waiting ? (
                    <div className="text-right">
                      <Badge className="bg-amber-50 text-amber-700">{statusLabel(task.status)}</Badge>
                      <p className="mt-1 text-[10px] text-slate-400">부모님 확인 전</p>
                    </div>
                  ) : task.type === "test" || task.evidence.includes("test") ? (
                    <Link href="/student/tests" className="grid size-10 place-items-center rounded-xl bg-violet-600 text-white" aria-label="테스트 시작"><ChevronRight size={20} /></Link>
                  ) : (
                    <button type="button" onClick={() => openTask(task)} className="grid size-11 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-200 transition group-hover:scale-105" aria-label={`${task.title} 시작`}>
                      <Play size={19} fill="currentColor" />
                    </button>
                  )}
                </div>
              </Card>
            );
          }) : (
            <Card className="p-10 text-center text-sm text-slate-400">오늘 배정된 학습이 없어요.</Card>
          )}
        </div>

        <aside className="space-y-5">
          {data.nextTest ? (
            <Card className="overflow-hidden border-violet-200">
              <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><Trophy size={20} /></span>
                <h3 className="mt-4 font-black">{data.nextTest.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {data.nextTest.questionCount}문항 · {data.nextTest.timeLimitMinutes}분 · 합격 {data.nextTest.passScore}점
                </p>
                <Link href="/student/tests" className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white">
                  테스트 시작 <ChevronRight size={17} />
                </Link>
              </div>
            </Card>
          ) : null}

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black">이번 주 나의 기록</h3>
              <Trophy size={19} className="text-amber-500" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-orange-50 p-3 text-center">
                <Flame size={20} className="mx-auto text-orange-500" />
                <strong className="mt-2 block text-xl">{data.student?.streak ?? 0}일</strong>
                <span className="text-[10px] text-slate-400">연속 학습</span>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <CheckCircle2 size={20} className="mx-auto text-emerald-500" />
                <strong className="mt-2 block text-xl">{completionPercent}%</strong>
                <span className="text-[10px] text-slate-400">오늘 완료율</span>
              </div>
            </div>
            {data.weeklyGoalMinutes ? (
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="font-bold">주간 시간 목표</span>
                  <span className="text-slate-400">{data.weeklyStudiedMinutes}/{data.weeklyGoalMinutes}분</span>
                </div>
                <Progress value={Math.min(100, (data.weeklyStudiedMinutes / data.weeklyGoalMinutes) * 100)} />
              </div>
            ) : null}
          </Card>

          <Card className="flex items-start gap-3 bg-amber-50 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-amber-700"><Lightbulb size={18} /></span>
            <div>
              <strong className="text-sm text-amber-900">오늘의 팁</strong>
              <p className="mt-1 text-xs leading-5 text-amber-800">25분 집중하고 5분 쉬면 기억이 더 오래 남아요.</p>
            </div>
          </Card>
        </aside>
      </section>

      {activeTask ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label={activeTask.title} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className={subjectTone(activeTask.subject)}>{activeTask.subject}</Badge>
                  <Badge>{activeTask.estimatedMinutes}분</Badge>
                </div>
                <h2 className="mt-3 text-xl font-black">{activeTask.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{activeTask.detail}</p>
              </div>
              <button type="button" onClick={() => { setActiveTask(null); setRunning(false); }} aria-label="닫기" className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100"><X size={18} /></button>
            </div>

            <form ref={formRef} action={submit} className="space-y-5 p-5">
              <input type="hidden" name="taskId" value={activeTask.id} />
              <input type="hidden" name="elapsedMinutes" value={Math.floor(seconds / 60)} />
              <input type="hidden" name="requiresPhoto" value={requiresPhoto ? "true" : ""} />

              <div className="flex items-center justify-between rounded-2xl bg-slate-950 p-5 text-white">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-white/10"><Timer size={22} /></span>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">학습 타이머</span>
                    <strong className="block font-mono text-2xl tracking-wider">{time}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRunning((value) => !value)}
                  aria-label={running ? "타이머 정지" : "타이머 시작"}
                  className={`grid size-12 place-items-center rounded-full ${running ? "bg-rose-500" : "bg-emerald-500"}`}
                >
                  {running ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>
              </div>

              {activeTask.materials.length ? (
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                  <h3 className="flex items-center gap-2 text-sm font-black text-violet-900"><FileDown size={16} /> 학습지</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeTask.materials.map((material) => (
                      material.url ? (
                        <a
                          key={material.id}
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-violet-700 shadow-sm"
                        >
                          <FileDown size={13} /> {material.title}
                        </a>
                      ) : null
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-violet-700">새 탭에서 열립니다. 다 풀고 사진으로 제출해 주세요.</p>
                </div>
              ) : null}

              {requiresPhoto ? (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-black"><Camera size={17} /> 학습 사진 <span className="text-xs font-medium text-slate-400">필수</span></h3>
                  <label className="mt-3 grid min-h-36 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-violet-300 hover:bg-violet-50">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      multiple
                      className="sr-only"
                      onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                    />
                    <div>
                      <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm"><Upload size={20} /></span>
                      <p className="mt-3 text-sm font-bold">사진 촬영 또는 선택</p>
                      <p className="mt-1 text-xs text-slate-400">JPG · PNG · WEBP, 장당 최대 10MB</p>
                    </div>
                  </label>
                  {files.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {files.map((file) => <Badge key={`${file.name}-${file.lastModified}`} className="bg-violet-50 text-violet-700">{file.name}</Badge>)}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTask.evidence.includes("memo") ? (
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-black"><FileText size={17} /> 학습 메모</span>
                  <textarea
                    name="note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="어려웠던 문제나 기억할 내용을 적어보세요."
                    className="min-h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400"
                  />
                </label>
              ) : <input type="hidden" name="note" value={note} />}

              <div className="rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-700">
                <Sparkles size={15} className="mr-1 inline" /> 사진은 AI가 먼저 확인한 뒤 부모님이 최종 승인해요.
              </div>

              {state.message && !state.ok ? (
                <p role="status" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{state.message}</p>
              ) : null}

              <Button type="submit" className="h-12 w-full" disabled={pending || preparing || (requiresPhoto && files.length === 0)}>
                <Send size={17} /> {preparing ? "사진 처리 중…" : pending ? "제출 중…" : "학습 제출하기"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
