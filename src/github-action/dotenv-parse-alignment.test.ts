import { describe, expect, it } from "vitest";
import { parseDotenv as parseApp } from "@/lib/dotenv-parse";
import { parseDotenv as parseAction } from "./dotenv-parse";

/** Keeps GitHub Action parsing aligned with vault UI / server (shared contract). */
describe("dotenv-parse parity (action vs app)", () => {
  const fixtures = [
    "",
    "\n# c\n\nA=1\n",
    "B=\"x y\"\nC='z'\r\n",
    "EMPTY=\nD=tail",
    "no=good\n=bad\nKEY_ONLY",
  ];

  it.each(fixtures)("matches for fixture %#", (content) => {
    expect(parseAction(content)).toEqual(parseApp(content));
  });
});
