-- Leftover NextAuth / OAuth profile fields we do not use.
ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified";
ALTER TABLE "users" DROP COLUMN IF EXISTS "image";
