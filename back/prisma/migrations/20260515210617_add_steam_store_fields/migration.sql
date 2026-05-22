-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "detailedSummary" TEXT,
ADD COLUMN     "headerImageUrl" TEXT,
ADD COLUMN     "isFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "screenshots" JSONB,
ADD COLUMN     "steamFetchedAt" TIMESTAMP(3);
