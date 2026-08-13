-- CreateTable
CREATE TABLE "SubcategoryRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcategoryRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcategoryAdminRating" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcategoryAdminRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubcategoryRating_movieId_idx" ON "SubcategoryRating"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "SubcategoryRating_userId_movieId_category_key" ON "SubcategoryRating"("userId", "movieId", "category");

-- CreateIndex
CREATE INDEX "SubcategoryAdminRating_movieId_idx" ON "SubcategoryAdminRating"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "SubcategoryAdminRating_adminId_movieId_category_key" ON "SubcategoryAdminRating"("adminId", "movieId", "category");

-- AddForeignKey
ALTER TABLE "SubcategoryRating" ADD CONSTRAINT "SubcategoryRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcategoryRating" ADD CONSTRAINT "SubcategoryRating_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcategoryAdminRating" ADD CONSTRAINT "SubcategoryAdminRating_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcategoryAdminRating" ADD CONSTRAINT "SubcategoryAdminRating_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
