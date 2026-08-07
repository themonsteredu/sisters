"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileQuestion, Plus, Send, Trash2, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createTestAction, publishTestAction } from "@/app/tests/actions";
import { idleState, type ActionState } from "@/lib/forms/action-state";
import { useFields } from "@/lib/forms/use-fields";
import type { ParentTest } from "@/lib/data/tests";
import { subjectTone } from "@/lib/utils";

export interface TestWorkspaceData {
  demo: boolean;
  hasFamily: boolean;
  tests: ParentTest[];
  students: Array<{ id: string; name: string; grade: number }>;
  subjects: Array<{ id: string; name: string }>;
}

type DraftQuestion = {
  type: "multiple_choice" | "spelling" | "short_answer" | "essay";
  prompt: string;
  choicesText: string;
  answer: string;
  points: string;
};

const emptyQuestion: DraftQuestion = { type: "multiple_choice", prompt: "", choicesText: "", answer: "", points: "10" };

const typeLabels: Record<DraftQuestion["type"], string> = {
  multiple_choice: "객관식",
  spelling: "철자",
  short_answer: "단답형",
  essay: "서술형",
};

const statusLabels: Record<string, string> = {
  draft: "초안", published: "학생 공개", completed: "완료", retest: "재시험",
};

const inputClass = "h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400";

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
      {state.message}
    </p>
  );
}

