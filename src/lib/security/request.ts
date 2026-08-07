import { getPublicAppUrl } from "@/lib/config";

// Methods that can change server state and therefore need a same-origin proof.
const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Same-origin check for route handlers.
 *
 * This used to return early when `Origin` was absent, which made it the app's
 * only CSRF control while failing open. Browsers send `Origin` on every
 * state-changing fetch/XHR and form post, so a missing header on such a request
 * is not a normal browser call. `Sec-Fetch-Site` is accepted as a fallback for
 * clients that omit `Origin` on same-origin requests.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = new URL(getPublicAppUrl()).origin;

  if (origin) {
    if (origin !== requestOrigin && origin !== configuredOrigin) {
      throw new Error("허용되지 않은 요청 출처입니다.");
    }
    return;
  }

  if (!stateChangingMethods.has(request.method.toUpperCase())) return;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin" || fetchSite === "none") return;

  throw new Error("허용되지 않은 요청 출처입니다.");
}
