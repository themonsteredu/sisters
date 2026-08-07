import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-400">404</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">찾을 수 없는 페이지입니다</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          주소가 바뀌었거나 삭제된 화면일 수 있습니다.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
        >
          처음 화면으로
        </Link>
      </div>
    </main>
  );
}
