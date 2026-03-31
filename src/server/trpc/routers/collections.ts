import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { assertValidCollectionSlug, collectionPrefix, getBucket, getRootPrefix } from "@/lib/paths";
import { isEmailInAllowedDomain } from "@/lib/owners";
import {
  copyObjectInBucket,
  deleteObjectsKeys,
  listAllKeysUnderPrefix,
  listCommonPrefixes,
  prefixHasAnyObject,
  putFolderPlaceholder,
} from "@/lib/s3";
import { canRenameOrDeleteCollection, loadCollectionAccessState } from "@/server/access/collections";
import { createTRPCRouter, ownerProcedure, protectedProcedure } from "@/server/trpc/trpc";
import { prisma } from "@/lib/prisma";

const slugInput = z.object({
  slug: z.string().transform((s) => s.trim()).pipe(z.string().min(1, "Name is required")),
});

const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();

async function findOrCreateUserForGrant(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!isEmailInAllowedDomain(email)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Email is not in the allowed domain" });
  }
  return prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
  });
}

/** Legacy S3-only folder: create a DB row with no creator so owners can attach grants. */
async function getCollectionForOwnerGrants(slug: string) {
  assertValidCollectionSlug(slug);
  getBucket();
  let coll = await prisma.collection.findUnique({
    where: { slug },
    include: {
      accessGrants: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  if (coll) return coll;
  if (!(await prefixHasAnyObject(collectionPrefix(slug)))) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
  }
  await prisma.collection.create({
    data: { slug, createdById: null },
  });
  coll = await prisma.collection.findUniqueOrThrow({
    where: { slug },
    include: {
      accessGrants: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });
  return coll;
}

export const collectionsRouter = createTRPCRouter({
  accessMeta: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => {
    const state = await loadCollectionAccessState({
      userId: ctx.session.user.id,
      email: ctx.session.user.email,
      slug: input.slug,
    });
    return {
      canManageAccess: ctx.session.user.isOwner,
      canRenameDelete: canRenameOrDeleteCollection(state),
    };
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    getBucket();
    const root = getRootPrefix();

    if (ctx.session.user.isOwner) {
      const prefixes = await listCommonPrefixes(root);
      const seen = new Set<string>();
      const items: { slug: string }[] = [];
      for (const p of prefixes) {
        const rel = p.slice(root.length).replace(/\/$/, "");
        const slug = rel.split("/")[0];
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        items.push({ slug });
      }
      items.sort((a, b) => a.slug.localeCompare(b.slug));
      return items;
    }

    const rows = await prisma.collection.findMany({
      where: {
        OR: [{ createdById: ctx.session.user.id }, { accessGrants: { some: { userId: ctx.session.user.id } } }],
      },
      select: { slug: true },
    });

    const items: { slug: string }[] = [];
    for (const { slug } of rows) {
      if (await prefixHasAnyObject(collectionPrefix(slug))) {
        items.push({ slug });
      }
    }
    items.sort((a, b) => a.slug.localeCompare(b.slug));
    return items;
  }),

  exists: protectedProcedure.input(slugInput).query(async ({ ctx, input }) => {
    getBucket();
    assertValidCollectionSlug(input.slug);
    const existsInS3 = await prefixHasAnyObject(collectionPrefix(input.slug));
    if (!existsInS3) return false;
    if (ctx.session.user.isOwner) return true;
    const state = await loadCollectionAccessState({
      userId: ctx.session.user.id,
      email: ctx.session.user.email,
      slug: input.slug,
    });
    return state.kind !== "none";
  }),

  create: protectedProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    assertValidCollectionSlug(input.slug);
    getBucket();
    const prefix = collectionPrefix(input.slug);
    if (await prefixHasAnyObject(prefix)) {
      throw new TRPCError({ code: "CONFLICT", message: "A collection with this name already exists" });
    }

    try {
      await prisma.collection.create({
        data: {
          slug: input.slug,
          createdById: ctx.session.user.id,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A collection with this name already exists",
        });
      }
      throw e;
    }

    try {
      await putFolderPlaceholder(prefix);
    } catch (e) {
      await prisma.collection.deleteMany({ where: { slug: input.slug } });
      throw e;
    }

    return { ok: true as const };
  }),

  delete: protectedProcedure.input(slugInput).mutation(async ({ ctx, input }) => {
    assertValidCollectionSlug(input.slug);
    getBucket();
    const state = await loadCollectionAccessState({
      userId: ctx.session.user.id,
      email: ctx.session.user.email,
      slug: input.slug,
    });
    if (state.kind === "none") {
      throw new TRPCError({ code: "FORBIDDEN", message: "No access to this collection" });
    }
    if (!canRenameOrDeleteCollection(state)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You cannot delete this collection with your current access scope",
      });
    }

    const prefix = collectionPrefix(input.slug);
    const keys = await listAllKeysUnderPrefix(prefix);
    if (keys.length === 0) {
      await prisma.collection.deleteMany({ where: { slug: input.slug } });
      throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
    }

    await prisma.collection.deleteMany({ where: { slug: input.slug } });
    await deleteObjectsKeys(keys);
    return { ok: true as const };
  }),

  rename: protectedProcedure
    .input(
      z.object({
        fromSlug: z.string().transform((s) => s.trim()).pipe(z.string().min(1)),
        toSlug: z.string().transform((s) => s.trim()).pipe(z.string().min(1)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertValidCollectionSlug(input.fromSlug);
      assertValidCollectionSlug(input.toSlug);
      if (input.fromSlug === input.toSlug) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "New name must be different" });
      }
      getBucket();

      const state = await loadCollectionAccessState({
        userId: ctx.session.user.id,
        email: ctx.session.user.email,
        slug: input.fromSlug,
      });
      if (state.kind === "none") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No access to this collection" });
      }
      if (!canRenameOrDeleteCollection(state)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot rename this collection with your current access scope",
        });
      }

      const fromPrefix = collectionPrefix(input.fromSlug);
      const toPrefix = collectionPrefix(input.toSlug);
      const keys = await listAllKeysUnderPrefix(fromPrefix);
      if (keys.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
      }
      if (await prefixHasAnyObject(toPrefix)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A collection or objects already exist at the target name",
        });
      }

      for (const key of keys) {
        const destKey = toPrefix + key.slice(fromPrefix.length);
        await copyObjectInBucket(key, destKey);
      }
      await deleteObjectsKeys(keys);

      await prisma.collection.updateMany({
        where: { slug: input.fromSlug },
        data: { slug: input.toSlug },
      });

      return { ok: true as const };
    }),

  listGrants: ownerProcedure.input(slugInput).query(async ({ input }) => {
    const coll = await getCollectionForOwnerGrants(input.slug);
    return coll.accessGrants.map((g) => ({
      userId: g.userId,
      email: g.user.email,
      name: g.user.name,
    }));
  }),

  listDomainUsers: ownerProcedure.query(async () => {
    if (!domain) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "ALLOWED_EMAIL_DOMAIN is not set" });
    }
    const suffix = `@${domain}`;
    const users = await prisma.user.findMany({
      where: { email: { endsWith: suffix, mode: "insensitive" } },
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" },
    });
    return users;
  }),

  setGrant: ownerProcedure
    .input(
      z.object({
        slug: slugInput.shape.slug,
        userEmail: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      const coll = await getCollectionForOwnerGrants(input.slug);
      const target = await findOrCreateUserForGrant(input.userEmail);

      await prisma.collectionAccess.upsert({
        where: {
          collectionId_userId: { collectionId: coll.id, userId: target.id },
        },
        create: {
          collectionId: coll.id,
          userId: target.id,
        },
        update: {},
      });

      return { ok: true as const };
    }),

  revokeGrant: ownerProcedure
    .input(
      z.object({
        slug: slugInput.shape.slug,
        userEmail: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      const coll = await getCollectionForOwnerGrants(input.slug);

      const target = await prisma.user.findUnique({
        where: { email: input.userEmail.trim().toLowerCase() },
      });
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      await prisma.collectionAccess.deleteMany({
        where: { collectionId: coll.id, userId: target.id },
      });

      return { ok: true as const };
    }),
});
