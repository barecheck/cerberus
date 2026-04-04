import { describe, expect, it } from "vitest";
import { appendDotenvKey, parseDotenv, removeDotenvKey } from "./dotenv-parse";

describe("parseDotenv", () => {
  it("parses unquoted, single-quoted, and double-quoted values", () => {
    expect(parseDotenv("A=1\nB=two\nC=\"x\"\nD='y z'\n")).toEqual([
      { key: "A", value: "1" },
      { key: "B", value: "two" },
      { key: "C", value: "x" },
      { key: "D", value: "y z" },
    ]);
  });

  it("ignores blanks, comments, and lines without =", () => {
    expect(parseDotenv("\n  # x\nFOO=bar\nnot-a-pair\n")).toEqual([
      { key: "FOO", value: "bar" },
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseDotenv("X=a\r\nY=b")).toEqual([
      { key: "X", value: "a" },
      { key: "Y", value: "b" },
    ]);
  });

  it("rejects keys when = is first character", () => {
    expect(parseDotenv("=nokey")).toEqual([]);
  });
});

describe("removeDotenvKey", () => {
  it("removes every assignment line for the key and keeps comments", () => {
    const before = "A=1\n# keep\nB=2\nA=3\n\n";
    expect(removeDotenvKey(before, "A")).toBe("# keep\nB=2\n\n");
  });

  it("does not strip malformed lines that parseDotenv would skip", () => {
    const body = "KEEP_ME\nFOO=1\n";
    expect(removeDotenvKey(body, "FOO")).toBe("KEEP_ME\n");
  });
});

describe("appendDotenvKey", () => {
  it("appends a line and trims trailing whitespace on existing content", () => {
    const r = appendDotenvKey("X=1\n  \n", "Y", "2");
    expect(r).toEqual({ ok: true, content: "X=1\nY=2" });
  });

  it("uses first file when empty", () => {
    const r = appendDotenvKey("", "A", "b");
    expect(r).toEqual({ ok: true, content: "A=b" });
  });

  it("quotes values that need escaping", () => {
    const r = appendDotenvKey("", "K", 'say "hi"');
    expect(r).toEqual({ ok: true, content: 'K="say \\"hi\\""' });
  });

  it("rejects empty key", () => {
    const r = appendDotenvKey("X=1", "  ", "v");
    expect(r).toEqual({ ok: false, error: "Enter a variable name" });
  });

  it("rejects keys containing =, starting with #, or spanning lines", () => {
    expect(appendDotenvKey("", "a=b", "1")).toMatchObject({
      ok: false,
      error: 'Key cannot contain "="',
    });
    expect(appendDotenvKey("", "#x", "1")).toMatchObject({
      ok: false,
      error: "Key cannot start with #",
    });
    expect(appendDotenvKey("", "a\nb", "1")).toMatchObject({
      ok: false,
      error: "Key cannot span lines",
    });
  });

  it("rejects values with line breaks", () => {
    const r = appendDotenvKey("", "K", "a\nb");
    expect(r).toEqual({
      ok: false,
      error: "Value cannot contain line breaks",
    });
  });

  it("rejects duplicate keys visible to parseDotenv", () => {
    const r = appendDotenvKey("FOO=1", "FOO", "2");
    expect(r).toEqual({ ok: false, error: '"FOO" is already defined' });
  });
});
