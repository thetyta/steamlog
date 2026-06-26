-- AlterTable: novo default do avatar (todas as contas futuras)
ALTER TABLE "User" ALTER COLUMN "avatarUrl" SET DEFAULT 'https://static.wikia.nocookie.net/balatrogame/images/e/ef/Joker.png/revision/latest?cb=20250619163211';

-- Aplica o Joker a todas as contas já criadas
UPDATE "User" SET "avatarUrl" = 'https://static.wikia.nocookie.net/balatrogame/images/e/ef/Joker.png/revision/latest?cb=20250619163211';
