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
