import { describe, expect, it } from "vitest";
import { appendDotenvKey, parseDotenv, removeDotenvKey } from "./dotenv-parse";

describe("parseDotenv", () => {
  it("ignores blanks and # comments", () => {
    expect(parseDotenv("\n  \n# x=1\nFOO=bar\n")).toEqual([
      { key: "FOO", value: "bar" },
    ]);
  });

  it("trims keys and values and supports only the first = in the value", () => {
    expect(parseDotenv("  MY_KEY  =  a=b  ")).toEqual([
      { key: "MY_KEY", value: "a=b" },
    ]);
  });

  it("strips matching double or single quotes around values", () => {
    expect(parseDotenv("Q=\"hello\"\nS='x'")).toEqual([
      { key: "Q", value: "hello" },
      { key: "S", value: "x" },
    ]);
  });

  it("splits on CRLF", () => {
    expect(parseDotenv("A=1\r\nB=2")).toEqual([
      { key: "A", value: "1" },
      { key: "B", value: "2" },
    ]);
  });

  it("skips lines without a valid key", () => {
    expect(parseDotenv("=no\nnoeq\n KEY \n")).toEqual([]);
  });
});

describe("removeDotenvKey", () => {
  it("drops parsed lines for the key and keeps comments and blanks", () => {
    const content = "# hdr\n\nFOO=1\nBAR=2\n";
    expect(removeDotenvKey(content, "FOO")).toBe("# hdr\n\nBAR=2\n");
  });
});

describe("appendDotenvKey", () => {
  it("rejects invalid keys and values with clear errors", () => {
    expect(appendDotenvKey("", "  ", "v")).toEqual({
      ok: false,
      error: "Enter a variable name",
    });
    expect(appendDotenvKey("", "a=b", "v")).toEqual({
      ok: false,
      error: 'Key cannot contain "="',
    });
    expect(appendDotenvKey("", "#x", "v")).toEqual({
      ok: false,
      error: "Key cannot start with #",
    });
    expect(appendDotenvKey("", "bad\nkey", "v")).toEqual({
      ok: false,
      error: "Key cannot span lines",
    });
    expect(appendDotenvKey("", "K", "one\ntwo")).toEqual({
      ok: false,
      error: "Value cannot contain line breaks",
    });
  });

  it("rejects duplicate keys that parseDotenv would surface", () => {
    expect(appendDotenvKey("X=1\n", "X", "2")).toEqual({
      ok: false,
      error: '"X" is already defined',
    });
  });

  it("appends a plain line when quoting is not needed", () => {
    expect(appendDotenvKey("", "K", "v")).toEqual({
      ok: true,
      content: "K=v",
    });
    expect(appendDotenvKey("A=1", "B", "2")).toEqual({
      ok: true,
      content: "A=1\nB=2",
    });
  });

  it('quotes values that contain whitespace, #, or quotes and escapes \\ and "', () => {
    expect(appendDotenvKey("", "K", "a b")).toEqual({
      ok: true,
      content: 'K="a b"',
    });
    expect(appendDotenvKey("", "K", "p#q")).toEqual({
      ok: true,
      content: 'K="p#q"',
    });
    expect(appendDotenvKey("", "K", 'say "hi"')).toEqual({
      ok: true,
      content: 'K="say \\"hi\\""',
    });
    // Space forces quotes; backslashes must be escaped inside the string.
    expect(appendDotenvKey("", "K", "C:\\temp dir")).toEqual({
      ok: true,
      content: 'K="C:\\\\temp dir"',
    });
  });

  it("quotes values with leading or trailing spaces (not just internal)", () => {
    expect(appendDotenvKey("", "K", " x ")).toEqual({
      ok: true,
      content: 'K=" x "',
    });
  });

  it("trims trailing whitespace on existing content before appending", () => {
    expect(appendDotenvKey("A=1\n\n  \n", "B", "2")).toEqual({
      ok: true,
      content: "A=1\nB=2",
    });
  });
});
