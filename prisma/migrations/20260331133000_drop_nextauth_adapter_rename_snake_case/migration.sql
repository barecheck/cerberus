-- Drop NextAuth Prisma adapter tables (JWT sessions; single-tenant deploys).
DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";

-- Rename core tables and columns to snake_case for Postgres convention.
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "users" RENAME COLUMN "emailVerified" TO "email_verified";

ALTER TABLE "Collection" RENAME TO "collections";
ALTER TABLE "collections" RENAME COLUMN "createdById" TO "created_by_id";
ALTER TABLE "collections" RENAME COLUMN "createdAt" TO "created_at";

ALTER TABLE "CollectionAccess" RENAME TO "collection_access";
ALTER TABLE "collection_access" RENAME COLUMN "collectionId" TO "collection_id";
ALTER TABLE "collection_access" RENAME COLUMN "userId" TO "user_id";
