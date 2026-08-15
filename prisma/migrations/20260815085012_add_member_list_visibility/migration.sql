-- DropIndex
DROP INDEX "FightScene_title_ilike_trgm_idx";

-- DropIndex
DROP INDEX "Movie_director_ilike_trgm_idx";

-- DropIndex
DROP INDEX "Movie_title_ilike_trgm_idx";

-- DropIndex
DROP INDEX "Person_name_ilike_trgm_idx";

-- AlterTable
ALTER TABLE "MemberList" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;
