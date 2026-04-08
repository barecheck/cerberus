import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { tokenCreatorHasCollectionAccess } from "./access-token-runtime";

const PREV_OWNER_EMAILS = process.env.OWNER_EMAILS;

describe("tokenCreatorHasCollectionAccess", () => {
  beforeEach(() => {
    process.env.OWNER_EMAILS = "owner@example.com";
  });

  afterEach(() => {
    if (PREV_OWNER_EMAILS === undefined) delete process.env.OWNER_EMAILS;
    else process.env.OWNER_EMAILS = PREV_OWNER_EMAILS;
  });

  it("allows tokens created by owners", () => {
    expect(
      tokenCreatorHasCollectionAccess({
        creatorUserId: "user_a",
        creatorEmail: "owner@example.com",
        collectionCreatedById: "user_b",
        hasDirectGrant: false,
      }),
    ).toBe(true);
  });

  it("allows tokens created by the collection creator", () => {
    expect(
      tokenCreatorHasCollectionAccess({
        creatorUserId: "user_a",
        creatorEmail: "user@example.com",
        collectionCreatedById: "user_a",
        hasDirectGrant: false,
      }),
    ).toBe(true);
  });

  it("allows tokens while a direct grant exists", () => {
    expect(
      tokenCreatorHasCollectionAccess({
        creatorUserId: "user_a",
        creatorEmail: "user@example.com",
        collectionCreatedById: "user_b",
        hasDirectGrant: true,
      }),
    ).toBe(true);
  });

  it("denies tokens after creator access is revoked", () => {
    expect(
      tokenCreatorHasCollectionAccess({
        creatorUserId: "user_a",
        creatorEmail: "user@example.com",
        collectionCreatedById: "user_b",
        hasDirectGrant: false,
      }),
    ).toBe(false);
  });
});
