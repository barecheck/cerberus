import { describe, expect, it } from "vitest";
import { appendDotenvKey, parseDotenv, removeDotenvKey } from "./dotenv-parse";

describe("parseDotenv", () => {
  it("ignores blanks and # comments", () => {
    expect(parseDotenv("\n  \n# x=1\nFOO=bar\n")).toEqual([
      { key: "FOO", value: "bar" },
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseDotenv("A=1\r\nB=2\r\n")).toEqual([
      { key: "A", value: "1" },
      { key: "B", value: "2" },
    ]);
  });

  it("strips optional single or double quotes around values", () => {
    expect(parseDotenv("X=\"a b\"\nY='c'")).toEqual([
      { key: "X", value: "a b" },
      { key: "Y", value: "c" },
    ]);
  });

  it("skips lines without = or with empty key", () => {
    expect(parseDotenv("=nope\nnoequals\nOK=1")).toEqual([
      { key: "OK", value: "1" },
    ]);
  });

  it("parses unquoted values that contain spaces", () => {
    expect(parseDotenv("MSG=hello world")).toEqual([
      { key: "MSG", value: "hello world" },
    ]);
  });
});

describe("removeDotenvKey", () => {
  it("removes assignment lines for the key and preserves comments and blanks", () => {
    const src = "# keep\n\nAPI=old\n\nOTHER=1\n";
    expect(removeDotenvKey(src, "API")).toBe("# keep\n\n\nOTHER=1\n");
  });

  it("removes every matching assignment line", () => {
    expect(removeDotenvKey("A=1\nA=2\nB=3", "A")).toBe("B=3");
  });
});

describe("appendDotenvKey", () => {
  it("appends a new line and rejects duplicate keys", () => {
    const base = "EXISTING=1\n";
    expect(appendDotenvKey(base, "NEW", "v")).toEqual({
      ok: true,
      content: "EXISTING=1\nNEW=v",
    });
    expect(appendDotenvKey("EXISTING=1\n", "EXISTING", "x")).toEqual({
      ok: false,
      error: '"EXISTING" is already defined',
    });
  });

  it("trims trailing whitespace on the file before appending", () => {
    expect(appendDotenvKey("A=1\n  \n", "B", "2")).toEqual({
      ok: true,
      content: "A=1\nB=2",
    });
  });

  it("quotes values that contain spaces or # and round-trips when no inner quotes", () => {
    const r = appendDotenvKey("", "K", "a b # c");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(parseDotenv(r.content)).toEqual([{ key: "K", value: "a b # c" }]);
    }
  });

  it("escapes embedded double quotes in the serialized line", () => {
    const r = appendDotenvKey("", "K", 'say "hi"');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content).toBe('K="say \\"hi\\""');
    }
  });

  it("rejects invalid keys and multiline values with clear errors", () => {
    expect(appendDotenvKey("", "", "v")).toEqual({
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
    expect(appendDotenvKey("", "K", "a\nb")).toEqual({
      ok: false,
      error: "Value cannot contain line breaks",
    });
  });
});
