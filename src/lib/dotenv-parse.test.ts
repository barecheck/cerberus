import { describe, expect, it } from "vitest";
import { appendDotenvKey, parseDotenv, removeDotenvKey } from "./dotenv-parse";

describe("parseDotenv", () => {
  it("parses simple KEY=value pairs and ignores blanks and comments", () => {
    expect(parseDotenv("FOO=bar\n\n# skip\nBAZ=qux")).toEqual([
      { key: "FOO", value: "bar" },
      { key: "BAZ", value: "qux" },
    ]);
  });

  it("strips optional single and double quotes from values", () => {
    expect(parseDotenv(`A='x y'\nB="z"`)).toEqual([
      { key: "A", value: "x y" },
      { key: "B", value: "z" },
    ]);
  });

  it("splits on CRLF and ignores lines without a valid key", () => {
    expect(parseDotenv("=nokey\r\nOK=1\n=nokey2")).toEqual([
      { key: "OK", value: "1" },
    ]);
  });

  it("parses values that contain equals signs", () => {
    expect(parseDotenv("URL=https://x=y")).toEqual([
      { key: "URL", value: "https://x=y" },
    ]);
  });
});

describe("removeDotenvKey", () => {
  it("removes every assignment line for that key and preserves structure", () => {
    const before = "# hdr\nFOO=1\n\nBAR=2\nFOO=3\n";
    const after = removeDotenvKey(before, "FOO");
    expect(after).toBe("# hdr\n\nBAR=2\n");
    expect(parseDotenv(after)).toEqual([{ key: "BAR", value: "2" }]);
  });

  it("does not remove lines that only look like the key inside comments", () => {
    const s = "# FOO=not-a-var\nBAR=1\n";
    expect(removeDotenvKey(s, "FOO")).toBe(s);
  });
});

describe("appendDotenvKey", () => {
  it("appends a line to empty content and rejects duplicates", () => {
    const first = appendDotenvKey("", "K", "v");
    expect(first).toEqual({ ok: true, content: "K=v" });
    const dup = appendDotenvKey(first.content!, "K", "other");
    expect(dup).toEqual({ ok: false, error: '"K" is already defined' });
  });

  it("trims trailing whitespace before appending", () => {
    const r = appendDotenvKey("A=1\n\n  \t", "B", "2");
    expect(r.ok).toBe(true);
    expect(r).toEqual({ ok: true, content: "A=1\nB=2" });
  });

  it("quotes values that contain spaces and round-trips via parseDotenv", () => {
    const r = appendDotenvKey("", "K", "a b");
    expect(r.ok).toBe(true);
    expect(r.content).toBe('K="a b"');
    expect(parseDotenv(r.content!)).toEqual([{ key: "K", value: "a b" }]);
  });

  it("rejects invalid keys and multiline values with stable messages", () => {
    expect(appendDotenvKey("", "  ", "x")).toEqual({
      ok: false,
      error: "Enter a variable name",
    });
    expect(appendDotenvKey("", "a=b", "x")).toEqual({
      ok: false,
      error: 'Key cannot contain "="',
    });
    expect(appendDotenvKey("", "#x", "y")).toEqual({
      ok: false,
      error: "Key cannot start with #",
    });
    expect(appendDotenvKey("", "bad\nkey", "v")).toEqual({
      ok: false,
      error: "Key cannot span lines",
    });
    expect(appendDotenvKey("", "K", "a\nb")).toEqual({
      ok: false,
      error: "Value cannot contain line breaks",
    });
  });
});
