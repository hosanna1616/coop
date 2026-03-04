-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "branchCode" TEXT,
ADD COLUMN "externalId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Branch_branchCode_key" ON "Branch"("branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_externalId_key" ON "Branch"("externalId");
