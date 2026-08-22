-- CreateTable
CREATE TABLE "PersonFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonSpotlight" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonSpotlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonFavorite_userId_idx" ON "PersonFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonFavorite_userId_personId_key" ON "PersonFavorite"("userId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonSpotlight_personId_key" ON "PersonSpotlight"("personId");

-- AddForeignKey
ALTER TABLE "PersonFavorite" ADD CONSTRAINT "PersonFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonFavorite" ADD CONSTRAINT "PersonFavorite_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonSpotlight" ADD CONSTRAINT "PersonSpotlight_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonSpotlight" ADD CONSTRAINT "PersonSpotlight_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
