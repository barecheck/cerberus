import { describe, expect, it } from "vitest";
import { decodeObjectKeyToken, encodeObjectKeyToken } from "./key-token";

describe("encodeObjectKeyToken / decodeObjectKeyToken", () => {
  it("round-trips typical collection paths", () => {
    const keys = [
      "collections/my-app/secrets/.env",
      "collections/x/y=z/file.env",
      "collections/🔑/prod.env",
    ];
    for (const objectKey of keys) {
      const token = encodeObjectKeyToken(objectKey);
      expect(token).not.toMatch(/[+/=]/);
      expect(decodeObjectKeyToken(token)).toBe(objectKey);
    }
  });

  it("round-trips empty string", () => {
    expect(decodeObjectKeyToken(encodeObjectKeyToken(""))).toBe("");
  });

  it("produces decodable tokens for keys whose raw base64 would use + or /", () => {
    // Chosen so standard base64 includes URL-unsafe characters; encoding must still decode back.
    const objectKey = "f\xff\xfe";
    const token = encodeObjectKeyToken(objectKey);
    expect(decodeObjectKeyToken(token)).toBe(objectKey);
  });
});
