-- AlterTable
-- Backfill any pre-existing rows with a placeholder, then drop the default so
-- the column stays required for new rows going forward (the app always
-- supplies a real title at creation time; this default only exists to make
-- the ALTER safe against a non-empty table).
ALTER TABLE "FightScene" ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Untitled fight scene';
ALTER TABLE "FightScene" ALTER COLUMN "title" DROP DEFAULT;

-- CreateTable
CREATE TABLE "FightSceneTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FightSceneTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FightSceneToFightSceneTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FightSceneToFightSceneTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "FightSceneTag_name_key" ON "FightSceneTag"("name");

-- CreateIndex
CREATE INDEX "_FightSceneToFightSceneTag_B_index" ON "_FightSceneToFightSceneTag"("B");

-- AddForeignKey
ALTER TABLE "_FightSceneToFightSceneTag" ADD CONSTRAINT "_FightSceneToFightSceneTag_A_fkey" FOREIGN KEY ("A") REFERENCES "FightScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FightSceneToFightSceneTag" ADD CONSTRAINT "_FightSceneToFightSceneTag_B_fkey" FOREIGN KEY ("B") REFERENCES "FightSceneTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
