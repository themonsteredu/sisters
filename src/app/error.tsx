"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Server Component errors arrive here with a generic message; `digest`
    // is the key that matches the detailed server-side log entry.
    console.error(JSON.stringify({ level: "error", scope: "app/error", digest: error.digest, message: error.message }));
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black text-slate-900">화면을 불러오지 못했습니다</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          일시적인 문제일 수 있습니다. 다시 시도해도 같은 화면이 나오면 잠시 후 접속해 주세요.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-slate-400">오류 코드 {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
        >
          <RotateCcw size={16} />
          다시 시도
        </button>
      </div>
    </main>
  );
}
