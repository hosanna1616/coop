-- CreateTable
CREATE TABLE "ExternalBank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ExternalBank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalBank_name_key" ON "ExternalBank"("name");

-- AlterTable
ALTER TABLE "Lead"
ADD COLUMN "externalBankIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
