-- AlterTable
ALTER TABLE "LibraryEntry" ADD COLUMN     "favoriteRank" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "LibraryEntry_userId_favoriteRank_key" ON "LibraryEntry"("userId", "favoriteRank");
