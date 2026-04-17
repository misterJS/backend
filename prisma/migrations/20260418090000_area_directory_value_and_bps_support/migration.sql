ALTER TABLE "AreaDirectory"
ADD COLUMN "value" TEXT;

UPDATE "AreaDirectory"
SET "value" = "label"
WHERE "value" IS NULL;

ALTER TABLE "AreaDirectory"
ALTER COLUMN "value" SET NOT NULL;
