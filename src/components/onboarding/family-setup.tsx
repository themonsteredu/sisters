"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, UserPlus, Users } from "lucide-react";
import { createFamilySetup, type FamilySetupState } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DraftStudent {
  key: string;
  name: string;
  handle: string;
  birthDate: string;
  grade: number;
  pin: string;
}

const initialState: FamilySetupState = { ok: false, message: "" };

function draftStudent(key: string): DraftStudent {
  return { key, name: "", handle: "", birthDate: "", grade: 1, pin: "" };
}

export function FamilySetup({ initialFamilyName = "" }: { initialFamilyName?: string }) {
  const [state, formAction, pending] = useActionState(createFamilySetup, initialState);
  const [students, setStudents] = useState<DraftStudent[]>([
    draftStudent("student-1"),
    draftStudent("student-2"),
  ]);

  function updateStudent(key: string, patch: Partial<DraftStudent>) {
    setStudents((current) => current.map((student) => student.key === key ? { ...student, ...patch } : student));
  }

  function addStudent() {
    setStudents((current) => current.length >= 6 ? current : [...current, draftStudent(crypto.randomUUID())]);
  }

  function removeStudent(key: string) {
    setStudents((current) => current.length === 1 ? current : current.filter((student) => student.key !== key));
  }

  const payload = students.map((student) => ({
    name: student.name,
    handle: student.handle,
    birthDate: student.birthDate,
    grade: student.grade,
    pin: student.pin,
  }));

  return (
    <Card className="mx-auto max-w-3xl overflow-hidden">
      <div className="border-b border-slate-100 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Users /></span>
          <div>
            <p className="text-xs font-bold text-slate-400">1단계</p>
            <h1 className="mt-1 text-2xl font-black">가족과 자녀를 등록해 주세요</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">학생 아이디와 PIN은 자녀가 직접 로그인할 때 사용합니다.</p>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-6 p-6 md:p-8">
        <input type="hidden" name="studentsJson" value={JSON.stringify(payload)} />
        <label className="block">
          <span className="mb-2 block text-sm font-bold">가족 이름</span>
          <input
            name="familyName"
            required
            minLength={2}
            maxLength={50}
            defaultValue={initialFamilyName}
            placeholder="예: 우리 가족"
            className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-[#6b59cc] focus:ring-4 focus:ring-[#ece9fa]"
          />
        </label>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-black">자녀 정보</h2><p className="mt-1 text-xs text-slate-400">최대 6명까지 등록할 수 있습니다.</p></div>
            <Button type="button" variant="secondary" onClick={addStudent} disabled={students.length >= 6}><Plus size={16} /> 자녀 추가</Button>
          </div>

          {students.map((student, index) => (
            <fieldset key={student.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 md:p-5">
              <legend className="sr-only">자녀 {index + 1}</legend>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><UserPlus size={17} className="text-slate-500" /><strong className="text-sm">자녀 {index + 1}</strong></div>
                <button type="button" onClick={() => removeStudent(student.key)} disabled={students.length === 1} className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30" aria-label={`자녀 ${index + 1} 삭제`}><Trash2 size={16} /></button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label><span className="mb-2 block text-xs font-bold text-slate-600">이름</span><input required maxLength={30} value={student.name} onChange={(event) => updateStudent(student.key, { name: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-[#6b59cc]" /></label>
                <label><span className="mb-2 block text-xs font-bold text-slate-600">학생 로그인 아이디</span><input required minLength={3} maxLength={30} autoCapitalize="none" autoCorrect="off" value={student.handle} onChange={(event) => updateStudent(student.key, { handle: event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })} placeholder="영문 소문자·숫자 3자 이상" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-[#6b59cc]" /></label>
                <label><span className="mb-2 block text-xs font-bold text-slate-600">생년월일</span><input required type="date" value={student.birthDate} onChange={(event) => updateStudent(student.key, { birthDate: event.target.value })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-[#6b59cc]" /></label>
                <label><span className="mb-2 block text-xs font-bold text-slate-600">학년</span><select value={student.grade} onChange={(event) => updateStudent(student.key, { grade: Number(event.target.value) })} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-[#6b59cc]">{Array.from({ length: 12 }, (_, grade) => <option key={grade + 1} value={grade + 1}>{grade + 1}학년</option>)}</select></label>
                <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold text-slate-600">학생 PIN</span><input required type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} value={student.pin} onChange={(event) => updateStudent(student.key, { pin: event.target.value.replace(/\D/g, "") })} placeholder="숫자 6자리" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 tracking-[.25em] outline-none focus:border-[#6b59cc]" /></label>
              </div>
            </fieldset>
          ))}
        </div>

        {state.message ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{state.message}</p> : null}
        <Button type="submit" className="h-12 w-full" disabled={pending}>{pending ? "안전하게 저장 중…" : "가족·자녀 저장하고 다음 단계"}</Button>
        <p className="text-center text-xs leading-5 text-slate-400">PIN은 원문으로 저장하지 않고 안전하게 해시 처리합니다.</p>
      </form>
    </Card>
  );
}
