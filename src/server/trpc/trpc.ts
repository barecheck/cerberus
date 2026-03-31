import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Session } from "next-auth";

export type TRPCContext = {
  session: Session | null;
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session as Session & { user: NonNullable<Session["user"]> },
    },
  });
});

export const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.session.user.isOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owners only" });
  }
  return next({ ctx });
});
