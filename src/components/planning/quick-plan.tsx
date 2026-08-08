"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Sparkles, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { parsePlanIntent, type PlanIntent } from "@/lib/domain/plan-intent";
import type { PlanningWorkspaceData } from "@/lib/data/planning";

const examples = [
  "민서 영어 문법 12강 8/10~8/28 평일 하루 2강",
  "지우 수학 80쪽 다음주부터 3주 월수금 하루 5쪽",
  "민서 영어 100단어 9/1~9/20 매일 5단어, 9/15 빼고",
];

/**
 * One line in, a filled-in plan out.
 *
 * The parse is deterministic and local, so it is instant and needs no provider
 * key. It never creates anything — it prefills the plan form and opens it, so
 * the parent sees exactly what will be made and can correct it first.
 */
export function QuickPlan({
  data,
  today,
  onApply,
}: {
  data: PlanningWorkspaceData;
  today: string;
  onApply: (intent: PlanIntent) => void;
}) {
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);

  const intent = useMemo(
    () => parsePlanIntent(text, { students: data.students, subjects: data.subjects, today }),
    [text, data.students, data.subjects, today],
  );

  const ready = intent.missing.length === 0;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><WandSparkles size={18} /></span>
        <div>
          <h2 className="font-black">한 줄로 계획 만들기</h2>
          <p className="mt-0.5 text-xs text-slate-400">평소 말하듯 적으면 알아서 채웁니다. 확인 후 만들어져요.</p>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(event) => { setText(event.target.value); setTouched(true); }}
        rows={2}
        placeholder={examples[0]}
        aria-label="계획 설명"
        className="mt-4 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-violet-400"
      />

      {!touched ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => { setText(example); setTouched(true); }}
              className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-500 hover:bg-slate-200"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}

      {touched && text.trim() ? (
        <>
          {intent.understood.length ? (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><Sparkles size={13} /> 이렇게 이해했어요</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {intent.understood.map((item) => (
                  <Badge key={item} className="bg-violet-50 text-violet-700">{item}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          {intent.missing.length ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-black text-amber-800">
                <AlertTriangle size={14} /> 이건 더 알려주세요
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-700">
                {intent.missing.join(" · ")} — 문장에 덧붙이거나, 아래 버튼을 눌러 폼에서 채우면 됩니다.
              </p>
            </div>
          ) : null}

          <Button
            type="button"
            className="mt-4 w-full"
            variant={ready ? "primary" : "secondary"}
            onClick={() => onApply(intent)}
          >
            <Check size={16} /> {ready ? "확인하고 만들기" : "폼에 채워서 이어하기"}
          </Button>
        </>
      ) : null}
    </Card>
  );
}
