import { afterAll, beforeAll, describe, expect, it } from "vitest";

const prevDatabaseUrl = process.env.DATABASE_URL;

beforeAll(() => {
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/test";
});

afterAll(() => {
  if (prevDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = prevDatabaseUrl;
});

describe("canRenameOrDeleteCollection", () => {
  it("allows owners and creators", async () => {
    const { canRenameOrDeleteCollection } = await import("./collections");
    expect(canRenameOrDeleteCollection({ kind: "owner" })).toBe(true);
    expect(canRenameOrDeleteCollection({ kind: "creator" })).toBe(true);
  });

  it("denies grants and non-members", async () => {
    const { canRenameOrDeleteCollection } = await import("./collections");
    expect(canRenameOrDeleteCollection({ kind: "grant" })).toBe(false);
    expect(canRenameOrDeleteCollection({ kind: "none" })).toBe(false);
  });
});
