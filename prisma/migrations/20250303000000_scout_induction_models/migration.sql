-- Lead: add estimatedVolume, backfill from estimatedDailyVolume, drop old column
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "estimatedVolume" TEXT;
UPDATE "Lead" SET "estimatedVolume" = CASE
  WHEN "estimatedDailyVolume" IS NULL THEN 'MEDIUM'
  WHEN "estimatedDailyVolume" < 1000 THEN 'LOW'
  WHEN "estimatedDailyVolume" < 10000 THEN 'MEDIUM'
  ELSE 'HIGH'
END WHERE "estimatedVolume" IS NULL;
UPDATE "Lead" SET "estimatedVolume" = COALESCE("estimatedVolume", 'MEDIUM');
ALTER TABLE "Lead" ALTER COLUMN "estimatedVolume" SET NOT NULL;
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "estimatedDailyVolume";

-- Lead: rename scoutedByUserId -> scoutedById
ALTER TABLE "Lead" RENAME COLUMN "scoutedByUserId" TO "scoutedById";

-- Lead: status default NEW
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NEW';
UPDATE "Lead" SET "status" = 'NEW' WHERE "status" = 'PENDING';

-- Lead: add createdAt, updatedAt if missing
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Lead: ensure zoneId NOT NULL - create zone for any nulls (task-report leads)
DO $$
DECLARE
  r RECORD;
  new_zone_id TEXT;
BEGIN
  FOR r IN SELECT "id" FROM "Lead" WHERE "zoneId" IS NULL
  LOOP
    new_zone_id := gen_random_uuid()::text;
    INSERT INTO "Zone" ("id", "code", "coordinates", "status")
    VALUES (new_zone_id, 'TASK-' || r."id", '[]'::jsonb, 'UNSEEN');
    UPDATE "Lead" SET "zoneId" = new_zone_id WHERE "id" = r."id";
  END LOOP;
END $$;
ALTER TABLE "Lead" ALTER COLUMN "zoneId" SET NOT NULL;

-- Merchant: add new columns (nullable first for backfill)
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "ownerName" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "nationalIdNumber" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "tradeLicenseNumber" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "merchantAccountNumber" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "oathSignatureUrl" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "citizenNumber" TEXT;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "inductedById" TEXT;

-- Backfill Merchant from existing data
UPDATE "Merchant" m SET
  "ownerName" = COALESCE(m."ownerName", ''),
  "nationalIdNumber" = COALESCE(m."nationalIdNumber", ''),
  "tradeLicenseNumber" = COALESCE(m."tradeLicenseNumber", COALESCE(m."tradeLicense", '')),
  "merchantAccountNumber" = COALESCE(m."merchantAccountNumber", ''),
  "oathSignatureUrl" = COALESCE(m."oathSignatureUrl", ''),
  "citizenNumber" = COALESCE(m."citizenNumber", 'MN-' || m."id"),
  "inductedById" = COALESCE(m."inductedById", (SELECT l."scoutedById" FROM "Lead" l WHERE l."id" = m."leadId" LIMIT 1))
WHERE m."ownerName" IS NULL OR m."nationalIdNumber" IS NULL OR m."inductedById" IS NULL;

UPDATE "Merchant" SET "inductedById" = (SELECT "id" FROM "User" LIMIT 1) WHERE "inductedById" IS NULL;

ALTER TABLE "Merchant" ALTER COLUMN "ownerName" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "nationalIdNumber" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "tradeLicenseNumber" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "merchantAccountNumber" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "oathSignatureUrl" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "citizenNumber" SET NOT NULL;
ALTER TABLE "Merchant" ALTER COLUMN "inductedById" SET NOT NULL;

ALTER TABLE "Merchant" DROP COLUMN IF EXISTS "tradeLicense";

ALTER TABLE "Merchant" RENAME COLUMN "isQrActive" TO "isQrDeployed";
ALTER TABLE "Merchant" RENAME COLUMN "isPosActive" TO "isPosDeployed";

ALTER TABLE "Merchant" DROP COLUMN IF EXISTS "hasAccount";

ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
UPDATE "Merchant" SET "phoneNumber" = COALESCE("phoneNumber", '') WHERE "phoneNumber" IS NULL;
ALTER TABLE "Merchant" ALTER COLUMN "phoneNumber" SET NOT NULL;

ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Merchant" ALTER COLUMN "leadId" DROP NOT NULL;

ALTER TABLE "Merchant" DROP CONSTRAINT IF EXISTS "Merchant_leadId_fkey";
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_inductedById_fkey" FOREIGN KEY ("inductedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_scoutedByUserId_fkey";
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_scoutedById_fkey" FOREIGN KEY ("scoutedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
