-- CreateTable
CREATE TABLE "FightSceneFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fightSceneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FightSceneFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FightSceneFavorite_userId_idx" ON "FightSceneFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FightSceneFavorite_userId_fightSceneId_key" ON "FightSceneFavorite"("userId", "fightSceneId");

-- AddForeignKey
ALTER TABLE "FightSceneFavorite" ADD CONSTRAINT "FightSceneFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightSceneFavorite" ADD CONSTRAINT "FightSceneFavorite_fightSceneId_fkey" FOREIGN KEY ("fightSceneId") REFERENCES "FightScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
