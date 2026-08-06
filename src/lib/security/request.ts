import { getPublicAppUrl } from "@/lib/config";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = new URL(getPublicAppUrl()).origin;
  if (origin !== requestOrigin && origin !== configuredOrigin) {
    throw new Error("허용되지 않은 요청 출처입니다.");
  }
}
