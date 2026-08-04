-- CreateTable
CREATE TABLE "FightScene" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "youtubeStartSeconds" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FightScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FightSceneCast" (
    "id" TEXT NOT NULL,
    "fightSceneId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FightSceneCast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FightSceneRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fightSceneId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FightSceneRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FightSceneAdminRating" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "fightSceneId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FightSceneAdminRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FightScene_movieId_idx" ON "FightScene"("movieId");

-- CreateIndex
CREATE INDEX "FightSceneCast_fightSceneId_idx" ON "FightSceneCast"("fightSceneId");

-- CreateIndex
CREATE UNIQUE INDEX "FightSceneCast_fightSceneId_personId_key" ON "FightSceneCast"("fightSceneId", "personId");

-- CreateIndex
CREATE INDEX "FightSceneRating_fightSceneId_idx" ON "FightSceneRating"("fightSceneId");

-- CreateIndex
CREATE UNIQUE INDEX "FightSceneRating_userId_fightSceneId_key" ON "FightSceneRating"("userId", "fightSceneId");

-- CreateIndex
CREATE INDEX "FightSceneAdminRating_fightSceneId_idx" ON "FightSceneAdminRating"("fightSceneId");

-- CreateIndex
CREATE UNIQUE INDEX "FightSceneAdminRating_adminId_fightSceneId_key" ON "FightSceneAdminRating"("adminId", "fightSceneId");

-- AddForeignKey
ALTER TABLE "FightScene" ADD CONSTRAINT "FightScene_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightScene" ADD CONSTRAINT "FightScene_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightSceneCast" ADD CONSTRAINT "FightSceneCast_fightSceneId_fkey" FOREIGN KEY ("fightSceneId") REFERENCES "FightScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightSceneCast" ADD CONSTRAINT "FightSceneCast_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightSceneRating" ADD CONSTRAINT "FightSceneRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightSceneRating" ADD CONSTRAINT "FightSceneRating_fightSceneId_fkey" FOREIGN KEY ("fightSceneId") REFERENCES "FightScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightSceneAdminRating" ADD CONSTRAINT "FightSceneAdminRating_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightSceneAdminRating" ADD CONSTRAINT "FightSceneAdminRating_fightSceneId_fkey" FOREIGN KEY ("fightSceneId") REFERENCES "FightScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
