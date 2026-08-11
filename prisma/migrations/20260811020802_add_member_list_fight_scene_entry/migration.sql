-- CreateTable
CREATE TABLE "MemberListFightSceneEntry" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "fightSceneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberListFightSceneEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberListFightSceneEntry_listId_idx" ON "MemberListFightSceneEntry"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberListFightSceneEntry_listId_fightSceneId_key" ON "MemberListFightSceneEntry"("listId", "fightSceneId");

-- AddForeignKey
ALTER TABLE "MemberListFightSceneEntry" ADD CONSTRAINT "MemberListFightSceneEntry_listId_fkey" FOREIGN KEY ("listId") REFERENCES "MemberList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberListFightSceneEntry" ADD CONSTRAINT "MemberListFightSceneEntry_fightSceneId_fkey" FOREIGN KEY ("fightSceneId") REFERENCES "FightScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
