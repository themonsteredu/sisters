"use client";

// Replaces the root layout when it is the thing that failed, so it must render
// its own <html>/<body> and cannot rely on globals.css being applied.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <title>오류 · Sisters</title>
        <main style={{ display: "grid", minHeight: "100dvh", placeItems: "center", padding: "1.5rem" }}>
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>앱을 불러오지 못했습니다</h1>
            <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6, color: "#64748b" }}>
              잠시 후 다시 시도해 주세요. 문제가 계속되면 운영자에게 아래 오류 코드를 알려 주세요.
            </p>
            {error.digest ? (
              <p style={{ marginTop: "1rem", fontFamily: "monospace", fontSize: "0.75rem", color: "#94a3b8" }}>
                {error.digest}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => retry()}
              style={{
                marginTop: "1.5rem",
                minHeight: "2.75rem",
                padding: "0 1.25rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
