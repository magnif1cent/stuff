-- AlterTable
ALTER TABLE "LineageFigure" ADD COLUMN "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
