-- AlterTable
ALTER TABLE "MemberList" ADD COLUMN "description" TEXT,
ADD COLUMN "isRanked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MemberListEntry" ADD COLUMN "rank" INTEGER,
ADD COLUMN "note" TEXT;

-- AlterTable
ALTER TABLE "MemberListFightSceneEntry" ADD COLUMN "rank" INTEGER,
ADD COLUMN "note" TEXT;
