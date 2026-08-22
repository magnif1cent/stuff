-- DropForeignKey
ALTER TABLE "PersonSpotlight" DROP CONSTRAINT "PersonSpotlight_personId_fkey";

-- DropForeignKey
ALTER TABLE "PersonSpotlight" DROP CONSTRAINT "PersonSpotlight_authorId_fkey";

-- DropTable
DROP TABLE "PersonSpotlight";
