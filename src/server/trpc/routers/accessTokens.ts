import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { decryptToUtf8, encryptUtf8 } from "@/lib/crypto";
import {
  generateAccessTokenPlaintext,
  hashAccessTokenSecret,
  maskAccessTokenDisplay,
} from "@/lib/access-token-hash";
import { prisma } from "@/lib/prisma";
import {
  assertCanCreateAccessToken,
  assertCanRevokeOrRevealAccessToken,
  listAccessTokensForUser,
} from "@/server/access/access-tokens";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

const slugInput = z.object({
  slug: z.string().transform((s) => s.trim()).pipe(z.string().min(1)),
});

export const accessTokensRouter = createTRPCRouter({
  list: protectedProcedure.input(slugInput.optional()).query(async ({ ctx, input }) => {
    const slug = input?.slug;
    const rows = await listAccessTokensForUser(ctx.session.user.id, ctx.session.user.email, slug);
    const isOwnerUser = ctx.session.user.isOwner;
    return rows.map((t) => {
      const canManage = isOwnerUser || t.createdById === ctx.session.user.id;
      return {
        id: t.id,
        name: t.name,
        displayToken: maskAccessTokenDisplay(t.tokenLast4),
        createdAt: t.createdAt,
        collectionSlugs: t.collections.map((c) => c.collection.slug).sort(),
        createdById: t.createdById,
        canManage,
      };
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().max(200).optional(),
        collectionIds: z.array(z.string().min(1)).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanCreateAccessToken({
        userId: ctx.session.user.id,
        email: ctx.session.user.email,
        collectionIds: input.collectionIds,
      });

      const plain = generateAccessTokenPlaintext();
      const tokenLookup = hashAccessTokenSecret(plain);
      const tokenLast4 = plain.slice(-4);
      const tokenEncrypted = encryptUtf8(plain);

      const row = await prisma.accessToken.create({
        data: {
          name: input.name?.trim() || null,
          tokenLookup,
          tokenEncrypted: Buffer.from(tokenEncrypted),
          tokenLast4,
          createdById: ctx.session.user.id,
          collections: {
            create: input.collectionIds.map((collectionId) => ({ collectionId })),
          },
        },
      });

      return { id: row.id, token: plain };
    }),

  createForCollectionSlug: protectedProcedure
    .input(
      z.object({
        slug: z.string().transform((s) => s.trim()).pipe(z.string().min(1, "Name is required")),
        name: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const coll = await prisma.collection.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (!coll) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
      }

      await assertCanCreateAccessToken({
        userId: ctx.session.user.id,
        email: ctx.session.user.email,
        collectionIds: [coll.id],
      });

      const plain = generateAccessTokenPlaintext();
      const tokenLookup = hashAccessTokenSecret(plain);
      const tokenLast4 = plain.slice(-4);
      const tokenEncrypted = encryptUtf8(plain);

      const row = await prisma.accessToken.create({
        data: {
          name: input.name?.trim() || null,
          tokenLookup,
          tokenEncrypted: Buffer.from(tokenEncrypted),
          tokenLast4,
          createdById: ctx.session.user.id,
          collections: {
            create: [{ collectionId: coll.id }],
          },
        },
      });

      return { id: row.id, token: plain };
    }),

  revoke: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const token = await prisma.accessToken.findUnique({
      where: { id: input.id },
      include: { collections: { include: { collection: { select: { id: true, slug: true } } } } },
    });
    if (!token) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
    }
    await assertCanRevokeOrRevealAccessToken({
      userId: ctx.session.user.id,
      email: ctx.session.user.email,
      token,
    });
    await prisma.accessToken.delete({ where: { id: input.id } });
    return { ok: true as const };
  }),

  reveal: protectedProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const token = await prisma.accessToken.findUnique({
      where: { id: input.id },
      include: { collections: { include: { collection: { select: { id: true, slug: true } } } } },
    });
    if (!token) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
    }
    await assertCanRevokeOrRevealAccessToken({
      userId: ctx.session.user.id,
      email: ctx.session.user.email,
      token,
    });

    try {
      const plain = decryptToUtf8(Buffer.from(token.tokenEncrypted));
      return { token: plain };
    } catch {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to decrypt token" });
    }
  }),
});
