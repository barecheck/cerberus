import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { hashAccessTokenSecret } from "./access-token-hash";

const PREV = process.env.ENCRYPTION_KEY;

describe("hashAccessTokenSecret", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterEach(() => {
    if (PREV === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = PREV;
  });

  it("is deterministic for the same secret and ENCRYPTION_KEY", () => {
    const a = hashAccessTokenSecret("crb_same");
    const b = hashAccessTokenSecret("crb_same");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });

  it("differs for different secrets", () => {
    const a = hashAccessTokenSecret("crb_one");
    const b = hashAccessTokenSecret("crb_two");
    expect(a).not.toBe(b);
  });
});
