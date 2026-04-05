import { describe, expect, it } from "vitest";
import { decodeObjectKeyToken, encodeObjectKeyToken } from "./key-token";

describe("encodeObjectKeyToken / decodeObjectKeyToken", () => {
  it("round-trips arbitrary UTF-8 keys", () => {
    const key = "team/prod/.env";
    const token = encodeObjectKeyToken(key);
    expect(token).not.toMatch(/[+/=]/);
    expect(decodeObjectKeyToken(token)).toBe(key);
  });

  it("round-trips keys with slashes, plus signs, and unicode", () => {
    const key = "vault/a+b/café/密钥";
    expect(decodeObjectKeyToken(encodeObjectKeyToken(key))).toBe(key);
  });

  it("produces stable output for the same input", () => {
    const k = "x/y";
    expect(encodeObjectKeyToken(k)).toBe(encodeObjectKeyToken(k));
  });
});
