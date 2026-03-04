-- CreateTable
CREATE TABLE "DeploymentAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "briefSteps" TEXT,
    "iconUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeploymentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentAsset_name_key" ON "DeploymentAsset"("name");
