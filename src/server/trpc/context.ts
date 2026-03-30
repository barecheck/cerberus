import { auth } from "@/auth";
import type { TRPCContext } from "@/server/trpc/trpc";

export async function createTRPCContext(): Promise<TRPCContext> {
  const session = await auth();
  return { session };
}
