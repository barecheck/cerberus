import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  hashAccessTokenSecret: vi.fn(),
  getObjectBuffer: vi.fn(),
  decryptToUtf8: vi.fn(),
  loadCollectionAccessState: vi.fn(),
  accessTokenFindUnique: vi.fn(),
  collectionFindUnique: vi.fn(),
}));

vi.mock("@/lib/access-token-hash", () => ({
  hashAccessTokenSecret: mocks.hashAccessTokenSecret,
}));

vi.mock("@/lib/s3", () => ({
  getObjectBuffer: mocks.getObjectBuffer,
}));

vi.mock("@/lib/crypto", () => ({
  decryptToUtf8: mocks.decryptToUtf8,
}));

vi.mock("@/server/access/collections", () => ({
  loadCollectionAccessState: mocks.loadCollectionAccessState,
}));

vi.mock("@/lib/paths", () => ({
  getBucket: vi.fn(),
  assertValidCollectionSlug: vi.fn(),
  assertSafeRelativePath: vi.fn(),
  fullObjectKey: vi.fn((slug: string, relativePath: string) => {
    return `${slug}/${relativePath}`;
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessToken: {
      findUnique: mocks.accessTokenFindUnique,
    },
    collection: {
      findUnique: mocks.collectionFindUnique,
    },
  },
}));

import { GET } from "./route";

function makeReq(secret = "team/app.env") {
  return new NextRequest(`https://example.com/api/ci/file?secret=${secret}`, {
    headers: {
      authorization: "Bearer crb_test",
    },
  });
}

describe("GET /api/ci/file", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.hashAccessTokenSecret.mockReturnValue("lookup");
    mocks.accessTokenFindUnique.mockResolvedValue({
      id: "token-1",
      createdById: "user-1",
      createdBy: { id: "user-1", email: "user@example.com" },
      collections: [{ collectionId: "collection-1" }],
    });
    mocks.collectionFindUnique.mockResolvedValue({ id: "collection-1" });
    mocks.loadCollectionAccessState.mockResolvedValue({ kind: "creator" });
    mocks.getObjectBuffer.mockResolvedValue(Buffer.from("encrypted"));
    mocks.decryptToUtf8.mockReturnValue("SECRET=value");
  });

  it("returns forbidden when token creator no longer has collection access", async () => {
    mocks.loadCollectionAccessState.mockResolvedValue({ kind: "none" });

    const response = await GET(makeReq());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(mocks.getObjectBuffer).not.toHaveBeenCalled();
    expect(mocks.loadCollectionAccessState).toHaveBeenCalledWith({
      userId: "user-1",
      email: "user@example.com",
      slug: "team",
    });
  });

  it("returns decrypted content when token creator still has access", async () => {
    const response = await GET(makeReq());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ content: "SECRET=value" });
    expect(mocks.getObjectBuffer).toHaveBeenCalledWith("team/app.env");
  });
});
