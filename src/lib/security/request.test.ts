import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "./request";

const appUrl = "http://localhost:3000";

function request(init: { method?: string; origin?: string; fetchSite?: string }) {
  const headers = new Headers();
  if (init.origin) headers.set("origin", init.origin);
  if (init.fetchSite) headers.set("sec-fetch-site", init.fetchSite);
  return new Request(`${appUrl}/api/account/data-request`, { method: init.method ?? "POST", headers });
}

describe("assertSameOrigin", () => {
  it("accepts a matching origin", () => {
    expect(() => assertSameOrigin(request({ origin: appUrl }))).not.toThrow();
  });

  it("rejects a foreign origin", () => {
    expect(() => assertSameOrigin(request({ origin: "https://evil.example" }))).toThrow();
  });

  it("rejects a state-changing request with no origin proof", () => {
    // Used to fail open: a missing Origin header returned early and passed.
    expect(() => assertSameOrigin(request({}))).toThrow();
  });

  it("accepts a same-origin request that only sends Sec-Fetch-Site", () => {
    expect(() => assertSameOrigin(request({ fetchSite: "same-origin" }))).not.toThrow();
  });

  it("rejects a cross-site request that only sends Sec-Fetch-Site", () => {
    expect(() => assertSameOrigin(request({ fetchSite: "cross-site" }))).toThrow();
  });

  it("leaves safe methods alone when no origin is present", () => {
    expect(() => assertSameOrigin(request({ method: "GET" }))).not.toThrow();
  });
});
