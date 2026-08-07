// Central logging seam. Every catch block in the app routes through here so a
// production failure leaves a trace instead of disappearing into a 400 response.
// Swap the sink for Sentry/OTel later without touching the call sites.

type Level = "error" | "warn" | "info";

export interface LogMeta {
  [key: string]: unknown;
}

// Values that must never reach a log sink even if a caller passes them by mistake.
const redactedKeys = new Set([
  "apiKey",
  "api_key",
  "encrypted_api_key",
  "pin",
  "pinHash",
  "pin_hash",
  "token",
  "password",
  "authorization",
]);

function redact(meta: LogMeta): LogMeta {
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [key, redactedKeys.has(key) ? "[redacted]" : value]),
  );
}

function emit(level: Level, scope: string, message: string, meta?: LogMeta) {
  const entry = {
    level,
    scope,
    message,
    at: new Date().toISOString(),
    ...(meta ? redact(meta) : {}),
  };
  // Structured single-line JSON so Vercel log drains can parse it.
  console[level === "info" ? "log" : level](JSON.stringify(entry));
}

export function logError(scope: string, error: unknown, meta?: LogMeta) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  emit("error", scope, normalized.message, {
    ...meta,
    name: normalized.name,
    stack: normalized.stack,
  });
}

export function logWarn(scope: string, message: string, meta?: LogMeta) {
  emit("warn", scope, message, meta);
}

export function logInfo(scope: string, message: string, meta?: LogMeta) {
  emit("info", scope, message, meta);
}
