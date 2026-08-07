"use client";

import { useActionState, useState } from "react";
import { GraduationCap, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { gradeAttemptAction } from "@/app/reviews/actions";
import { idleState, type ActionState } from "@/lib/forms/action-state";
import type { PendingAttempt } from "@/lib/data/attempt-review";

export function AttemptGrader({ attempts }: { attempts: PendingAttempt[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(attempts[0]?.id ?? null);
  const [awarded, setAwarded] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");

  const [state, submit, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      formData.set("awardedJson", JSON.stringify(awarded));
      const result = await gradeAttemptAction(previous, formData);
      if (result.ok) {
        setAwarded({});
        setFeedback("");
        const remaining = attempts.filter((item) => item.id !== formData.get("attemptId"));
        setSelectedId(remaining[0]?.id ?? null);
      }
      return result;
    },
    idleState,
  );

  if (!attempts.length) return null;

  const selected = attempts.find((item) => item.id === selectedId) ?? attempts[0];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><GraduationCap size={18} /></span>
          <div>
            <h2 className="font-black">서술형 채점 대기</h2>
            <p className="mt-0.5 text-xs text-slate-400">자동 채점은 끝났고 서술형 배점만 남았습니다.</p>
          </div>
        </div>
        <Badge className="bg-amber-50 text-amber-700">{attempts.length}건</Badge>
      </div>

      {attempts.length > 1 ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          {attempts.map((attempt) => (
            <button
              key={attempt.id}
              type="button"
              onClick={() => { setSelectedId(attempt.id); setAwarded({}); }}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${selected.id === attempt.id ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-500"}`}
            >
              {attempt.studentName} · {attempt.testTitle}
            </button>
          ))}
        </div>
      ) : null}

      <form action={submit} className="space-y-4 p-5">
        <input type="hidden" name="attemptId" value={selected.id} />

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <strong className="text-sm text-slate-800">{selected.studentName}</strong>
          <span>{selected.testTitle}</span>
          <Badge>{selected.attemptNumber}회차</Badge>
          <Badge className="bg-slate-100 text-slate-600">자동 채점 {selected.autoScore}점</Badge>
          <span className="text-slate-400">합격 {selected.passScore}점</span>
        </div>

        {selected.answers.map((answer, index) => (
          <div key={answer.questionId} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-400">{index + 1}번 · {answer.points}점</span>
                <h3 className="mt-1 font-bold">{answer.prompt}</h3>
              </div>
              <label className="shrink-0">
                <span className="mb-1 block text-[10px] font-bold text-slate-400">부여 점수</span>
                <input
                  type="number"
                  min={0}
                  max={answer.points}
                  value={awarded[answer.questionId] ?? ""}
                  onChange={(event) => setAwarded((current) => ({ ...current, [answer.questionId]: event.target.value }))}
                  placeholder="0"
                  aria-label={`${index + 1}번 부여 점수 (최대 ${answer.points})`}
                  className="h-10 w-20 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400"
                />
              </label>
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400"><PencilLine size={12} /> 학생 답안</span>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{answer.response || "(작성하지 않음)"}</p>
            </div>

            {answer.referenceAnswer ? (
              <p className="mt-2 text-xs text-slate-400">참고 답안 · {answer.referenceAnswer}</p>
            ) : null}
            {answer.explanation ? <p className="mt-1 text-xs text-slate-400">해설 · {answer.explanation}</p> : null}
          </div>
        ))}

        <label className="block">
          <span className="mb-2 block text-sm font-black">학생에게 남길 말 (선택)</span>
          <textarea
            name="feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="잘한 점이나 보완할 부분을 적어주세요."
            className="min-h-20 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400"
          />
        </label>

        {state.message ? (
          <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            {state.message}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "저장 중…" : "채점 확정"}
        </Button>
        <p className="text-center text-[11px] text-slate-400">
          확정하면 전체 문항 기준으로 최종 점수를 다시 계산합니다.
        </p>
      </form>
    </Card>
  );
}
