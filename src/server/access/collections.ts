import { TRPCError } from "@trpc/server";
import { isOwnerEmail } from "@/lib/owners";
import { assertValidCollectionSlug, collectionPrefix } from "@/lib/paths";
import { prefixHasAnyObject } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

export type CollectionAccessState =
  | { kind: "owner" }
  | { kind: "creator" }
  | { kind: "grant" }
  | { kind: "none" };

export function canRenameOrDeleteCollection(state: CollectionAccessState): boolean {
  return state.kind !== "none";
}

export async function loadCollectionAccessState(params: {
  userId: string;
  email: string | null | undefined;
  slug: string;
}): Promise<CollectionAccessState> {
  assertValidCollectionSlug(params.slug);
  if (isOwnerEmail(params.email)) {
    return { kind: "owner" };
  }

  const row = await prisma.collection.findUnique({
    where: { slug: params.slug },
    include: {
      accessGrants: { where: { userId: params.userId } },
    },
  });

  if (!row) {
    return { kind: "none" };
  }

  if (row.createdById === params.userId) {
    return { kind: "creator" };
  }

  if (row.accessGrants[0]) {
    return { kind: "grant" };
  }

  return { kind: "none" };
}

/** Open /vault/[slug] — owners need a real S3 prefix; others need a DB row and creator or grant. */
export async function userCanOpenVaultCollection(params: {
  userId: string;
  email: string | null | undefined;
  slug: string;
}): Promise<boolean> {
  assertValidCollectionSlug(params.slug);
  if (isOwnerEmail(params.email)) {
    return prefixHasAnyObject(collectionPrefix(params.slug));
  }

  const state = await loadCollectionAccessState(params);
  if (state.kind === "none") return false;
  return true;
}

export function assertRelativePathAllowed(state: CollectionAccessState): void {
  if (state.kind === "none") {
    throw new TRPCError({ code: "FORBIDDEN", message: "No access to this collection" });
  }
}
