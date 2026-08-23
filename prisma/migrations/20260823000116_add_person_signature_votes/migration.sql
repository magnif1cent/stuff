-- CreateTable
CREATE TABLE "PersonSignatureVote" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT,
    "fightSceneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonSignatureVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonSignatureVote_personId_movieId_idx" ON "PersonSignatureVote"("personId", "movieId");

-- CreateIndex
CREATE INDEX "PersonSignatureVote_personId_fightSceneId_idx" ON "PersonSignatureVote"("personId", "fightSceneId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonSignatureVote_userId_personId_key" ON "PersonSignatureVote"("userId", "personId");

-- AddForeignKey
ALTER TABLE "PersonSignatureVote" ADD CONSTRAINT "PersonSignatureVote_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonSignatureVote" ADD CONSTRAINT "PersonSignatureVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonSignatureVote" ADD CONSTRAINT "PersonSignatureVote_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonSignatureVote" ADD CONSTRAINT "PersonSignatureVote_fightSceneId_fkey" FOREIGN KEY ("fightSceneId") REFERENCES "FightScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
