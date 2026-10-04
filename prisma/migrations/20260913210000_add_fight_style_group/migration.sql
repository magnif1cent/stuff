-- CreateTable
CREATE TABLE "FightStyleGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FightStyleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FightStyleGroup_name_key" ON "FightStyleGroup"("name");

-- AlterTable
ALTER TABLE "FightSceneStyle" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "FightSceneStyle_groupId_idx" ON "FightSceneStyle"("groupId");

-- AddForeignKey
ALTER TABLE "FightSceneStyle" ADD CONSTRAINT "FightSceneStyle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FightStyleGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
