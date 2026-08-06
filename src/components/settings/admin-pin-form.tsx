"use client";

import { useActionState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { saveAdminPin, type AdminPinState } from "@/app/settings/admin-pin/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const initialState: AdminPinState = { ok: false, message: "" };

export function AdminPinForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(saveAdminPin, initialState);

  return (
    <Card className="mx-auto max-w-xl p-6 md:p-8">
      <span className="grid size-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
        <ShieldCheck size={23} />
      </span>
      <h1 className="mt-5 text-2xl font-black">{configured ? "관리자 PIN 변경" : "관리자 PIN 만들기"}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        숫자 6자리로 설정하세요. 설정 후에는 이메일 없이 관리자 탭에서 PIN만 입력해 접속할 수 있습니다.
      </p>
      <form action={action} className="mt-7 space-y-4">
        <PinField name="pin" label="새 관리자 PIN" autoComplete="new-password" />
        <PinField name="confirmation" label="PIN 한 번 더 입력" autoComplete="new-password" />
        {state.message ? (
          <p role="status" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {state.message}
          </p>
        ) : null}
        <Button type="submit" className="h-12 w-full" disabled={pending}>
          {pending ? "안전하게 저장 중…" : configured ? "PIN 변경하고 관리자 열기" : "PIN 만들고 관리자 열기"}
        </Button>
      </form>
      <p className="mt-5 text-xs leading-5 text-slate-400">
        PIN은 복원할 수 없는 해시로 저장됩니다. 5번 틀리면 15분 동안 관리자 로그인이 잠깁니다.
      </p>
    </Card>
  );
}

function PinField({ name, label, autoComplete }: { name: string; label: string; autoComplete: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-50">
        <LockKeyhole size={18} className="text-slate-400" />
        <input
          required
          name={name}
          type="password"
          inputMode="numeric"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          autoComplete={autoComplete}
          className="h-12 min-w-0 flex-1 tracking-[.45em] outline-none"
        />
      </span>
    </label>
  );
}
