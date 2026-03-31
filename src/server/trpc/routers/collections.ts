import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  assertValidCollectionSlug,
  collectionPrefix,
  getBucket,
  getRootPrefix,
} from "@/lib/paths";
import {
  copyObjectInBucket,
  deleteObjectsKeys,
  listAllKeysUnderPrefix,
  listCommonPrefixes,
  prefixHasAnyObject,
  putFolderPlaceholder,
} from "@/lib/s3";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

const slugInput = z.object({
  slug: z.string().transform((s) => s.trim()).pipe(z.string().min(1, "Name is required")),
});

export const collectionsRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    getBucket();
    const root = getRootPrefix();
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
  }),

  /** Validate slug exists as a prefix (optional UX helper). */
  exists: protectedProcedure.input(slugInput).query(async ({ input }) => {
    getBucket();
    assertValidCollectionSlug(input.slug);
    return prefixHasAnyObject(collectionPrefix(input.slug));
  }),

  create: protectedProcedure.input(slugInput).mutation(async ({ input }) => {
    assertValidCollectionSlug(input.slug);
    getBucket();
    const prefix = collectionPrefix(input.slug);
    if (await prefixHasAnyObject(prefix)) {
      throw new TRPCError({ code: "CONFLICT", message: "A collection with this name already exists" });
    }
    await putFolderPlaceholder(prefix);
    return { ok: true as const };
  }),

  delete: protectedProcedure.input(slugInput).mutation(async ({ input }) => {
    assertValidCollectionSlug(input.slug);
    getBucket();
    const prefix = collectionPrefix(input.slug);
    const keys = await listAllKeysUnderPrefix(prefix);
    if (keys.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
    }
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
    .mutation(async ({ input }) => {
      assertValidCollectionSlug(input.fromSlug);
      assertValidCollectionSlug(input.toSlug);
      if (input.fromSlug === input.toSlug) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "New name must be different" });
      }
      getBucket();
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
      return { ok: true as const };
    }),
});
