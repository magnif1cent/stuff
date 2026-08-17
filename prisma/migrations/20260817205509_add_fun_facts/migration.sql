-- CreateTable
CREATE TABLE "FunFact" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunFactVote" (
    "id" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunFactVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FunFact_movieId_idx" ON "FunFact"("movieId");

-- CreateIndex
CREATE INDEX "FunFactVote_factId_idx" ON "FunFactVote"("factId");

-- CreateIndex
CREATE UNIQUE INDEX "FunFactVote_userId_factId_key" ON "FunFactVote"("userId", "factId");

-- AddForeignKey
ALTER TABLE "FunFact" ADD CONSTRAINT "FunFact_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunFact" ADD CONSTRAINT "FunFact_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunFactVote" ADD CONSTRAINT "FunFactVote_factId_fkey" FOREIGN KEY ("factId") REFERENCES "FunFact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunFactVote" ADD CONSTRAINT "FunFactVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
