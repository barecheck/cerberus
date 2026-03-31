import { TRPCError } from "@trpc/server";
import { loadCollectionAccessState } from "@/server/access/collections";
import { isOwnerEmail } from "@/lib/owners";
import { prisma } from "@/lib/prisma";
import type {
  AccessToken,
  AccessTokenCollection,
} from "@/generated/prisma/client";

export type AccessTokenWithCollections = AccessToken & {
  collections: (AccessTokenCollection & {
    collection: { id: string; slug: string };
  })[];
};

async function userHasCollectionAccess(
  userId: string,
  email: string | null | undefined,
  collectionId: string,
) {
  const coll = await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { slug: true },
  });
  if (!coll) return false;
  const state = await loadCollectionAccessState({
    userId,
    email,
    slug: coll.slug,
  });
  return state.kind !== "none";
}

export async function assertCanCreateAccessToken(params: {
  userId: string;
  email: string | null | undefined;
  collectionIds: string[];
}): Promise<void> {
  for (const collectionId of params.collectionIds) {
    const ok = await userHasCollectionAccess(
      params.userId,
      params.email,
      collectionId,
    );
    if (!ok) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No access to one or more collections",
      });
    }
  }
}

export async function assertCanRevokeOrRevealAccessToken(params: {
  userId: string;
  email: string | null | undefined;
  token: AccessTokenWithCollections;
}): Promise<void> {
  const isCreator = params.token.createdById === params.userId;
  const owner = isOwnerEmail(params.email);
  if (!isCreator && !owner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the token creator or an owner can do this",
    });
  }
}

/** Tokens visible if user has access to any linked collection. */
export async function listAccessTokensForUser(
  userId: string,
  email: string | null | undefined,
  collectionSlugFilter?: string,
): Promise<AccessTokenWithCollections[]> {
  const tokens = await prisma.accessToken.findMany({
    include: {
      collections: {
        include: { collection: { select: { id: true, slug: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const visible: AccessTokenWithCollections[] = [];

  for (const token of tokens) {
    let anyAccess = false;
    for (const bind of token.collections) {
      const state = await loadCollectionAccessState({
        userId,
        email,
        slug: bind.collection.slug,
      });
      if (state.kind !== "none") {
        anyAccess = true;
        break;
      }
    }
    if (!anyAccess) continue;

    if (collectionSlugFilter) {
      const applies = token.collections.some(
        (b) => b.collection.slug === collectionSlugFilter,
      );
      if (!applies) continue;
    }

    visible.push(token);
  }

  return visible;
}
