-- CreateTable
CREATE TABLE "ci_access_tokens" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "token_lookup" TEXT NOT NULL,
    "token_encrypted" BYTEA NOT NULL,
    "token_last4" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ci_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ci_access_token_collections" (
    "access_token_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,

    CONSTRAINT "ci_access_token_collections_pkey" PRIMARY KEY ("access_token_id","collection_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ci_access_tokens_token_lookup_key" ON "ci_access_tokens"("token_lookup");

-- AddForeignKey
ALTER TABLE "ci_access_tokens" ADD CONSTRAINT "ci_access_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_access_token_collections" ADD CONSTRAINT "ci_access_token_collections_access_token_id_fkey" FOREIGN KEY ("access_token_id") REFERENCES "ci_access_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_access_token_collections" ADD CONSTRAINT "ci_access_token_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
