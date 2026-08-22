-- DropIndex
DROP INDEX "MemberReview_movieId_idx";

-- AlterTable
ALTER TABLE "MemberReview" ADD COLUMN     "voteScore" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MemberReviewVote" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberReviewVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberReviewVote_reviewId_idx" ON "MemberReviewVote"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberReviewVote_userId_reviewId_key" ON "MemberReviewVote"("userId", "reviewId");

-- CreateIndex
CREATE INDEX "MemberReview_movieId_voteScore_createdAt_idx" ON "MemberReview"("movieId", "voteScore", "createdAt");

-- AddForeignKey
ALTER TABLE "MemberReviewVote" ADD CONSTRAINT "MemberReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "MemberReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberReviewVote" ADD CONSTRAINT "MemberReviewVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
