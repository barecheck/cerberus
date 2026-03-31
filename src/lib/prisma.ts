import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Maps legacy ambiguous sslmodes to explicit verify-full (current pg semantics; silences pg-connection-string warnings). */
function explicitPgSslMode(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.searchParams.get("uselibpqcompat") === "true")
      return connectionString;
    const mode = url.searchParams.get("sslmode")?.toLowerCase();
    if (mode === "prefer" || mode === "require" || mode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
      return url.href;
    }
  } catch {
    /* invalid URL; pass through */
  }
  return connectionString;
}

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new pg.Pool({
    connectionString: explicitPgSslMode(connectionString),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
