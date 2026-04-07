import { describe, expect, it } from "vitest";
import { canRenameOrDeleteCollection } from "./collections";

describe("canRenameOrDeleteCollection", () => {
  it("allows owners and creators", () => {
    expect(canRenameOrDeleteCollection({ kind: "owner" })).toBe(true);
    expect(canRenameOrDeleteCollection({ kind: "creator" })).toBe(true);
  });

  it("denies granted users and non-members", () => {
    expect(canRenameOrDeleteCollection({ kind: "grant" })).toBe(false);
    expect(canRenameOrDeleteCollection({ kind: "none" })).toBe(false);
  });
});
