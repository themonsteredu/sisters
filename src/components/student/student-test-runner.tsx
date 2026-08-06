"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Headphones, Mic, Play, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { demoTests } from "@/lib/demo-data";
import { calculateScore, gradeDeterministicAnswer } from "@/lib/domain/grading";

export function StudentTestRunner() {
  const test = demoTests[0];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<{ score: number; parentReview: boolean } | null>(null);
  const question = test.questions[index];
  const answered = Object.values(answers).filter(Boolean).length;

  const typeLabel = useMemo(() => ({ multiple_choice: "뜻 고르기", spelling: "철자 입력", dictation: "듣고 쓰기", speaking: "말하기", short_answer: "단답형", fill_blank: "빈칸", ordering: "순서", essay: "서술형", oral: "구두 답변" })[question.type], [question.type]);

  function playWord() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(question.answer));
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  function record() {
    setRecording(true);
    window.setTimeout(() => {
      setAnswers((current) => ({ ...current, [question.id]: String(question.answer) }));
      setRecording(false);
    }, 1400);
  }

  function submit() {
    const graded = test.questions.map((item) => gradeDeterministicAnswer(item, answers[item.id] ?? ""));
    const deterministic = graded.filter((item) => !item.needsParentReview);
    const deterministicPoints = test.questions.filter((item) => !["speaking", "essay", "oral"].includes(item.type)).reduce((sum, item) => sum + item.points, 0);
    setResult({ score: calculateScore(deterministic, deterministicPoints), parentReview: graded.some((item) => item.needsParentReview) });
  }

  if (result) {
    return <div className="mx-auto max-w-2xl space-y-5"><div className="text-center"><span className="mx-auto grid size-20 place-items-center rounded-full bg-amber-100 text-amber-600"><Trophy size={38} /></span><p className="mt-5 text-sm font-bold text-violet-600">테스트 완료</p><h1 className="mt-1 text-3xl font-black">정말 잘했어, 민서!</h1></div><Card className="p-6 text-center md:p-8"><span className="text-sm font-bold text-slate-400">객관식·철자 임시 점수</span><strong className="mt-2 block text-6xl font-black text-violet-600">{result.score}<small className="text-xl">점</small></strong><Badge className={`mt-4 px-4 py-2 ${result.score >= test.passScore ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{result.score >= test.passScore ? "합격" : "재시험 권장"} · 기준 {test.passScore}점</Badge><div className="mt-7 grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-3"><strong className="text-lg">{test.questions.length}</strong><span className="block text-[10px] text-slate-400">전체 문항</span></div><div className="rounded-xl bg-emerald-50 p-3"><strong className="text-lg text-emerald-700">{Math.round((result.score / 100) * 4)}</strong><span className="block text-[10px] text-slate-400">객관 정답</span></div><div className="rounded-xl bg-amber-50 p-3"><strong className="text-lg text-amber-700">1</strong><span className="block text-[10px] text-slate-400">부모 검수</span></div></div>{result.parentReview && <p className="mt-5 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-700"><Sparkles size={14} className="mr-1 inline" /> 말하기 답변은 AI 전사 후 부모님이 최종 점수를 확인해요.</p>}<div className="mt-6 flex gap-2"><Button variant="secondary" className="flex-1" onClick={() => { setResult(null); setIndex(0); }}><RotateCcw size={17} /> 오답 다시 보기</Button><Button className="flex-1">오늘 학습으로</Button></div></Card></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-violet-600">영어 단어 테스트</p><h1 className="mt-1 text-2xl font-black">{test.title}</h1><p className="mt-2 text-xs text-slate-400">합격 {test.passScore}점 · 제한 {test.timeLimitMinutes}분 · 최대 {test.maxAttempts}회</p></div><div className="rounded-xl bg-slate-900 px-4 py-2 text-center text-white"><span className="block text-[9px] uppercase tracking-wider text-slate-400">남은 시간</span><strong className="font-mono text-lg">13:42</strong></div></div>
      <div><div className="mb-2 flex justify-between text-xs font-bold text-slate-400"><span>{index + 1}/{test.questions.length}문항</span><span>{answered}개 답변</span></div><Progress value={((index + 1) / test.questions.length) * 100} /></div>
      <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4"><Badge className="bg-violet-100 text-violet-700">{typeLabel}</Badge><span className="text-xs font-bold text-slate-400">{question.points}점</span></div><div className="min-h-80 p-6 md:p-10"><p className="text-center text-sm font-bold text-slate-400">문제 {index + 1}</p><h2 className="mx-auto mt-4 max-w-xl text-center text-2xl font-black leading-10">{question.prompt}</h2>{question.type === "multiple_choice" && <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-2">{question.choices?.map((choice, choiceIndex) => <button key={choice} onClick={() => setAnswers((current) => ({ ...current, [question.id]: choice }))} className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-bold transition ${answers[question.id] === choice ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-300"}`}><span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-xs">{choiceIndex + 1}</span>{choice}{answers[question.id] === choice && <Check size={17} className="ml-auto" />}</button>)}</div>}{["spelling", "dictation"].includes(question.type) && <div className="mx-auto mt-8 max-w-md">{question.type === "dictation" && <button onClick={playWord} className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-200" aria-label="단어 듣기"><Headphones size={28} /></button>}<input autoFocus value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="영단어를 입력하세요" className="h-14 w-full rounded-2xl border-2 border-slate-200 px-5 text-center text-xl font-bold tracking-wider outline-none focus:border-violet-500" />{question.type === "dictation" && <p className="mt-3 text-center text-xs text-slate-400">스피커 버튼을 눌러 다시 들을 수 있어요.</p>}</div>}{question.type === "speaking" && <div className="mx-auto mt-8 max-w-md text-center"><button onClick={record} disabled={recording} className={`mx-auto grid size-20 place-items-center rounded-full text-white shadow-lg transition ${recording ? "animate-pulse bg-rose-500 shadow-rose-200" : answers[question.id] ? "bg-emerald-500 shadow-emerald-200" : "bg-violet-600 shadow-violet-200"}`}>{recording ? <Mic size={30} /> : answers[question.id] ? <Check size={32} /> : <Mic size={30} />}</button><p className="mt-4 text-sm font-bold">{recording ? "듣고 있어요…" : answers[question.id] ? `인식: ${answers[question.id]}` : "버튼을 누르고 말하세요"}</p><button onClick={playWord} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-600"><Play size={13} /> 먼저 발음 듣기</button></div>}</div><div className="flex items-center justify-between border-t border-slate-100 p-4"><Button variant="secondary" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}><ChevronLeft size={17} /> 이전</Button>{index < test.questions.length - 1 ? <Button onClick={() => setIndex((value) => Math.min(test.questions.length - 1, value + 1))}>다음 <ChevronRight size={17} /></Button> : <Button onClick={submit} disabled={answered < test.questions.length - 1}><Trophy size={17} /> 채점하기</Button>}</div></Card>
      <div className="flex justify-center gap-2">{test.questions.map((item, itemIndex) => <button key={item.id} onClick={() => setIndex(itemIndex)} className={`grid size-8 place-items-center rounded-lg text-xs font-bold ${index === itemIndex ? "bg-violet-600 text-white" : answers[item.id] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{itemIndex + 1}</button>)}</div>
    </div>
  );
}
