-- Field operations: work orders, branch operating plans, daily report structure, branch brief

ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "fieldBrief" TEXT;

ALTER TABLE "DailyReport" ADD COLUMN IF NOT EXISTS "planNotes" TEXT;
ALTER TABLE "DailyReport" ADD COLUMN IF NOT EXISTS "closeoutNotes" TEXT;
ALTER TABLE "DailyReport" ADD COLUMN IF NOT EXISTS "blockers" TEXT;

CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "WorkOrderObjective" AS ENUM ('SCOUT', 'INDUCT', 'DEPLOY', 'REVISIT', 'GENERAL');

CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "objective" "WorkOrderObjective" NOT NULL DEFAULT 'GENERAL',
    "territoryCellId" TEXT,
    "leadId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BranchOperatingPlan" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "targetScouts" INTEGER NOT NULL DEFAULT 0,
    "targetInductions" INTEGER NOT NULL DEFAULT 0,
    "targetDeployments" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchOperatingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BranchOperatingPlan_branchId_weekStart_key" ON "BranchOperatingPlan"("branchId", "weekStart");
CREATE INDEX "WorkOrder_branchId_status_dueAt_idx" ON "WorkOrder"("branchId", "status", "dueAt");
CREATE INDEX "WorkOrder_assigneeId_status_idx" ON "WorkOrder"("assigneeId", "status");

ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_territoryCellId_fkey" FOREIGN KEY ("territoryCellId") REFERENCES "TerritoryCell"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BranchOperatingPlan" ADD CONSTRAINT "BranchOperatingPlan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchOperatingPlan" ADD CONSTRAINT "BranchOperatingPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
