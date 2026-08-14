-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "trueFightCount" INTEGER;

-- CreateTable
CREATE TABLE "FightCountEdit" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "previousValue" INTEGER,
    "newValue" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FightCountEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FightCountEdit_movieId_idx" ON "FightCountEdit"("movieId");

-- AddForeignKey
ALTER TABLE "FightCountEdit" ADD CONSTRAINT "FightCountEdit_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FightCountEdit" ADD CONSTRAINT "FightCountEdit_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
