import { afterEach, describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential } from "./credentials";

const originalKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

afterEach(() => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = originalKey;
});

describe("credential encryption", () => {
  it("API 키를 AES-GCM으로 암복호화한다", () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptCredential("secret-api-key");
    expect(encrypted).not.toContain("secret-api-key");
    expect(decryptCredential(encrypted)).toBe("secret-api-key");
  });
});
