import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { decryptToUtf8 } from "@/lib/crypto";
import { parseDotenv } from "@/lib/dotenv-parse";
import { assertKeyUnderRoot, assertValidCollectionSlug, splitObjectKeyAfterRoot } from "@/lib/paths";
import { getObjectBuffer } from "@/lib/s3";
import { assertRelativePathAllowed, loadCollectionAccessState } from "@/server/access/collections";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const secretsRouter = createTRPCRouter({
  parse: protectedProcedure
    .input(z.object({ objectKey: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      assertKeyUnderRoot(input.objectKey);
      const { slug } = splitObjectKeyAfterRoot(input.objectKey);
      assertValidCollectionSlug(slug);
      const state = await loadCollectionAccessState({
        userId: ctx.session.user.id,
        email: ctx.session.user.email,
        slug,
      });
      assertRelativePathAllowed(state);

      const body = await getObjectBuffer(input.objectKey);
      let plaintext: string;
      try {
        plaintext = decryptToUtf8(body);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to decrypt object.",
        });
      }
      const entries = parseDotenv(plaintext);
      return { objectKey: input.objectKey, entries };
    }),

  getValue: protectedProcedure
    .input(
      z.object({
        objectKey: z.string().min(1),
        secretKey: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertKeyUnderRoot(input.objectKey);
      const { slug } = splitObjectKeyAfterRoot(input.objectKey);
      assertValidCollectionSlug(slug);
      const state = await loadCollectionAccessState({
        userId: ctx.session.user.id,
        email: ctx.session.user.email,
        slug,
      });
      assertRelativePathAllowed(state);

      const body = await getObjectBuffer(input.objectKey);
      let plaintext: string;
      try {
        plaintext = decryptToUtf8(body);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to decrypt object.",
        });
      }
      const entries = parseDotenv(plaintext);
      const hit = entries.find((e) => e.key === input.secretKey);
      if (!hit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Key not found: ${input.secretKey}`,
        });
      }
      return { objectKey: input.objectKey, secretKey: input.secretKey, value: hit.value };
    }),
});
