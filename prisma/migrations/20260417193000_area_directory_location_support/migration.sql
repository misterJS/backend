ALTER TYPE "DirectoryEntrySource" ADD VALUE IF NOT EXISTS 'DEVICE_LOCATION';

DROP INDEX IF EXISTS "AreaDirectory_normalizedLabel_key";

CREATE INDEX IF NOT EXISTS "AreaDirectory_normalizedLabel_idx" ON "AreaDirectory"("normalizedLabel");
CREATE INDEX IF NOT EXISTS "AreaDirectory_normalizedLabel_level_idx"
ON "AreaDirectory"("normalizedLabel", "level");
CREATE INDEX IF NOT EXISTS "AreaDirectory_latitude_longitude_idx"
ON "AreaDirectory"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "SavedMeetPoint_latitude_longitude_idx"
ON "SavedMeetPoint"("latitude", "longitude");
