import { describe, expect, it } from "vitest";
import { decodeObjectKeyToken, encodeObjectKeyToken } from "./key-token";

describe("encodeObjectKeyToken / decodeObjectKeyToken", () => {
  it("round-trips a typical S3 key with slashes", () => {
    const key = "vault/my-collection/secrets/.env";
    expect(decodeObjectKeyToken(encodeObjectKeyToken(key))).toBe(key);
  });

  it("uses URL-safe alphabet (no +, /, or trailing padding)", () => {
    const token = encodeObjectKeyToken("a/b/c");
    expect(token).not.toMatch(/[+/=]/);
  });

  it("round-trips UTF-8 paths", () => {
    const key = "prefix/café/日本語";
    expect(decodeObjectKeyToken(encodeObjectKeyToken(key))).toBe(key);
  });

  it("round-trips keys that decode to lengths not divisible by 4 before padding", () => {
    const key = "x";
    expect(decodeObjectKeyToken(encodeObjectKeyToken(key))).toBe(key);
  });
});
