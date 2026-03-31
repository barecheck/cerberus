import { createHmac, randomBytes } from "node:crypto";
import { getEncryptionKey } from "@/lib/crypto";
import { encodeObjectKeyToken } from "@/lib/key-token";

/** Deterministic lookup key for Bearer secrets (HMAC keyed with ENCRYPTION_KEY, URL-safe digest). */
export function hashAccessTokenSecret(plainToken: string): string {
  const key = getEncryptionKey();
  const digest = createHmac("sha256", key).update(plainToken, "utf8").digest();
  return encodeObjectKeyToken(digest.toString("hex"));
}

const TOKEN_PREFIX = "crb_";

export function generateAccessTokenPlaintext(): string {
  return `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function maskAccessTokenDisplay(last4: string): string {
  return `${TOKEN_PREFIX}••••${last4}`;
}
