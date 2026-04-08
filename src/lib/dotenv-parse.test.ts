import { describe, expect, it } from "vitest";
import { appendDotenvKey, parseDotenv, removeDotenvKey } from "./dotenv-parse";

describe("parseDotenv", () => {
  it("ignores blanks and # comments", () => {
    expect(parseDotenv("\n  \n# x=1\nFOO=bar\n")).toEqual([
      { key: "FOO", value: "bar" },
    ]);
  });

  it("parses unquoted and quoted values", () => {
    expect(parseDotenv(`A=1\nB='2'\nC="3"`)).toEqual([
      { key: "A", value: "1" },
      { key: "B", value: "2" },
      { key: "C", value: "3" },
    ]);
  });

  it("splits on CRLF and skips malformed lines", () => {
    expect(parseDotenv("OK=yes\r\n=bad\nNOEQ\nALSO=ok")).toEqual([
      { key: "OK", value: "yes" },
      { key: "ALSO", value: "ok" },
    ]);
  });

  it("trims keys and values around =", () => {
    expect(parseDotenv("  KEY  =  val  ")).toEqual([
      { key: "KEY", value: "val" },
    ]);
  });
});

describe("removeDotenvKey", () => {
  it("drops assignment lines for the key and keeps comments and spacing lines", () => {
    const src = "# keep\n\nSECRET=x\nOTHER=1\n";
    expect(removeDotenvKey(src, "SECRET")).toBe("# keep\n\nOTHER=1\n");
  });

  it("removes every line parseDotenv would attribute to that key", () => {
    const src = "DUP=a\nDUP=b\n";
    expect(removeDotenvKey(src, "DUP")).toBe("");
  });
});

describe("appendDotenvKey", () => {
  it("appends a line to empty content", () => {
    expect(appendDotenvKey("", "K", "v")).toEqual({
      ok: true,
      content: "K=v",
    });
  });

  it("trims trailing whitespace and joins with a single newline", () => {
    expect(appendDotenvKey("A=1\n\n  \t", "B", "2")).toEqual({
      ok: true,
      content: "A=1\nB=2",
    });
  });

  it("quotes values that need escaping", () => {
    expect(appendDotenvKey("", "K", `say "hi"`)).toEqual({
      ok: true,
      content: `K="say \\"hi\\""`,
    });
  });

  it("rejects invalid keys and newlines in the value", () => {
    expect(appendDotenvKey("", "", "x").ok).toBe(false);
    expect(appendDotenvKey("", "a=b", "x").ok).toBe(false);
    expect(appendDotenvKey("", "#x", "1").ok).toBe(false);
    expect(appendDotenvKey("", "bad\nkey", "1").ok).toBe(false);
    expect(appendDotenvKey("", "K", "a\nb").ok).toBe(false);
  });

  it("rejects duplicate keys visible to parseDotenv", () => {
    const r = appendDotenvKey("FOO=1", "FOO", "2");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("FOO");
  });

  it("treats trimmed key as duplicate of existing assignment", () => {
    const r = appendDotenvKey("FOO=1", " FOO ", "2");
    expect(r.ok).toBe(false);
  });
});
