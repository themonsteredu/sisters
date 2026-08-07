"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, FileQuestion, Headphones, RotateCcw, Send, Timer, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { submitAttemptAction } from "@/app/student/tests/actions";
import { idleAttemptState, type AttemptState } from "@/lib/forms/action-state";
import type { StudentTestView } from "@/lib/data/tests";

const typeLabels: Record<string, string> = {
  multiple_choice: "뜻 고르기",
  spelling: "철자 입력",
  dictation: "듣고 쓰기",
  speaking: "말하기",
  short_answer: "단답형",
  fill_blank: "빈칸",
  ordering: "순서",
  essay: "서술형",
  oral: "구두 답변",
};

export interface StudentTestData {
  demo: boolean;
  signedIn: boolean;
  test: StudentTestView | null;
}

const inputClass = "w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400";

export function StudentTestRunner({ data }: { data: StudentTestData }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState((data.test?.timeLimitMinutes ?? 0) * 60);

  const [state, submit, pending] = useActionState(
    async (previous: AttemptState, formData: FormData) => {
      formData.set("responsesJson", JSON.stringify(answers));
      return submitAttemptAction(previous, formData);
    },
    idleAttemptState,
  );

  const test = data.test;
  const finished = Boolean(state.result);

  useEffect(() => {
    if (!test || finished || remainingSeconds <= 0) return;
    const timer = window.setInterval(() => setRemainingSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [test, finished, remainingSeconds]);

  const clock = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds]);

  if (!data.signedIn) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-black">로그인이 필요해요</h1>
        <Link href="/login" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-bold text-white">로그인하기</Link>
      </Card>
    );
  }

  if (!test || !test.questions.length) {
    return (
      <Card className="grid min-h-80 place-items-center p-8">
        <div className="text-center">
          <FileQuestion size={40} className="mx-auto text-slate-300" />
          <p className="mt-3 font-bold text-slate-500">예정된 테스트가 없어요.</p>
          <Link href="/student" className="mt-4 inline-flex text-sm font-bold text-violet-600">오늘 할 일로 돌아가기</Link>
        </div>
      </Card>
    );
  }

  if (test.attemptsRemaining <= 0 && !finished) {
    return (
      <Card className="grid min-h-80 place-items-center p-8">
        <div className="text-center">
          <Trophy size={40} className="mx-auto text-amber-400" />
          <p className="mt-3 font-bold text-slate-600">응시 가능 횟수를 모두 사용했어요.</p>
          <p className="mt-1 text-xs text-slate-400">{test.maxAttempts}회 중 {test.attemptsUsed}회 응시</p>
          <Link href="/student" className="mt-4 inline-flex text-sm font-bold text-violet-600">오늘 할 일로 돌아가기</Link>
        </div>
      </Card>
    );
  }

  if (finished && state.result) {
    const { graded, score, passed, needsParentReview, correctCount, gradedCount, attemptsRemaining } = state.result;
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <span className={`mx-auto grid size-16 place-items-center rounded-full ${!graded ? "bg-slate-100 text-slate-500" : passed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
          <Trophy size={30} />
        </span>
        <h1 className="mt-5 text-3xl font-black">{graded ? `${score}점` : "제출 완료"}</h1>
        <p role="status" className="mt-3 text-sm leading-6 text-slate-500">{state.message}</p>
        {graded ? (
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-400">자동 채점</span>
              <strong className="mt-1 block">{correctCount}/{gradedCount}문항</strong>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-slate-400">남은 응시</span>
              <strong className="mt-1 block">{attemptsRemaining}회</strong>
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">{gradedCount}문항에 답했습니다.</p>
        )}
        {needsParentReview ? (
          <p className="mt-5 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-700">
            서술형 문항이 있어 부모님 검수 후 최종 점수가 정해집니다.
          </p>
        ) : null}
        <Link href="/student" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-5 text-sm font-bold text-white">
          오늘 할 일로 돌아가기
        </Link>
      </Card>
    );
  }

  const question = test.questions[index];
  const answeredCount = Object.values(answers).filter((value) => value.trim()).length;
  const isLast = index === test.questions.length - 1;

  function setAnswer(value: string) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  function speakPrompt() {
    // Dictation reads the prompt aloud — never the answer, which the client
    // does not have.
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.prompt);
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black">{test.title}</h1>
            {data.demo ? <Badge className="bg-amber-50 text-amber-700">데모</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            합격 {test.passScore}점 · 남은 응시 {test.attemptsRemaining}회
          </p>
        </div>
        <Badge className={remainingSeconds <= 60 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}>
          <Timer size={14} /> {clock}
        </Badge>
      </div>

      <Progress value={((index + 1) / test.questions.length) * 100} />

      <Card className="p-6">
        <div className="flex items-center justify-between gap-2">
          <Badge>{typeLabels[question.type] ?? question.type}</Badge>
          <span className="text-xs text-slate-400">{index + 1} / {test.questions.length} · {question.points}점</span>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <h2 className="flex-1 text-lg font-black leading-7">{question.prompt}</h2>
          {question.type === "dictation" ? (
            <button type="button" onClick={speakPrompt} aria-label="문제 듣기" className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
              <Headphones size={18} />
            </button>
          ) : null}
        </div>

        <div className="mt-5 space-y-2">
          {question.type === "multiple_choice" && question.choices ? (
            question.choices.map((choice) => {
              const selected = answers[question.id] === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setAnswer(choice)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm font-semibold transition ${selected ? "border-violet-500 bg-violet-50 text-violet-800" : "border-slate-200 hover:border-violet-200"}`}
                >
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${selected ? "border-violet-500 bg-violet-500 text-white" : "border-slate-300"}`}>
                    {selected ? <Check size={14} /> : null}
                  </span>
                  {choice}
                </button>
              );
            })
          ) : question.type === "essay" ? (
            <textarea
              value={answers[question.id] ?? ""}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="답을 자세히 적어보세요. 부모님이 확인합니다."
              aria-label="답안"
              className={`${inputClass} min-h-32 resize-none`}
            />
          ) : (
            <input
              value={answers[question.id] ?? ""}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="답을 입력하세요"
              aria-label="답안"
              className={inputClass}
            />
          )}
        </div>
      </Card>

      {state.message && !state.ok ? (
        <p role="status" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{state.message}</p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => setIndex((v) => Math.max(0, v - 1))} disabled={index === 0}>
          <ChevronLeft size={17} /> 이전
        </Button>
        <span className="text-xs text-slate-400">{answeredCount}/{test.questions.length} 답변함</span>
        {isLast ? (
          <form action={submit}>
            <input type="hidden" name="testId" value={test.id} />
            <Button type="submit" disabled={pending}>
              <Send size={17} /> {pending ? "채점 중…" : "제출하고 채점"}
            </Button>
          </form>
        ) : (
          <Button onClick={() => setIndex((v) => Math.min(test.questions.length - 1, v + 1))}>
            다음 <ChevronRight size={17} />
          </Button>
        )}
      </div>

      {isLast ? null : (
        <button type="button" onClick={() => setIndex(test.questions.length - 1)} className="mx-auto flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <RotateCcw size={13} /> 마지막 문항으로 건너뛰기
        </button>
      )}
    </div>
  );
}
