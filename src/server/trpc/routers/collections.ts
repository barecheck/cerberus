import { z } from "zod";
import { getBucket, getRootPrefix } from "@/lib/paths";
import { listCommonPrefixes } from "@/lib/s3";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

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
  exists: protectedProcedure.input(z.object({ slug: z.string().min(1) })).query(async ({ input }) => {
    getBucket();
    const root = getRootPrefix();
    const prefixes = await listCommonPrefixes(root);
    const want = `${root}${input.slug}/`;
    return prefixes.includes(want);
  }),
});
