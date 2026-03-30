/** URL-safe encoding of full S3 object keys for query params. */
export function encodeObjectKeyToken(objectKey: string): string {
  return Buffer.from(objectKey, "utf8").toString("base64url");
}

export function decodeObjectKeyToken(token: string): string {
  return Buffer.from(token, "base64url").toString("utf8");
}
