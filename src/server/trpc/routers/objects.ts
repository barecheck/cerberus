import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { decryptToUtf8, encryptUtf8 } from "@/lib/crypto";
import {
  assertKeyUnderRoot,
  assertSafeRelativePath,
  assertValidCollectionSlug,
  collectionPrefix,
  fullObjectKey,
} from "@/lib/paths";
import { deleteObjectsKeys, getObjectBuffer, listObjectsUnderPrefix, putObjectBuffer } from "@/lib/s3";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

const objectKeyInput = z.object({
  objectKey: z.string().min(1),
});

const collectionPathInput = z.object({
  collectionSlug: z.string().min(1),
  relativePath: z.string().min(1),
});

export const objectsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ collectionSlug: z.string().min(1) }))
    .query(async ({ input }) => {
      assertValidCollectionSlug(input.collectionSlug);
      const prefix = collectionPrefix(input.collectionSlug);
      const objects = await listObjectsUnderPrefix(prefix);
      return objects.map((o) => ({
        objectKey: o.key,
        relativePath: o.key.slice(prefix.length),
        size: o.size,
        lastModified: o.lastModified,
        isDotenv: o.key.slice(prefix.length).endsWith(".env"),
      }));
    }),

  get: protectedProcedure.input(objectKeyInput).query(async ({ input }) => {
    assertKeyUnderRoot(input.objectKey);
    const body = await getObjectBuffer(input.objectKey);
    try {
      const plaintext = decryptToUtf8(body);
      return {
        objectKey: input.objectKey,
        plaintext,
        isDotenv: input.objectKey.split("/").pop()?.endsWith(".env") ?? false,
      };
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Failed to decrypt object. Check ENCRYPTION_KEY.",
      });
    }
  }),

  getByPath: protectedProcedure.input(collectionPathInput).query(async ({ input }) => {
    const key = fullObjectKey(input.collectionSlug, input.relativePath);
    const body = await getObjectBuffer(key);
    try {
      const plaintext = decryptToUtf8(body);
      return {
        objectKey: key,
        plaintext,
        isDotenv: input.relativePath.endsWith(".env"),
      };
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Failed to decrypt object. Check ENCRYPTION_KEY.",
      });
    }
  }),

  put: protectedProcedure
    .input(
      z.object({
        objectKey: z.string().min(1),
        content: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      assertKeyUnderRoot(input.objectKey);
      const encrypted = encryptUtf8(input.content);
      await putObjectBuffer(input.objectKey, encrypted, "application/octet-stream");
      return { ok: true as const };
    }),

  putByPath: protectedProcedure
    .input(
      z.object({
        collectionSlug: z.string().min(1),
        relativePath: z.string().min(1),
        content: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      assertValidCollectionSlug(input.collectionSlug);
      assertSafeRelativePath(input.relativePath);
      const key = fullObjectKey(input.collectionSlug, input.relativePath);
      const encrypted = encryptUtf8(input.content);
      await putObjectBuffer(key, encrypted, "application/octet-stream");
      return { ok: true as const, objectKey: key };
    }),

  delete: protectedProcedure.input(objectKeyInput).mutation(async ({ input }) => {
    assertKeyUnderRoot(input.objectKey);
    await deleteObjectsKeys([input.objectKey]);
    return { ok: true as const };
  }),
});
