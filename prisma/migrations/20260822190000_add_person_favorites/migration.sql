-- CreateTable
CREATE TABLE "PersonFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonFavorite_userId_idx" ON "PersonFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonFavorite_userId_personId_key" ON "PersonFavorite"("userId", "personId");

-- AddForeignKey
ALTER TABLE "PersonFavorite" ADD CONSTRAINT "PersonFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonFavorite" ADD CONSTRAINT "PersonFavorite_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
