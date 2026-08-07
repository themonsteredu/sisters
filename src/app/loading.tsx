// Every parent/student page is force-dynamic and blocks on several Supabase
// round-trips, so navigations previously showed nothing until the data landed.
export default function Loading() {
  return (
    <main className="min-h-dvh bg-slate-50 p-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">불러오는 중입니다.</span>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="h-9 w-64 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    </main>
  );
}
