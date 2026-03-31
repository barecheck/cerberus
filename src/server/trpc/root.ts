import { accessTokensRouter } from "@/server/trpc/routers/accessTokens";
import { collectionsRouter } from "@/server/trpc/routers/collections";
import { objectsRouter } from "@/server/trpc/routers/objects";
import { secretsRouter } from "@/server/trpc/routers/secrets";
import { createTRPCRouter } from "@/server/trpc/trpc";

export const appRouter = createTRPCRouter({
  accessTokens: accessTokensRouter,
  collections: collectionsRouter,
  objects: objectsRouter,
  secrets: secretsRouter,
});

export type AppRouter = typeof appRouter;
