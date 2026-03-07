-- CreateTable
CREATE TABLE "Rank" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minXp" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rank_code_key" ON "Rank"("code");

-- Seed default ranks (CADET, OFFICER, CAPTAIN)
INSERT INTO "Rank" ("id", "code", "name", "minXp", "displayOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'CADET', 'Cadet', 0, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'OFFICER', 'Officer', 500, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'CAPTAIN', 'Captain', 2000, 2, NOW(), NOW());

-- Migrate User.rank from enum to string without data loss
ALTER TABLE "User" ADD COLUMN "rank_new" TEXT NOT NULL DEFAULT 'CADET';
UPDATE "User" SET "rank_new" = "rank"::text;
ALTER TABLE "User" DROP COLUMN "rank";
ALTER TABLE "User" RENAME COLUMN "rank_new" TO "rank";
ALTER TABLE "User" ALTER COLUMN "rank" SET DEFAULT 'CADET';

-- DropEnum
DROP TYPE "UserRank";
