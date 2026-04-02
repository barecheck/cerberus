import { describe, expect, it } from "vitest";
import { decodeObjectKeyToken, encodeObjectKeyToken } from "./key-token";

describe("encodeObjectKeyToken / decodeObjectKeyToken", () => {
  it("round-trips UTF-8 object keys", () => {
    const key = "vault/collection/file with spaces/émoji🔑.txt";
    const token = encodeObjectKeyToken(key);
    expect(token).not.toMatch(/[+/=]/);
    expect(decodeObjectKeyToken(token)).toBe(key);
  });

  it("round-trips keys that need base64 padding when decoded", () => {
    // Lengths mod 4 != 0 after URL-safe transform exercise padding branch in decode
    for (const s of ["a", "ab", "abc", "prefix/object-key"]) {
      expect(decodeObjectKeyToken(encodeObjectKeyToken(s))).toBe(s);
    }
  });

  it("round-trips empty string", () => {
    expect(decodeObjectKeyToken(encodeObjectKeyToken(""))).toBe("");
  });
});
