-- CreateEnum
CREATE TYPE "RecommendationItemKind" AS ENUM ('OWNED', 'BUY');

-- DropForeignKey
ALTER TABLE "RecommendationItem" DROP CONSTRAINT "RecommendationItem_gameId_fkey";

-- AlterTable
ALTER TABLE "RecommendationItem" ADD COLUMN     "kind" "RecommendationItemKind" NOT NULL DEFAULT 'OWNED',
ADD COLUMN     "name" TEXT,
ALTER COLUMN "gameId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
