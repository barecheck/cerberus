import { describe, expect, it } from "vitest";
import { decodeObjectKeyToken, encodeObjectKeyToken } from "./key-token";

describe("encodeObjectKeyToken / decodeObjectKeyToken", () => {
  it("round-trips utf-8 object keys", () => {
    const key = "team/prod/secrets/.env";
    const token = encodeObjectKeyToken(key);
    expect(decodeObjectKeyToken(token)).toBe(key);
  });

  it("uses URL-safe alphabet (no +, /, or trailing =)", () => {
    const token = encodeObjectKeyToken("???");
    expect(token).not.toMatch(/[+/=]/);
  });

  it("round-trips keys that produce padding in standard base64", () => {
    const key = "ab"; // often encodes to base64 ending with ==
    const token = encodeObjectKeyToken(key);
    expect(token.endsWith("=")).toBe(false);
    expect(decodeObjectKeyToken(token)).toBe(key);
  });
});
