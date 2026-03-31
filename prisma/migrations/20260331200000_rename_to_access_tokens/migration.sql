-- Rename CI-prefixed tables to general access token names (schema @@map).
DO $$
BEGIN
  IF to_regclass('public.ci_access_tokens') IS NOT NULL AND to_regclass('public.access_tokens') IS NULL THEN
    ALTER TABLE "ci_access_tokens" RENAME TO "access_tokens";
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.ci_access_token_collections') IS NOT NULL AND to_regclass('public.access_token_collections') IS NULL THEN
    ALTER TABLE "ci_access_token_collections" RENAME TO "access_token_collections";
  END IF;
END $$;
