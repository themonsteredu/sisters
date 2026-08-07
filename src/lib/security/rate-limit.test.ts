import { beforeEach, describe, expect, it } from "vitest";
import { consumeRateLimit, resetRateLimits } from "./rate-limit";

describe("consumeRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows calls up to the limit and then blocks", () => {
    for (let call = 0; call < 3; call += 1) {
      expect(consumeRateLimit("family-a", 3, 60_000).allowed).toBe(true);
    }
    const blocked = consumeRateLimit("family-a", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each key separately so one family cannot exhaust another", () => {
    consumeRateLimit("family-a", 1, 60_000);
    expect(consumeRateLimit("family-a", 1, 60_000).allowed).toBe(false);
    expect(consumeRateLimit("family-b", 1, 60_000).allowed).toBe(true);
  });

  it("starts a fresh window once the previous one has elapsed", () => {
    expect(consumeRateLimit("family-c", 1, 1).allowed).toBe(true);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(consumeRateLimit("family-c", 1, 1).allowed).toBe(true);
        resolve();
      }, 5);
    });
  });
});
