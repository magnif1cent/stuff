-- CreateTable
CREATE TABLE "MemberReview" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberReview_movieId_idx" ON "MemberReview"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberReview_movieId_authorId_key" ON "MemberReview"("movieId", "authorId");

-- AddForeignKey
ALTER TABLE "MemberReview" ADD CONSTRAINT "MemberReview_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberReview" ADD CONSTRAINT "MemberReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
