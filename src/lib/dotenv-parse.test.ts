import { describe, expect, it } from "vitest";
import { appendDotenvKey, parseDotenv, removeDotenvKey } from "./dotenv-parse";

describe("parseDotenv", () => {
  it("returns empty for blank or comment-only content", () => {
    expect(parseDotenv("")).toEqual([]);
    expect(parseDotenv("\n\n  \n")).toEqual([]);
    expect(parseDotenv("# only\n# more")).toEqual([]);
  });

  it("parses KEY=value, trims keys and values, and ignores malformed lines", () => {
    expect(
      parseDotenv("FOO=bar\n  BAZ  =  qux  \nnot-a-line\n=novalid"),
    ).toEqual([
      { key: "FOO", value: "bar" },
      { key: "BAZ", value: "qux" },
    ]);
  });

  it("strips optional single or double quotes around values", () => {
    expect(parseDotenv(`A='x y'\nB="z"`)).toEqual([
      { key: "A", value: "x y" },
      { key: "B", value: "z" },
    ]);
  });

  it("splits on CRLF like LF", () => {
    expect(parseDotenv("A=1\r\nB=2")).toEqual([
      { key: "A", value: "1" },
      { key: "B", value: "2" },
    ]);
  });
});

describe("removeDotenvKey", () => {
  it("drops assignment lines for the key and keeps comments and blanks", () => {
    const before = "# hdr\nFOO=1\n\nBAR=two\nBAZ=3";
    expect(removeDotenvKey(before, "BAR")).toBe("# hdr\nFOO=1\n\nBAZ=3");
  });

  it("does not remove similarly named keys", () => {
    const before = "API=1\nAPI_KEY=2";
    expect(removeDotenvKey(before, "API")).toBe("API_KEY=2");
  });
});

describe("appendDotenvKey", () => {
  it("appends a line and trims trailing whitespace on the prior content", () => {
    const r = appendDotenvKey("FOO=1\n\n  \t", "BAR", "2");
    expect(r).toEqual({ ok: true, content: "FOO=1\nBAR=2" });
  });

  it("starts a new file with a single line when content is empty", () => {
    expect(appendDotenvKey("", "X", "y")).toEqual({
      ok: true,
      content: "X=y",
    });
  });

  it("quotes values that need escaping for spaces, hash, or quotes", () => {
    const r = appendDotenvKey("", "K", 'say "hi"');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content).toBe('K="say \\"hi\\""');
      // Minimal parser strips wrapping quotes but does not interpret \\ escapes inside.
      expect(parseDotenv(r.content)).toEqual([
        { key: "K", value: 'say \\"hi\\"' },
      ]);
    }
  });

  it("rejects empty or invalid keys and duplicate definitions", () => {
    expect(appendDotenvKey("A=1", "  ", "x")).toMatchObject({
      ok: false,
      error: "Enter a variable name",
    });
    expect(appendDotenvKey("", "BAD=key", "1")).toMatchObject({
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
    expect(appendDotenvKey("", "K", "a\nb")).toMatchObject({
      ok: false,
      error: "Value cannot contain line breaks",
    });
    expect(appendDotenvKey("K=1", "K", "2")).toMatchObject({
      ok: false,
      error: '"K" is already defined',
    });
  });
});
