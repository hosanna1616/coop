-- Idempotent fix: ensure Lead has scoutedById (rename from scoutedByUserId if still present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Lead' AND column_name = 'scoutedByUserId'
  ) THEN
    ALTER TABLE "Lead" RENAME COLUMN "scoutedByUserId" TO "scoutedById";
  END IF;
END $$;

-- Ensure FK constraint exists (drop old name if present, add new)
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_scoutedByUserId_fkey";
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_scoutedById_fkey";
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_scoutedById_fkey" FOREIGN KEY ("scoutedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
