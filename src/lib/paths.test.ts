import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  assertKeyUnderRoot,
  assertSafeRelativePath,
  assertValidCollectionSlug,
  fullObjectKey,
  splitObjectKeyAfterRoot,
} from "./paths";

const PREV_ROOT = process.env.S3_ROOT_PREFIX;

describe("assertValidCollectionSlug", () => {
  it("accepts a single segment slug", () => {
    expect(() => assertValidCollectionSlug("my-app")).not.toThrow();
  });

  it("rejects empty, dot segments, slashes, and traversal", () => {
    for (const bad of ["", ".", "..", "a/b", "a..b"]) {
      expect(() => assertValidCollectionSlug(bad)).toThrow(
        "Invalid collection",
      );
    }
  });
});

describe("assertSafeRelativePath", () => {
  it("accepts normal relative paths", () => {
    expect(() => assertSafeRelativePath(".env")).not.toThrow();
    expect(() => assertSafeRelativePath("dir/file.txt")).not.toThrow();
  });

  it("rejects absolute paths and traversal segments", () => {
    for (const bad of ["", "/etc/passwd", "..", "a/../b", "a/."]) {
      expect(() => assertSafeRelativePath(bad)).toThrow("Invalid object path");
    }
  });
});

describe("fullObjectKey and splitObjectKeyAfterRoot", () => {
  beforeEach(() => {
    process.env.S3_ROOT_PREFIX = "vault/";
  });

  afterEach(() => {
    if (PREV_ROOT === undefined) delete process.env.S3_ROOT_PREFIX;
    else process.env.S3_ROOT_PREFIX = PREV_ROOT;
  });

  it("builds keys under the configured root and splits them back", () => {
    const key = fullObjectKey("app", "secrets/.env");
    expect(key).toBe("vault/app/secrets/.env");
    expect(splitObjectKeyAfterRoot(key)).toEqual({
      slug: "app",
      relativePath: "secrets/.env",
    });
  });
});

describe("assertKeyUnderRoot", () => {
  beforeEach(() => {
    process.env.S3_ROOT_PREFIX = "vault/";
  });

  afterEach(() => {
    if (PREV_ROOT === undefined) delete process.env.S3_ROOT_PREFIX;
    else process.env.S3_ROOT_PREFIX = PREV_ROOT;
  });

  it("allows keys under the root prefix", () => {
    expect(() => assertKeyUnderRoot("vault/app/file")).not.toThrow();
  });

  it("rejects keys outside the root and traversal", () => {
    expect(() => assertKeyUnderRoot("other/app/file")).toThrow(
      "Object key outside configured root",
    );
    expect(() => assertKeyUnderRoot("vault/../evil")).toThrow(
      "Invalid object key",
    );
  });
});
