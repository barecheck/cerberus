-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionAccess" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pathPrefix" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CollectionAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionAccess_collectionId_userId_key" ON "CollectionAccess"("collectionId", "userId");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAccess" ADD CONSTRAINT "CollectionAccess_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionAccess" ADD CONSTRAINT "CollectionAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
