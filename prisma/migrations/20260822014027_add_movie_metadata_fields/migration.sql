-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "certification" TEXT,
ADD COLUMN     "collectionName" TEXT,
ADD COLUMN     "collectionTmdbId" INTEGER,
ADD COLUMN     "revenue" INTEGER,
ADD COLUMN     "studio" TEXT,
ADD COLUMN     "tagline" TEXT;

-- CreateIndex
CREATE INDEX "Movie_collectionTmdbId_idx" ON "Movie"("collectionTmdbId");
