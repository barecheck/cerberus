import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

const MAGIC = Buffer.from("CRB1", "utf8");
const VERSION = 1;
const IV_LEN = 12;
const TAG_LEN = 16;

export function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw?.trim()) {
    throw new Error("ENCRYPTION_KEY is not set");
  }
  const trimmed = raw.trim();
  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  try {
    const fromB64 = Buffer.from(trimmed, "base64");
    if (fromB64.length === 32) return fromB64;
  } catch {
    /* fall through */
  }
  const utf8 = Buffer.from(trimmed, "utf8");
  if (utf8.length === 32) return utf8;
  throw new Error(
    "ENCRYPTION_KEY must be 32 bytes (hex 64 chars, base64 of 32 bytes, or UTF-8 length 32)",
  );
}

/** Encrypt UTF-8 plaintext; returns binary envelope for S3. */
export function encryptUtf8(plaintext: string): Buffer {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, Buffer.from([VERSION]), iv, ciphertext, tag]);
}

export function decryptToUtf8(blob: Buffer): string {
  const key = getEncryptionKey();
  if (blob.length < MAGIC.length + 1 + IV_LEN + TAG_LEN) {
    throw new Error("Invalid encrypted payload: too short");
  }
  if (!timingSafeEqual(blob.subarray(0, MAGIC.length), MAGIC)) {
    throw new Error("Invalid encrypted payload: bad magic");
  }
  const version = blob[MAGIC.length];
  if (version !== VERSION) {
    throw new Error(`Unsupported envelope version: ${version}`);
  }
  const ivStart = MAGIC.length + 1;
  const iv = blob.subarray(ivStart, ivStart + IV_LEN);
  const tagStart = blob.length - TAG_LEN;
  const ciphertext = blob.subarray(ivStart + IV_LEN, tagStart);
  const tag = blob.subarray(tagStart);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
