/** URL-safe encoding of full S3 object keys for query params. */
export function encodeObjectKeyToken(objectKey: string): string {
  return Buffer.from(objectKey, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeObjectKeyToken(token: string): string {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4;
  const padded = pad ? b64 + "=".repeat(4 - pad) : b64;
  return Buffer.from(padded, "base64").toString("utf8");
}
