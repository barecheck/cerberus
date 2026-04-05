import { NextRequest, NextResponse } from "next/server";
import { hashAccessTokenSecret } from "@/lib/access-token-hash";
import { decryptToUtf8 } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import {
  assertSafeRelativePath,
  assertValidCollectionSlug,
  fullObjectKey,
  getBucket,
} from "@/lib/paths";
import { getObjectBuffer } from "@/lib/s3";
import { loadCollectionAccessState } from "@/server/access/collections";

function parseBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  const t = h.slice(7).trim();
  return t || null;
}

function isNotFoundError(err: unknown): boolean {
  const e = err as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    e.name === "NoSuchKey" ||
    e.Code === "NoSuchKey" ||
    e.name === "NotFound" ||
    e.$metadata?.httpStatusCode === 404
  );
}

export async function GET(req: NextRequest) {
  try {
    getBucket();
  } catch {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const bearer = parseBearer(req);
  if (!bearer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tokenLookup: string;
  try {
    tokenLookup = hashAccessTokenSecret(bearer);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secretParam = req.nextUrl.searchParams.get("secret")?.trim();
  if (!secretParam) {
    return NextResponse.json({ error: "Missing secret" }, { status: 400 });
  }

  const slash = secretParam.indexOf("/");
  if (slash <= 0) {
    return NextResponse.json({ error: "Invalid secret path" }, { status: 400 });
  }
  const slug = secretParam.slice(0, slash);
  const relativePath = secretParam.slice(slash + 1);
  if (!relativePath) {
    return NextResponse.json({ error: "Invalid secret path" }, { status: 400 });
  }

  try {
    assertValidCollectionSlug(slug);
    assertSafeRelativePath(relativePath);
  } catch {
    return NextResponse.json({ error: "Invalid secret path" }, { status: 400 });
  }

  const row = await prisma.accessToken.findUnique({
    where: { tokenLookup },
    include: {
      collections: true,
      createdBy: {
        select: { id: true, email: true },
      },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!collection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = row.collections.some((c) => c.collectionId === collection.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const creatorState = await loadCollectionAccessState({
    userId: row.createdBy.id,
    email: row.createdBy.email,
    slug,
  });
  if (creatorState.kind === "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const objectKey = fullObjectKey(slug, relativePath);

  let body: Buffer;
  try {
    body = await getObjectBuffer(objectKey);
  } catch (err: unknown) {
    if (isNotFoundError(err)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let content: string;
  try {
    content = decryptToUtf8(body);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ content });
}
