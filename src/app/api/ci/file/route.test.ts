import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hashAccessTokenSecretMock = vi.fn();
const getObjectBufferMock = vi.fn();
const decryptToUtf8Mock = vi.fn();
const loadCollectionAccessStateMock = vi.fn();
const accessTokenFindUniqueMock = vi.fn();
const collectionFindUniqueMock = vi.fn();

vi.mock("@/lib/access-token-hash", () => ({
  hashAccessTokenSecret: hashAccessTokenSecretMock,
}));

vi.mock("@/lib/s3", () => ({
  getObjectBuffer: getObjectBufferMock,
}));

vi.mock("@/lib/crypto", () => ({
  decryptToUtf8: decryptToUtf8Mock,
}));

vi.mock("@/server/access/collections", () => ({
  loadCollectionAccessState: loadCollectionAccessStateMock,
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
      findUnique: accessTokenFindUniqueMock,
    },
    collection: {
      findUnique: collectionFindUniqueMock,
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

    hashAccessTokenSecretMock.mockReturnValue("lookup");
    accessTokenFindUniqueMock.mockResolvedValue({
      id: "token-1",
      createdById: "user-1",
      createdBy: { id: "user-1", email: "user@example.com" },
      collections: [{ collectionId: "collection-1" }],
    });
    collectionFindUniqueMock.mockResolvedValue({ id: "collection-1" });
    loadCollectionAccessStateMock.mockResolvedValue({ kind: "creator" });
    getObjectBufferMock.mockResolvedValue(Buffer.from("encrypted"));
    decryptToUtf8Mock.mockReturnValue("SECRET=value");
  });

  it("returns forbidden when token creator no longer has collection access", async () => {
    loadCollectionAccessStateMock.mockResolvedValue({ kind: "none" });

    const response = await GET(makeReq());

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
    expect(getObjectBufferMock).not.toHaveBeenCalled();
    expect(loadCollectionAccessStateMock).toHaveBeenCalledWith({
      userId: "user-1",
      email: "user@example.com",
      slug: "team",
    });
  });

  it("returns decrypted content when token creator still has access", async () => {
    const response = await GET(makeReq());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ content: "SECRET=value" });
    expect(getObjectBufferMock).toHaveBeenCalledWith("team/app.env");
  });
});
