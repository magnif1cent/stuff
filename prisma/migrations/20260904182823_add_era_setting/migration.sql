-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "eraSetting" TEXT;

-- CreateTable
CREATE TABLE "EraSettingEdit" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "editedById" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EraSettingEdit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EraSettingEdit_movieId_idx" ON "EraSettingEdit"("movieId");

-- AddForeignKey
ALTER TABLE "EraSettingEdit" ADD CONSTRAINT "EraSettingEdit_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EraSettingEdit" ADD CONSTRAINT "EraSettingEdit_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
