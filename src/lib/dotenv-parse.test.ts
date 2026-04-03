import { describe, expect, it } from "vitest";
import {
  appendDotenvKey,
  parseDotenv,
  removeDotenvEntryAt,
  removeDotenvKey,
} from "./dotenv-parse";

describe("removeDotenvEntryAt", () => {
  it("removes only the targeted duplicate key entry", () => {
    const content = "A=1\nA=2\nB=3\n";

    expect(removeDotenvEntryAt(content, 0)).toBe("A=2\nB=3\n");
    expect(removeDotenvEntryAt(content, 1)).toBe("A=1\nB=3\n");
  });

  it("preserves comments and blank lines while removing one parsed entry", () => {
    const content = "# top\nA=1\n\n# middle\nA=2\nB=3";

    expect(removeDotenvEntryAt(content, 1)).toBe("# top\nA=1\n\n# middle\nB=3");
  });
});

describe("parseDotenv and appendDotenvKey", () => {
  it("parses simple entries and appends a new one", () => {
    const content = "A=1\nB=2";
    expect(parseDotenv(content)).toEqual([
      { key: "A", value: "1" },
      { key: "B", value: "2" },
    ]);

    const result = appendDotenvKey(content, "C", "3");
    expect(result).toEqual({ ok: true, content: "A=1\nB=2\nC=3" });
  });

  it("retains legacy removeDotenvKey behavior for all matching keys", () => {
    const content = "A=1\nA=2\nB=3";
    expect(removeDotenvKey(content, "A")).toBe("B=3");
  });
});
