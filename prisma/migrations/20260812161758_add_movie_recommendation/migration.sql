-- CreateTable
CREATE TABLE "MovieRecommendation" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovieRecommendation_movieId_idx" ON "MovieRecommendation"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieRecommendation_adminId_movieId_key" ON "MovieRecommendation"("adminId", "movieId");

-- AddForeignKey
ALTER TABLE "MovieRecommendation" ADD CONSTRAINT "MovieRecommendation_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieRecommendation" ADD CONSTRAINT "MovieRecommendation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