export function TestWorkspace({ data }: { data: TestWorkspaceData }) {
  const [showCreate, setShowCreate] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ ...emptyQuestion }]);
  const [notice, setNotice] = useState<ActionState>(idleState);

  const fields = useFields({
    studentId: data.students[0]?.id ?? "",
    subjectId: data.subjects[0]?.id ?? "",
    title: "",
    scheduledDate: "",
    passScore: "80",
    timeLimitMinutes: "20",
    maxAttempts: "2",
  });

  const [createState, submitCreate, creating] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      formData.set("questionsJson", JSON.stringify(questions.map((question) => ({
        type: question.type,
        prompt: question.prompt,
        choices: question.type === "multiple_choice"
          ? question.choicesText.split("\n").map((line) => line.trim()).filter(Boolean)
          : undefined,
        answer: question.answer,
        points: Number(question.points) || 10,
      }))));
      const result = await createTestAction(previous, formData);
      if (result.ok) {
        setNotice(result);
        setShowCreate(false);
        setQuestions([{ ...emptyQuestion }]);
        fields.reset();
      }
      return result;
    },
    idleState,
  );

  const [publishState, submitPublish, publishing] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await publishTestAction(previous, formData);
      if (result.ok) setNotice(result);
      return result;
    },
    idleState,
  );

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const canCreate = data.students.length > 0 && data.subjects.length > 0;

  if (!data.hasFamily) {
    return (
      <Card className="mx-auto max-w-2xl p-7 md:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-600"><UserPlus size={22} /></span>
        <h1 className="mt-5 text-2xl font-black">가족 공간을 먼저 만들어 주세요</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">학생을 등록해야 테스트를 만들 수 있습니다.</p>
        <Link href="/onboarding" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white">가족 설정 시작</Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-violet-600">테스트</p>
            {data.demo ? <Badge className="bg-amber-50 text-amber-700">데모 · 저장 안 됨</Badge> : <Badge className="bg-emerald-50 text-emerald-700">운영 데이터</Badge>}
          </div>
          <h1 className="mt-1 text-3xl font-black tracking-tight">확인 테스트로 마무리</h1>
          <p className="mt-2 text-sm text-slate-500">채점은 서버에서 이뤄지고, 서술형은 부모님 검수로 넘어갑니다.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!canCreate}><Plus size={17} /> 테스트 만들기</Button>
      </div>

      <Feedback state={notice} />
      {publishState.message && !publishState.ok ? <Feedback state={publishState} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.tests.length ? data.tests.map((test) => (
          <Card key={test.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <Badge className={subjectTone(test.subject)}>{test.subject}</Badge>
              <Badge className={test.status === "published" ? "bg-emerald-50 text-emerald-700" : test.status === "retest" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}>
                {statusLabels[test.status] ?? test.status}
              </Badge>
            </div>
            <h2 className="mt-3 font-black">{test.title}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {test.scheduledDate} · {test.questionCount}문항 · {test.timeLimitMinutes}분 · 합격 {test.passScore}점
            </p>
            <p className="mt-2 text-xs text-slate-500">
              응시 {test.attemptCount}/{test.maxAttempts}회
              {test.latestScore !== null ? ` · 최고 ${test.latestScore}점` : ""}
            </p>
            {test.status === "draft" ? (
              <form action={submitPublish} className="mt-4">
                <input type="hidden" name="testId" value={test.id} />
                <Button type="submit" variant="secondary" className="w-full" disabled={publishing || test.questionCount === 0}>
                  <Send size={15} /> 학생에게 공개
                </Button>
              </form>
            ) : test.status === "completed" ? (
              <p className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} /> 응시 완료</p>
            ) : null}
          </Card>
        )) : (
          <Card className="col-span-full grid place-items-center p-12 text-center">
            <FileQuestion size={40} className="text-slate-300" />
            <p className="mt-3 font-bold text-slate-500">등록된 테스트가 없습니다.</p>
            <p className="mt-1 text-xs text-slate-400">테스트를 만들어 학생에게 공개해 보세요.</p>
          </Card>
        )}
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label="테스트 만들기" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <h2 className="text-xl font-black">테스트 만들기</h2>
                <p className="mt-1 text-xs text-slate-400">초안으로 저장한 뒤 공개하면 학생이 응시할 수 있습니다.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="닫기" className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100"><X size={18} /></button>
            </div>

            <form action={submitCreate} className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">학생</span>
                  <select {...fields.field("studentId")} required className={inputClass}>
                    {data.students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.grade}학년</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold">과목</span>
                  <select {...fields.field("subjectId")} required className={inputClass}>
                    {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold">테스트 이름</span>
                <input {...fields.field("title")} required maxLength={120} placeholder="중2 영단어 1회" className={inputClass} />
              </label>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label><span className="mb-2 block text-sm font-bold">응시일</span><input {...fields.field("scheduledDate")} type="date" required className={inputClass} /></label>
                <label><span className="mb-2 block text-sm font-bold">합격 점수</span><input {...fields.field("passScore")} type="number" min={0} max={100} required className={inputClass} /></label>
                <label><span className="mb-2 block text-sm font-bold">제한 시간(분)</span><input {...fields.field("timeLimitMinutes")} type="number" min={1} max={180} required className={inputClass} /></label>
                <label><span className="mb-2 block text-sm font-bold">응시 횟수</span><input {...fields.field("maxAttempts")} type="number" min={1} max={5} required className={inputClass} /></label>
              </div>

              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" name="shuffleQuestions" defaultChecked className="size-4" /> 문항 순서 섞기
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black">문항 {questions.length}개</h3>
                  <Button type="button" variant="ghost" className="px-2" onClick={() => setQuestions((c) => [...c, { ...emptyQuestion }])}>
                    <Plus size={16} /> 문항 추가
                  </Button>
                </div>

                {questions.map((question, index) => (
                  <div key={index} className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm">{index + 1}번</strong>
                      <div className="flex items-center gap-2">
                        <select
                          value={question.type}
                          onChange={(event) => updateQuestion(index, { type: event.target.value as DraftQuestion["type"] })}
                          aria-label={`${index + 1}번 문항 유형`}
                          className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
                        >
                          {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        {questions.length > 1 ? (
                          <button type="button" onClick={() => setQuestions((c) => c.filter((_, i) => i !== index))} aria-label={`${index + 1}번 문항 삭제`} className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-500">
                            <Trash2 size={15} />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <input
                      value={question.prompt}
                      onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                      placeholder="문제를 입력하세요"
                      aria-label={`${index + 1}번 문제`}
                      className={inputClass}
                    />

                    {question.type === "multiple_choice" ? (
                      <textarea
                        value={question.choicesText}
                        onChange={(event) => updateQuestion(index, { choicesText: event.target.value })}
                        placeholder={"보기를 한 줄에 하나씩\n예: 성취하다\n예: 도착하다"}
                        aria-label={`${index + 1}번 보기`}
                        className="min-h-20 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400"
                      />
                    ) : null}

                    <div className="grid grid-cols-[1fr_100px] gap-3">
                      <input
                        value={question.answer}
                        onChange={(event) => updateQuestion(index, { answer: event.target.value })}
                        placeholder={question.type === "essay" ? "서술형은 부모님이 채점합니다" : "정답"}
                        disabled={question.type === "essay"}
                        aria-label={`${index + 1}번 정답`}
                        className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                      />
                      <input
                        value={question.points}
                        onChange={(event) => updateQuestion(index, { points: event.target.value })}
                        type="number"
                        min={1}
                        max={100}
                        aria-label={`${index + 1}번 배점`}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Feedback state={createState} />

              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "저장 중…" : `초안 저장 (${questions.length}문항)`}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
