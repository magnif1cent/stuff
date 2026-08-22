-- CreateTable
CREATE TABLE "PersonFunFact" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonFunFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonFunFactVote" (
    "id" TEXT NOT NULL,
    "factId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonFunFactVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonTribute" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "voteScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonTribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonTributeVote" (
    "id" TEXT NOT NULL,
    "tributeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonTributeVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonFunFact_personId_idx" ON "PersonFunFact"("personId");

-- CreateIndex
CREATE INDEX "PersonFunFactVote_factId_idx" ON "PersonFunFactVote"("factId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonFunFactVote_userId_factId_key" ON "PersonFunFactVote"("userId", "factId");

-- CreateIndex
CREATE INDEX "PersonTribute_personId_voteScore_createdAt_idx" ON "PersonTribute"("personId", "voteScore", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PersonTribute_personId_authorId_key" ON "PersonTribute"("personId", "authorId");

-- CreateIndex
CREATE INDEX "PersonTributeVote_tributeId_idx" ON "PersonTributeVote"("tributeId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonTributeVote_userId_tributeId_key" ON "PersonTributeVote"("userId", "tributeId");

-- AddForeignKey
ALTER TABLE "PersonFunFact" ADD CONSTRAINT "PersonFunFact_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonFunFact" ADD CONSTRAINT "PersonFunFact_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonFunFactVote" ADD CONSTRAINT "PersonFunFactVote_factId_fkey" FOREIGN KEY ("factId") REFERENCES "PersonFunFact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonFunFactVote" ADD CONSTRAINT "PersonFunFactVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonTribute" ADD CONSTRAINT "PersonTribute_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonTribute" ADD CONSTRAINT "PersonTribute_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonTributeVote" ADD CONSTRAINT "PersonTributeVote_tributeId_fkey" FOREIGN KEY ("tributeId") REFERENCES "PersonTribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonTributeVote" ADD CONSTRAINT "PersonTributeVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
