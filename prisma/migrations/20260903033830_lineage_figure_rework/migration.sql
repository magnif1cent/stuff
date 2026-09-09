-- Follow-up to 20260903020000_add_lineage_relation: that migration file was
-- edited in place after already being applied (to the old, Person-based
-- LineageRelation shape) to some databases -- Prisma doesn't re-run a
-- migration already recorded as applied, so those databases were stuck on
-- the old table. This migration brings them forward for real, with a
-- second CREATE TABLE rather than an in-place edit. Drops any lineage
-- links entered under the old shape (confirmed acceptable -- there's no
-- clean way to carry sifuId/studentId, which pointed at Person directly,
-- into the new figure-based scheme without a person having a LineageFigure
-- yet to point at).
DROP TABLE IF EXISTS "LineageRelation";

-- CreateTable
CREATE TABLE "LineageFigure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personId" TEXT,

    CONSTRAINT "LineageFigure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineageRelation" (
    "id" TEXT NOT NULL,
    "sifuId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineageRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LineageFigure_personId_key" ON "LineageFigure"("personId");

-- CreateIndex
CREATE INDEX "LineageFigure_name_idx" ON "LineageFigure"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LineageRelation_sifuId_studentId_key" ON "LineageRelation"("sifuId", "studentId");

-- CreateIndex
CREATE INDEX "LineageRelation_studentId_idx" ON "LineageRelation"("studentId");

-- CreateIndex
CREATE INDEX "LineageRelation_sifuId_idx" ON "LineageRelation"("sifuId");

-- AddForeignKey
ALTER TABLE "LineageFigure" ADD CONSTRAINT "LineageFigure_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineageRelation" ADD CONSTRAINT "LineageRelation_sifuId_fkey" FOREIGN KEY ("sifuId") REFERENCES "LineageFigure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineageRelation" ADD CONSTRAINT "LineageRelation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "LineageFigure"("id") ON DELETE CASCADE ON UPDATE CASCADE;
