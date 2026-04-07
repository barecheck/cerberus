import { describe, expect, it } from "vitest";
import { appendDotenvKey, parseDotenv, removeDotenvKey } from "./dotenv-parse";

describe("parseDotenv", () => {
  it("ignores blank lines and # comments", () => {
    expect(parseDotenv("\n  \n# ignored\nFOO=bar\n")).toEqual([
      { key: "FOO", value: "bar" },
    ]);
  });

  it("strips optional single or double quotes from values", () => {
    expect(parseDotenv(`A="x"\nB='y z'`)).toEqual([
      { key: "A", value: "x" },
      { key: "B", value: "y z" },
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseDotenv("A=1\r\nB=2")).toEqual([
      { key: "A", value: "1" },
      { key: "B", value: "2" },
    ]);
  });

  it("skips lines without = or with empty key", () => {
    expect(parseDotenv("noequals\n=noval\nOK=1")).toEqual([
      { key: "OK", value: "1" },
    ]);
  });
});

describe("removeDotenvKey", () => {
  it("removes assignment lines for the key and keeps comments", () => {
    const input = "# keep\nSECRET=x\nOTHER=1\nSECRET=y\n";
    expect(removeDotenvKey(input, "SECRET")).toBe("# keep\nOTHER=1\n");
  });
});

describe("appendDotenvKey", () => {
  it("appends a line with a trailing newline when content is non-empty", () => {
    const r = appendDotenvKey("A=1", "B", "2");
    expect(r).toEqual({ ok: true, content: "A=1\nB=2" });
  });

  it("uses unquoted form when safe", () => {
    expect(appendDotenvKey("", "K", "v")).toEqual({
      ok: true,
      content: "K=v",
    });
  });

  it("double-quotes values with spaces and round-trips through parseDotenv", () => {
    const r = appendDotenvKey("", "K", "a b");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content).toBe('K="a b"');
      expect(parseDotenv(r.content)).toEqual([{ key: "K", value: "a b" }]);
    }
  });

  it("escapes embedded double quotes in formatted output", () => {
    const r = appendDotenvKey("", "K", 'say "hi"');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content).toBe('K="say \\"hi\\""');
    }
  });

  it("rejects empty key, = in key, # prefix, and newlines in key or value", () => {
    expect(appendDotenvKey("", "  ", "x")).toMatchObject({
      ok: false,
      error: "Enter a variable name",
    });
    expect(appendDotenvKey("", "A=B", "x")).toMatchObject({
      ok: false,
      error: 'Key cannot contain "="',
    });
    expect(appendDotenvKey("", "#X", "1")).toMatchObject({
      ok: false,
      error: "Key cannot start with #",
    });
    expect(appendDotenvKey("", "bad\nkey", "1")).toMatchObject({
      ok: false,
      error: "Key cannot span lines",
    });
    expect(appendDotenvKey("", "K", "a\nb")).toMatchObject({
      ok: false,
      error: "Value cannot contain line breaks",
    });
  });

  it("rejects duplicate keys according to parseDotenv", () => {
    expect(appendDotenvKey("FOO=1", "FOO", "2")).toMatchObject({
      ok: false,
      error: '"FOO" is already defined',
    });
  });

  it("trims trailing whitespace on existing content before appending", () => {
    const r = appendDotenvKey("A=1\n\n  \n", "B", "2");
    expect(r).toEqual({ ok: true, content: "A=1\nB=2" });
  });
});
