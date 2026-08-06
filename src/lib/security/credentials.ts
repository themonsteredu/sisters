import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const encoded = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) throw new Error("CREDENTIAL_ENCRYPTION_KEY가 설정되지 않았습니다.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY는 base64 인코딩된 32바이트여야 합니다.");
  return key;
}

export function encryptCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptCredential(payload: string) {
  const [iv, tag, ciphertext] = payload.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !tag || !ciphertext) throw new Error("잘못된 암호문입니다.");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
