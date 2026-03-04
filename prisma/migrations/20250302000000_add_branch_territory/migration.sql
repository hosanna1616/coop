-- AlterTable
ALTER TABLE "Branch" ADD COLUMN "territoryBounds" JSONB;

-- CreateTable
CREATE TABLE "TerritoryCell" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "coordinates" JSONB NOT NULL,
    "status" "ZoneStatus" NOT NULL DEFAULT 'UNSEEN',
    "label" TEXT,
    "row" INTEGER NOT NULL,
    "col" INTEGER NOT NULL,

    CONSTRAINT "TerritoryCell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryCell_branchId_code_key" ON "TerritoryCell"("branchId", "code");

-- AddForeignKey
ALTER TABLE "TerritoryCell" ADD CONSTRAINT "TerritoryCell_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
